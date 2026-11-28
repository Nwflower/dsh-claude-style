#!/usr/bin/env node
/**
 * behaviour.mjs — live-page debugging and focused spec listing for the stand-in
 * page (D92), driven from outside through Playwright on the BUILT plugin
 * (`lib/`); no running DSH instance is needed. A spec run goes through
 * stand-in.mjs, which owns the server, the browser and the verify lock.
 *
 * Spec failures keep a trace, screenshot and markup under `.debug/runs/behaviour/`;
 * quarantined specs only fail when they pass. `--open`, `--eval`, `--shot`,
 * `--pass` and `--close` inspect one live page.
 * Usage: `node packages/testing/behaviour.mjs --list [--feature <dir>] [--spec <id or file fragment>] [--band <name>]`
 * Exit: 0 listed or session ended; 1 unanswered; 2 could not start.
 */
import fs from 'node:fs'
import { availableParallelism } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { newStandInContext } from './browser.mjs'
import { EVAL_TIMEOUT_MAX, EVAL_TIMEOUT_MS, runDebugMode } from './behaviour-door.mjs'
import { readers, expectThat, surface, host } from './specs/fixtures/behaviour.mjs'
import { ROOT, specFiles, readHeader, testId } from '../../scripts/shared/spec-header.mjs'
import { runsPath } from '../../scripts/shared/debug-paths.mjs'
import { mapAtOnce } from './at-once.mjs'

const MATRIX = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'data', 'matrix.json'), 'utf8'))
const QUARANTINED = new Map(JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'data', 'quarantine.json'), 'utf8')).tests.map((entry) => [entry.id, entry]))
const OUT = runsPath(ROOT, 'behaviour')
/** Pages wait on the skin's passes and on frames, so they run beside each other up to half the cores. */
const DEFAULT_JOBS = Math.max(2, Math.min(8, Math.floor(availableParallelism() / 2)))

function bad(message) {
  console.error(`behaviour: ${message}`)
  process.exit(2)
}

/** The command line's shapes, for --help. */
function usage() {
  process.stdout.write([
    'usage: node packages/testing/behaviour.mjs --list [--feature <dir>[,<dir>…]] [--spec <id or file fragment>[,…]] [--band <name>]',
    '       node packages/testing/behaviour.mjs --open <page> [--prefs <json>] [--band <name>] [--off <feature>[,<feature>…]]',
    '       node packages/testing/behaviour.mjs --eval --at <address> "<expression>" [--raw | --json] [--timeout <ms>]',
    '       node packages/testing/behaviour.mjs --eval --at <address> --stdin [--raw | --json] [--timeout <ms>]',
    '       node packages/testing/behaviour.mjs --close --at <address>',
    '       node packages/testing/behaviour.mjs --shot --at <address> [--dark]',
    '       node packages/testing/behaviour.mjs --pass --at <address>',
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
const PLAIN_FLAGS = new Set(['list', 'help', 'eval', 'close', 'shot', 'dark', 'pass', 'stdin', 'raw', 'json'])
const VALUE_FLAGS = new Set(['feature', 'spec', 'band', 'jobs', 'open', 'prefs', 'at', 'timeout', 'off'])

/** The request on the command line: the run's selection, or one debug mode with its own flags. */
function request(args) {
  const named = { feature: [], spec: [], band: [] }
  const given = new Set()
  const positional = []
  let jobs = DEFAULT_JOBS
  let list = false
  let timeout = EVAL_TIMEOUT_MS
  let page = null
  let prefs = null
  let off = []
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
      case 'off':
        off = value.split(',').map((one) => one.trim()).filter(Boolean)
        break
      case 'at':
        at = addressOf(value)
        break
    }
  }
  if (given.has('help')) return { mode: 'help' }
  const modes = [page !== null, given.has('eval'), given.has('close'), given.has('shot'), given.has('pass')].filter(Boolean).length
  if (modes > 1) bad('--open, --eval, --shot, --pass and --close are modes of their own; give one of them')
  const mode = page !== null ? 'open' : given.has('eval') ? 'eval' : given.has('shot') ? 'shot' : given.has('pass') ? 'pass' : given.has('close') ? 'close' : 'run'
  const allowed = {
    run: new Set(['feature', 'spec', 'band', 'jobs', 'list']),
    open: new Set(['open', 'prefs', 'band', 'off']),
    eval: new Set(['eval', 'at', 'stdin', 'raw', 'json', 'timeout']),
    close: new Set(['close', 'at']),
    shot: new Set(['shot', 'at', 'dark']),
    pass: new Set(['pass', 'at']),
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
    return { mode, page, prefs, band, off }
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
  if (mode === 'shot') {
    if (at === null) bad('--shot needs --at <address>, the address --open printed')
    return { mode, at, dark: given.has('dark') }
  }
  if (mode === 'pass') {
    if (at === null) bad('--pass needs --at <address>, the address --open printed')
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
          items.push({ id: `${testId(header, one.name)}${suffix}`, file, frames: one.frames === true, header, page: declared.page, band: bands.get(band), density, body: one.body })
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
  const chosen = items.filter((item) => (asked.feature.length === 0 || item.header.features.some((feature) => asked.feature.includes(feature)))
    && (asked.spec.length === 0 || asked.spec.some((term) => selectsSpec(item, term)))
    && (asked.band.length === 0 || asked.band.includes(item.band.name)))
  return { items: chosen, all: items.map((item) => item.id) }
}

/**
 * Whether a `--spec` term names this test: the id or the file it lives in, as
 * a substring, so a fragment of either finds it without `--list` first.
 */
function selectsSpec(item, term) {
  const wanted = term.toLowerCase()
  return item.id.toLowerCase().includes(wanted) || item.file.toLowerCase().includes(wanted)
}

/** A directory name for one test's evidence. */
const slug = (id) => id.replace(/[^\w@.-]+/g, '-').replace(/-+/g, '-').slice(0, 120)

/** Run one test in a context of its own, and answer its result. */
async function runOne(browser, base, item, runDir) {
  const context = await newStandInContext(browser, { width: item.band.width, height: item.band.height, reducedMotion: 'no-preference' }, { deviceScaleFactor: item.density })
  await context.tracing.start({ screenshots: true, snapshots: true })
  const page = await context.newPage()
  const consoleLines = []
  page.on('console', (message) => consoleLines.push(`${message.type()}: ${message.text()}`))
  page.on('pageerror', (error) => consoleLines.push(`pageerror: ${error.message}`))
  const started = Date.now()
  try {
    await page.goto(`${base}/${item.page}?probe=prelude`, { waitUntil: 'domcontentloaded' })
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

/**
 * Judge the selected tests on the browser and stand-in server the lane opened,
 * and answer the report the lane files. A test judged against the clock can lose
 * to a machine busy with the other pages, so it is re-judged alone and only a
 * failure alone is a failure.
 */
async function runBehaviourTests(items, jobs, browser, base) {
  const runDir = path.join(OUT, new Date().toISOString().replace(/[:.]/g, '-'))
  console.log(`behaviour: ${items.length} tests, ${jobs} at a time`)
  let results = await mapAtOnce(items, jobs, (item) => runOne(browser, base, item, runDir))
  const timed = results
    .filter((result) => !result.ok)
    .map((result) => items.find((item) => item.id === result.id))
    .filter((item) => item !== undefined && item.frames === true)
  if (timed.length > 0) {
    console.log(`behaviour: ${timed.length} frame-sensitive ${timed.length === 1 ? 'test' : 'tests'} failed beside other pages; re-judging ${timed.length === 1 ? 'it' : 'each'} alone`)
    const alone = await mapAtOnce(timed, 1, (item) => runOne(browser, base, item, runDir))
    for (const retry of alone) {
      const at = results.findIndex((result) => result.id === retry.id)
      if (at !== -1) results[at] = { ...retry, rerun: true }
    }
  }
  for (const result of results) {
    const quarantined = QUARANTINED.has(result.id)
    result.quarantined = quarantined
    // A quarantined test that passes has outlived its entry: that is what fails.
    result.blocking = quarantined ? result.ok : !result.ok
    const word = result.ok ? (quarantined ? 'PASS' : 'ok  ') : 'FAIL'
    console.log(`  ${word} ${result.id} (${(result.ms / 1000).toFixed(1)} s)${quarantined ? ' — quarantined' : ''}${result.rerun === true ? ' — re-judged alone' : ''}`)
    if (quarantined && result.ok) console.log('       passes now: take it out of packages/testing/data/quarantine.json')
    if (quarantined && !result.ok) console.log(`       ${QUARANTINED.get(result.id).defect}`)
    if (!result.ok) console.log(`       ${result.error.split('\n').join('\n       ')}\n       evidence: ${result.evidence} (npx playwright show-trace ${result.evidence}/trace.zip)`)
  }
  const blocking = results.filter((result) => result.blocking).length
  const held = results.filter((result) => result.quarantined && !result.ok).length
  const quarantine = held === 0 ? '' : `; ${held} quarantined ${held === 1 ? 'failure' : 'failures'} printed above`
  console.log(blocking === 0
    ? `\nbehaviour: ${results.length - held} of ${results.length} tests passed${quarantine}`
    : `\nbehaviour: ${blocking} of ${results.length} tests block the run${quarantine}`)
  return { results, blocking }
}

/**
 * The behaviour half of a stand-in request: the tests its selection names, on the
 * browser and server the lane opened. A selection a strict request names but no
 * spec answers ends the request; a feature directory no spec covers has nothing
 * to judge and prints so.
 */
async function serveBehaviour(request, browser, base) {
  const { items } = await plan({ ...request, list: false })
  if (!fs.existsSync(path.join(ROOT, 'lib', 'client.js'))) bad('lib/client.js is missing; run npm run build')
  if (items.length === 0) {
    if (request.spec.length > 0 || request.feature.length === 0) bad('the selection holds no behaviour test')
    console.log(`behaviour: no behaviour spec covers ${request.feature.join(', ')}`)
    return { results: [], blocking: 0 }
  }
  const { results, blocking } = await runBehaviourTests(items, request.jobs, browser, base)
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'report.json'), `${JSON.stringify({ at: new Date().toISOString(), results }, null, 2)}\n`)
  return { results, blocking }
}

/** Print the ids a request selects, so the next stand-in run needs no guess. */
async function listBehaviour(asked) {
  const { items } = await plan(asked)
  for (const item of items) console.log(item.id)
  return 0
}

/**
 * This file's command line is the live-page debugger; a spec run goes through
 * stand-in.mjs, which owns the server, the browser and the lock (D92).
 */
export async function runBehaviour(args = process.argv.slice(2)) {
  const asked = request(args)
  if (asked.mode === 'help') {
    usage()
    return 0
  }
  const debug = await runDebugMode(asked, { bad, outDir: OUT })
  if (debug !== null) return debug
  if (asked.list) return listBehaviour(asked)
  console.error('behaviour: a spec run goes through node packages/testing/stand-in.mjs; --open, --eval, --shot, --pass and --close are this command\'s own')
  return 2
}

export { serveBehaviour, listBehaviour }

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runBehaviour().then((code) => process.exit(code ?? 0), (error) => {
    console.error(error)
    process.exit(1)
  })
}
