#!/usr/bin/env node
/**
 * Drive the built plugin in the stand-in host with Playwright (D87). Failures keep
 * a trace, screenshot and markup under `.debug/behaviour/`; quarantined specs
 * only fail when they pass. `--open`, `--eval` and `--close` inspect one live page.
 * Usage: `node packages/testing/behaviour.mjs [--feature <dir>] [--spec <id>] [--band <name>] [--jobs <n>] [--list]`
 * Exit: 0 passed or session ended; 1 failed or unanswered; 2 could not start.
 */
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import { availableParallelism } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { launchBrowser, newContextOn } from './browser.mjs'
import { page as standInPage, PRELUDE } from './smoke/page.mjs'
import { serveStandIn } from './smoke/server.mjs'
import { readers, expectThat, surface, host } from './specs/fixtures/behaviour.mjs'
import { ROOT, specFiles, readHeader, testId } from '../../scripts/shared/spec-header.mjs'
import { withLock } from '../../scripts/shared/verify-lock.mjs'
import { mapAtOnce } from './at-once.mjs'

const MATRIX = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'data', 'matrix.json'), 'utf8'))
const QUARANTINED = new Map(JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'data', 'quarantine.json'), 'utf8')).tests.map((entry) => [entry.id, entry]))
const OUT = path.join(ROOT, '.debug', 'behaviour')
/** Pages wait on the skin's passes and on frames, so they run beside each other up to half the cores. */
const DEFAULT_JOBS = Math.max(2, Math.min(8, Math.floor(availableParallelism() / 2)))
/** How long one expression may take before the door answers that it has no answer. */
const EVAL_TIMEOUT_MS = 15000
/** The longest deadline an expression may be given, and the largest request body the door reads. */
const EVAL_TIMEOUT_MAX = 600000
const EVAL_BODY_MAX = 1 << 20

function bad(message) {
  console.error(`behaviour: ${message}`)
  process.exit(2)
}

/** The command line's shapes, for --help. */
function usage() {
  process.stdout.write([
    'usage: node packages/testing/behaviour.mjs [--feature <dir>[,<dir>…]] [--spec <id prefix>[,…]] [--band <name>] [--jobs <n>] [--list]',
    '       node packages/testing/behaviour.mjs --open <page> [--prefs <json>] [--band <name>]',
    '       node packages/testing/behaviour.mjs --eval --at <address> "<expression>" [--raw | --json] [--timeout <ms>]',
    '       node packages/testing/behaviour.mjs --eval --at <address> --stdin [--raw | --json] [--timeout <ms>]',
    '       node packages/testing/behaviour.mjs --close --at <address>',
    '',
    'The run flags name what to judge. --open keeps one stand-in page running and',
    'prints the address --eval asks for an expression and --close ends.',
  ].join('\n') + '\n')
}

/** A preference patch from the command line: the object a test hands to window.__pushForm. */
function prefsOf(value) {
  let patch
  try {
    patch = JSON.parse(value)
  } catch (error) {
    bad(`--prefs takes a JSON object, which this is not: ${error.message}`)
  }
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) bad('--prefs takes a JSON object of preference values, not a list or a single value')
  return patch
}

/** The address a debug mode calls: the one --open printed, on this machine. */
function addressOf(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    bad(`--at takes the address --open printed, not "${value}"`)
  }
  const local = url.protocol === 'http:' && (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
  if (!local || url.port === '' || url.pathname === '/') {
    bad(`--at takes the whole address --open printed, like http://127.0.0.1:<port>/<token>, not "${value}"`)
  }
  return value.replace(/\/+$/, '')
}

/** The flags that take no value, and the ones that do. */
const PLAIN_FLAGS = new Set(['list', 'help', 'eval', 'close', 'stdin', 'raw', 'json'])
const VALUE_FLAGS = new Set(['feature', 'spec', 'band', 'jobs', 'open', 'prefs', 'at', 'timeout'])

/** The request on the command line: the run's selection, or one debug mode with its own flags. */
function request() {
  const args = process.argv.slice(2)
  const named = { feature: [], spec: [], band: [] }
  const given = new Set()
  const positional = []
  let jobs = DEFAULT_JOBS
  let list = false
  let timeout = EVAL_TIMEOUT_MS
  let page = null
  let prefs = null
  let at = null
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (!arg.startsWith('--')) {
      positional.push(arg)
      continue
    }
    const equals = arg.indexOf('=')
    const flag = equals === -1 ? arg.slice(2) : arg.slice(2, equals)
    if (PLAIN_FLAGS.has(flag)) {
      if (equals !== -1) bad(`--${flag} takes no value`)
      given.add(flag)
      if (flag === 'list') list = true
      continue
    }
    if (!VALUE_FLAGS.has(flag)) bad(`unknown argument "${arg}"`)
    let value
    if (equals === -1) {
      index += 1
      value = args[index]
    } else {
      value = arg.slice(equals + 1)
    }
    if (value === undefined || value.trim() === '') bad(`--${flag} needs a value`)
    given.add(flag)
    switch (flag) {
      case 'feature':
      case 'spec':
      case 'band':
        named[flag].push(...value.split(',').map((one) => one.trim()).filter(Boolean))
        break
      case 'jobs':
        if (!/^\d+$/.test(value) || Number(value) < 1) bad(`--jobs takes how many pages to drive at once, not "${value}"`)
        jobs = Number(value)
        break
      case 'timeout':
        if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > EVAL_TIMEOUT_MAX) {
          bad(`--timeout takes milliseconds from 1 through ${EVAL_TIMEOUT_MAX}, not "${value}"`)
        }
        timeout = Number(value)
        break
      case 'open':
        page = value
        break
      case 'prefs':
        prefs = prefsOf(value)
        break
      case 'at':
        at = addressOf(value)
        break
    }
  }
  if (given.has('help')) return { mode: 'help' }
  const modes = [page !== null, given.has('eval'), given.has('close')].filter(Boolean).length
  if (modes > 1) bad('--open, --eval and --close are modes of their own; give one of them')
  const mode = page !== null ? 'open' : given.has('eval') ? 'eval' : given.has('close') ? 'close' : 'run'
  const allowed = {
    run: new Set(['feature', 'spec', 'band', 'jobs', 'list']),
    open: new Set(['open', 'prefs', 'band']),
    eval: new Set(['eval', 'at', 'stdin', 'raw', 'json', 'timeout']),
    close: new Set(['close', 'at']),
  }[mode]
  for (const flag of given) {
    if (!allowed.has(flag)) bad(`--${flag} does not go with ${mode === 'run' ? 'a behaviour run' : `--${mode}`}`)
  }
  if (positional.length > 0 && mode !== 'eval') bad(`unexpected argument "${positional[0]}"`)
  if (mode === 'open') {
    const names = MATRIX.bands.map((band) => band.name)
    if (named.band.length > 1) bad(`--open takes one viewport band, not ${named.band.join(', ')}`)
    const band = MATRIX.bands.find((one) => one.name === (named.band[0] ?? 'wide'))
    if (band === undefined) bad(`no viewport band named "${named.band[0]}"; the bands are: ${names.join(', ')}`)
    return { mode, page, prefs, band }
  }
  if (mode === 'eval') {
    if (at === null) bad('--eval needs --at <address>, the address --open printed')
    if (given.has('stdin') && positional.length > 0) bad('--stdin reads the expression from standard input; give no expression beside it')
    const code = given.has('stdin') ? null : positional.join(' ')
    if (code !== null && code.trim() === '') bad('--eval needs an expression, on the command line or through --stdin')
    return { mode, at, code, stdin: given.has('stdin'), raw: given.has('raw'), json: given.has('json'), timeout }
  }
  if (mode === 'close') {
    if (at === null) bad('--close needs --at <address>, the address --open printed')
    return { mode, at }
  }
  return { mode, feature: named.feature, spec: named.spec, band: named.band, jobs, list }
}

/** Every test of every behaviour spec, fanned out over the bands its spec declares. */
async function plan(asked) {
  const bands = new Map(MATRIX.bands.map((band) => [band.name, band]))
  const densities = new Set(MATRIX.densities)
  const items = []
  for (const file of specFiles().filter((one) => one.startsWith('packages/testing/specs/behaviour/'))) {
    const header = readHeader(file)
    const declared = (await import(pathToFileURL(path.join(ROOT, file)).href)).default
    for (const band of declared.bands) {
      if (!bands.has(band)) bad(`${file} names the band "${band}", which packages/testing/data/matrix.json does not hold`)
    }
    for (const density of declared.densities) {
      if (!densities.has(density)) bad(`${file} names the density "${density}x", which packages/testing/data/matrix.json does not hold`)
    }
    for (const band of declared.bands) {
      for (const density of declared.densities) {
        for (const one of declared.tests) {
          const suffix = (declared.bands.length > 1 ? `@${band}` : '') + (declared.densities.length > 1 ? `@${density}x` : '')
          items.push({ id: `${testId(header, one.name)}${suffix}`, header, page: declared.page, band: bands.get(band), density, body: one.body })
        }
      }
    }
  }
  const ids = new Set()
  for (const item of items) {
    if (ids.has(item.id)) bad(`two tests answer to the id "${item.id}"`)
    ids.add(item.id)
  }
  // A quarantined id that no test answers to would hold nothing: the defect it
  // names is either fixed or the test moved (a new band adds a suffix), and
  // either way the entry has to leave the record by hand.
  for (const id of QUARANTINED.keys()) {
    if (!ids.has(id)) bad(`packages/testing/data/quarantine.json holds "${id}", which no test answers to`)
  }
  return items.filter((item) => (asked.feature.length === 0 || item.header.features.some((feature) => asked.feature.includes(feature)))
    && (asked.spec.length === 0 || asked.spec.some((prefix) => item.id.startsWith(prefix)))
    && (asked.band.length === 0 || asked.band.includes(item.band.name)))
}

/** A directory name for one test's evidence. */
const slug = (id) => id.replace(/[^\w@.-]+/g, '-').replace(/-+/g, '-').slice(0, 120)

/** Run one test in a context of its own, and answer its result. */
async function runOne(browser, base, item, runDir) {
  const context = await newContextOn(browser, { width: item.band.width, height: item.band.height, reducedMotion: 'no-preference' }, { deviceScaleFactor: item.density })
  await context.tracing.start({ screenshots: true, snapshots: true })
  const page = await context.newPage()
  const consoleLines = []
  page.on('console', (message) => consoleLines.push(`${message.type()}: ${message.text()}`))
  page.on('pageerror', (error) => consoleLines.push(`pageerror: ${error.message}`))
  const started = Date.now()
  try {
    await page.goto(`${base}/${item.page}`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.__smoke !== undefined, undefined, { timeout: 10000 })
    const report = await page.evaluate(() => window.__smoke)
    if (report.applyError !== null) throw new Error(`the skin did not apply: ${report.applyError}`)
    const settle = (quietMs) => page.evaluate((ms) => window.__dshSmokeProbe.settle(ms), quietMs)
    await settle()
    await item.body({
      page,
      read: readers(page),
      expectThat,
      surface,
      host,
      settle,
      /** Change preferences the way the settings page does, and let the page settle. */
      prefs: async (patch) => {
        await page.evaluate((value) => window.__pushForm(value), patch)
        await settle()
      },
    })
    await context.tracing.stop()
    return { id: item.id, ok: true, ms: Date.now() - started }
  } catch (error) {
    const dir = path.join(runDir, slug(item.id))
    fs.mkdirSync(dir, { recursive: true })
    await context.tracing.stop({ path: path.join(dir, 'trace.zip') })
    await page.screenshot({ path: path.join(dir, 'failure.png') }).catch(() => {})
    fs.writeFileSync(path.join(dir, 'dom.html'), await page.content().catch(() => ''))
    fs.writeFileSync(path.join(dir, 'console.txt'), consoleLines.join('\n'))
    fs.writeFileSync(path.join(dir, 'evidence.json'), `${JSON.stringify({ id: item.id, band: item.band, density: item.density, message: error.message, evidence: error.evidence ?? null }, null, 2)}\n`)
    return { id: item.id, ok: false, ms: Date.now() - started, error: error.message, evidence: path.relative(ROOT, dir).replace(/\\/g, '/') }
  } finally {
    await context.close()
  }
}

/** Answer one door request as JSON; a value with no JSON form is reported by name rather than left as a dead connection. */
function reply(res, status, body) {
  let text
  try {
    text = `${JSON.stringify(body)}\n`
  } catch (error) {
    status = 200
    text = `${JSON.stringify({ ok: false, error: { name: 'Unserializable', message: `the page's value cannot be read as JSON: ${error.message}` } })}\n`
  }
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(text)
}

/** The whole request body, up to the door's limit. */
async function readBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > EVAL_BODY_MAX) throw new Error(`the request body is over ${EVAL_BODY_MAX} bytes`)
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/**
 * The door an open session's other command line talks to: `<address>/eval`
 * takes `{ code, timeoutMs }` and runs the code in the page this process holds;
 * `<address>/close` ends the session. The token in the address is the whole
 * access rule, so a local process that never saw it cannot find the door.
 */
async function openDoor(page, stopSession) {
  const token = randomUUID()
  const evalPath = `/${token}/eval`
  const closePath = `/${token}/close`
  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname
    if (pathname !== evalPath && pathname !== closePath) {
      reply(res, 404, { ok: false, error: { name: 'NotFound', message: `no route ${pathname}` } })
      return
    }
    if (req.method !== 'POST') {
      reply(res, 405, { ok: false, error: { name: 'MethodNotAllowed', message: `POST ${pathname}` } })
      return
    }
    if (pathname === closePath) {
      // The answer goes out before the session closes, so the caller hears it.
      res.once('finish', () => setImmediate(stopSession))
      reply(res, 200, { ok: true })
      return
    }
    let body
    try {
      body = JSON.parse(await readBody(req))
    } catch (error) {
      reply(res, 400, { ok: false, error: { name: 'BadRequest', message: error.message } })
      return
    }
    if (body === null || typeof body !== 'object' || typeof body.code !== 'string' || body.code.trim() === '') {
      reply(res, 400, { ok: false, error: { name: 'BadRequest', message: 'the body holds no "code" string' } })
      return
    }
    const timeoutMs = body.timeoutMs ?? EVAL_TIMEOUT_MS
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > EVAL_TIMEOUT_MAX) {
      reply(res, 400, { ok: false, error: { name: 'BadRequest', message: `timeoutMs is not an integer from 1 through ${EVAL_TIMEOUT_MAX}` } })
      return
    }
    let timer
    try {
      const value = await Promise.race([
        page.evaluate(body.code),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(`the page gave no answer within ${timeoutMs} ms`)), timeoutMs)
        }),
      ])
      reply(res, 200, { ok: true, value })
    } catch (error) {
      reply(res, 200, { ok: false, error: { name: error.name ?? 'Error', message: error.message, stack: error.stack } })
    } finally {
      clearTimeout(timer)
    }
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })
  const port = server.address().port
  return {
    address: `http://127.0.0.1:${port}/${token}`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    }),
  }
}

/**
 * Keep one stand-in page running for inspection. The page is the smoke's, the
 * bundle is the built one, and the preference patch goes through the entry a
 * test's t.prefs uses before the door opens. The session takes no verify lock,
 * the way the scratch host does, so it can sit beside a run; Ctrl+C or the
 * door's close route ends it.
 */
async function openStandIn(asked) {
  const { CASES } = await import('./smoke/cases.mjs')
  if (!Object.hasOwn(CASES, asked.page)) bad(`no stand-in page named "${asked.page}"; the pages are: ${Object.keys(CASES).join(', ')}`)
  if (!fs.existsSync(path.join(ROOT, 'lib', 'client.js'))) bad('lib/client.js is missing; run npm run build')
  const server = await serveStandIn((name) => (name === asked.page ? standInPage(name, 'full', [name], PRELUDE) : undefined))
  const browser = await launchBrowser()
  let door = null
  let release
  const stopped = new Promise((resolve) => { release = resolve })
  const stopSession = () => release()
  try {
    const context = await newContextOn(browser, { width: asked.band.width, height: asked.band.height, reducedMotion: 'no-preference' })
    const page = await context.newPage()
    page.on('console', (message) => console.log(`page: ${message.type()}: ${message.text()}`))
    page.on('pageerror', (error) => console.log(`page: pageerror: ${error.message}`))
    await page.goto(`${server.base}/${asked.page}`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.__smoke !== undefined, undefined, { timeout: 10000 })
    const report = await page.evaluate(() => window.__smoke)
    if (report.applyError !== null) throw new Error(`the skin did not apply: ${report.applyError}`)
    const settle = () => page.evaluate(() => window.__dshSmokeProbe.settle())
    await settle()
    if (asked.prefs !== null) {
      await page.evaluate((patch) => window.__pushForm(patch), asked.prefs)
      await settle()
    }
    const skin = await page.evaluate(() => document.body.getAttribute('data-dsh-claude-style'))
    door = await openDoor(page, stopSession)
    process.once('SIGINT', stopSession)
    process.once('SIGTERM', stopSession)
    console.log(`behaviour: ${asked.page} open at ${door.address} (page ${server.base}/${asked.page}, skin ${skin})`)
    if (asked.prefs !== null) console.log(`behaviour: prefs ${JSON.stringify(asked.prefs)}`)
    console.log(`behaviour: evaluate: node packages/testing/behaviour.mjs --eval --at ${door.address} "document.body.getAttribute('data-dsh-claude-style')"`)
    console.log(`behaviour: end with Ctrl+C or node packages/testing/behaviour.mjs --close --at ${door.address}`)
    await stopped
    console.log(`behaviour: closed ${door.address}`)
    return 0
  } finally {
    process.off('SIGINT', stopSession)
    process.off('SIGTERM', stopSession)
    // Every close runs even when one fails: a browser left behind outlives the
    // command that started it, and the session's own server is the page's only
    // source of lazy chunks.
    try {
      if (door !== null) await door.close()
    } finally {
      try {
        await browser.close()
      } finally {
        await server.close()
      }
    }
  }
}

/** Standard input as text, for --stdin. */
async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

/** One call to a session's door, answered as JSON; a door that does not answer is a named failure. */
async function callDoor(address, action, payload) {
  let response
  try {
    response = await fetch(`${address}/${action}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    throw new Error(`nothing answered at ${address} (${error.cause?.code ?? error.message}); is the --open session still running?`)
  }
  const text = await response.text()
  let body
  try {
    body = text === '' ? null : JSON.parse(text)
  } catch (error) {
    throw new Error(`${address} answered with no JSON: ${error.message}`)
  }
  if (body === null) throw new Error(`${address} answered ${response.status} with an empty body`)
  return { status: response.status, body }
}

/** One value the way the bridge prints one: JSON, or a string as it lies under --raw. */
function printValue(value, raw) {
  if (raw && typeof value === 'string') {
    process.stdout.write(`${value}\n`)
    return
  }
  process.stdout.write(`${value === undefined ? 'undefined' : JSON.stringify(value, null, 2)}\n`)
}

/** Ask an open session for one expression, or a script on standard input. */
async function evaluate(asked) {
  const code = asked.stdin ? await readStdin() : asked.code
  if (code.trim() === '') bad(asked.stdin ? '--stdin read an empty script' : '--eval takes an expression')
  const { status, body } = await callDoor(asked.at, 'eval', { code, timeoutMs: asked.timeout })
  if (asked.json) {
    process.stdout.write(`${JSON.stringify(body, null, 2)}\n`)
    return status === 200 && body.ok === true ? 0 : 1
  }
  if (status !== 200 || body.ok !== true) {
    const error = body.error ?? {}
    const prefix = status === 200 ? '' : `request failed with status ${status}; `
    process.stderr.write(`behaviour: ${prefix}${error.name ?? 'Error'}: ${error.message ?? 'no message'}\n`)
    if (typeof error.stack === 'string') process.stderr.write(`${error.stack}\n`)
    return 1
  }
  printValue(body.value, asked.raw)
  return 0
}

/** End an open session from another command line. */
async function closeSession(asked) {
  const { status, body } = await callDoor(asked.at, 'close', {})
  if (status !== 200 || body.ok !== true) {
    const error = body.error ?? {}
    process.stderr.write(`behaviour: request failed with status ${status}; ${error.name ?? 'Error'}: ${error.message ?? 'no message'}\n`)
    return 1
  }
  console.log(`behaviour: closed ${asked.at}`)
  return 0
}

/** Run the lane, keep a page open, or ask one: the mode the command line named. */
async function start() {
  const asked = request()
  if (asked.mode === 'help') {
    usage()
    return 0
  }
  if (asked.mode === 'open') return openStandIn(asked)
  if (asked.mode === 'eval') return evaluate(asked)
  if (asked.mode === 'close') return closeSession(asked)
  return withLock('behaviour', 'behaviour', () => run(asked))
}

async function run(asked) {
  const items = await plan(asked)
  if (asked.list) {
    for (const item of items) console.log(item.id)
    return 0
  }
  if (items.length === 0) {
    // A feature directory no behaviour spec covers has nothing here to judge; a
    // spec id that matches nothing is a misspelling, and must not pass as a run.
    if (asked.spec.length > 0 || asked.feature.length === 0) bad('the selection holds no behaviour test')
    console.log(`behaviour: no behaviour spec covers ${asked.feature.join(', ')}`)
    return 0
  }
  if (!fs.existsSync(path.join(ROOT, 'lib', 'client.js'))) bad('lib/client.js is missing; run npm run build')
  const runDir = path.join(OUT, new Date().toISOString().replace(/[:.]/g, '-'))
  const server = await serveStandIn((name) => (items.some((item) => item.page === name) ? standInPage(name, 'full', [name], PRELUDE) : undefined))
  const browser = await launchBrowser()
  let results
  try {
    console.log(`behaviour: ${items.length} tests, ${asked.jobs} at a time`)
    results = await mapAtOnce(items, asked.jobs, (item) => runOne(browser, server.base, item, runDir))
  } finally {
    await browser.close()
    await server.close()
  }
  for (const result of results) {
    const quarantined = QUARANTINED.has(result.id)
    result.quarantined = quarantined
    // A quarantined test that passes has outlived its entry: that is what fails.
    result.blocking = quarantined ? result.ok : !result.ok
    const word = result.ok ? (quarantined ? 'PASS' : 'ok  ') : 'FAIL'
    console.log(`  ${word} ${result.id} (${(result.ms / 1000).toFixed(1)} s)${quarantined ? ' — quarantined' : ''}`)
    if (quarantined && result.ok) console.log('       passes now: take it out of packages/testing/data/quarantine.json')
    if (quarantined && !result.ok) console.log(`       ${QUARANTINED.get(result.id).defect}`)
    if (!result.ok) console.log(`       ${result.error.split('\n').join('\n       ')}\n       evidence: ${result.evidence} (npx playwright show-trace ${result.evidence}/trace.zip)`)
  }
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'report.json'), `${JSON.stringify({ at: new Date().toISOString(), results }, null, 2)}\n`)
  const blocking = results.filter((result) => result.blocking).length
  const held = results.filter((result) => result.quarantined && !result.ok).length
  const quarantine = held === 0 ? '' : `; ${held} quarantined ${held === 1 ? 'failure' : 'failures'} printed above`
  console.log(blocking === 0
    ? `\nbehaviour: ${results.length - held} of ${results.length} tests passed${quarantine}`
    : `\nbehaviour: ${blocking} of ${results.length} tests block the run${quarantine}`)
  return blocking === 0 ? 0 : 1
}

start().then((code) => process.exit(code ?? 0), (error) => {
  console.error(error)
  process.exit(1)
})
