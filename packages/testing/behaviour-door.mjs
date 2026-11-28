/**
 * behaviour-door.mjs — live-page debugging door for behaviour.mjs (D92).
 *
 * `--open` keeps one built stand-in page alive behind a token-scoped local HTTP
 * server; `--eval`, `--shot`, `--pass` and `--close` drive that open session
 * from another command line.
 */
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { launchBrowser, newStandInContext } from './browser.mjs'
import { behaviourPage } from './smoke/page.mjs'
import { serveStandIn } from './smoke/server.mjs'
import { host } from './specs/fixtures/behaviour.mjs'
import { ROOT } from '../../scripts/shared/spec-header.mjs'
import { sanitizePage } from '../../scripts/shared/privacy.mjs'

/** The shell's mark for the dark theme, which the skin's dark tokens hang off. */
const DARK_ATTR = host('shell.dark-theme')
/** How long one expression may take before the door answers that it has no answer. */
export const EVAL_TIMEOUT_MS = 15000
/** The longest deadline an expression may be given. */
export const EVAL_TIMEOUT_MAX = 600000
const EVAL_BODY_MAX = 1 << 20

/**
 * The door an open session's other command line talks to: `<address>/eval`
 * takes `{ code, timeoutMs }` and runs the code in the page this process holds;
 * `<address>/close` ends the session. The token in the address is the whole
 * access rule, so a local process that never saw it cannot find the door.
 */
async function openDoor(page, name, outDir, stopSession) {
  const token = randomUUID()
  const evalPath = `/${token}/eval`
  const closePath = `/${token}/close`
  const shotPath = `/${token}/shot`
  const passPath = `/${token}/pass`
  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname
    if (pathname !== evalPath && pathname !== closePath && pathname !== shotPath && pathname !== passPath) {
      reply(res, 404, { ok: false, error: { name: 'NotFound', message: `no route ${pathname}` } })
      return
    }
    if (req.method !== 'POST') {
      reply(res, 405, { ok: false, error: { name: 'MethodNotAllowed', message: `POST ${pathname}` } })
      return
    }
    if (pathname === shotPath) {
      const read = await readJsonBody(req, res)
      if (read === null) return
      const body = read.value
      if (body === null || typeof body !== 'object' || typeof body.dark !== 'boolean') {
        reply(res, 400, { ok: false, error: { name: 'BadRequest', message: 'the body holds no `dark` boolean' } })
        return
      }
      await answerRun(res, async () => {
        await page.evaluate(([attribute, enabled]) => { document.body.toggleAttribute(attribute, enabled) }, [DARK_ATTR, body.dark])
        // The sweep swaps names, paths and balances in the page before the frame is kept.
        await sanitizePage((code) => page.evaluate(code))
        const dir = path.join(outDir, 'shots')
        fs.mkdirSync(dir, { recursive: true })
        const file = path.join(dir, `${name}-${body.dark ? 'dark' : 'light'}-${new Date().toISOString().replace(/[:.]/g, '-')}.png`)
        await page.screenshot({ path: file })
        return { path: file }
      })
      return
    }
    if (pathname === passPath) {
      await answerRun(res, () => page.evaluate(() => {
        const pass = window.__dshClaudePass
        if (typeof pass !== 'function') throw new Error('the page exposes no pass entry; it was not booted as a stand-in page')
        pass()
      }))
      return
    }
    if (pathname === closePath) {
      // The answer goes out before the session closes, so the caller hears it.
      res.once('finish', () => setImmediate(stopSession))
      reply(res, 200, { ok: true })
      return
    }
    const read = await readJsonBody(req, res)
    if (read === null) return
    const body = read.value
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

/** Run one piece of page work for a door route and answer its outcome as JSON. */
async function answerRun(res, work) {
  try {
    const value = await work()
    reply(res, 200, { ok: true, value: value ?? null })
  } catch (error) {
    reply(res, 200, { ok: false, error: { name: error.name ?? 'Error', message: error.message, stack: error.stack } })
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
 * The request body as JSON: a body that is not JSON is answered here with a 400
 * and reported as null, so a route reads the value only when one arrived.
 */
async function readJsonBody(req, res) {
  try {
    return { value: JSON.parse(await readBody(req)) }
  } catch (error) {
    reply(res, 400, { ok: false, error: { name: 'BadRequest', message: error.message } })
    return null
  }
}

/**
 * Keep one stand-in page running for inspection. The page is the smoke's, the
 * bundle is the built one, and the preference patch goes through the entry a
 * test's t.prefs uses before the door opens. The session takes no verify lock,
 * the way the scratch host does, so it can sit beside a run; Ctrl+C or the
 * door's close route ends it.
 */
async function openStandIn(asked, { bad, outDir }) {
  const { CASES } = await import('./smoke/cases.mjs')
  if (!Object.hasOwn(CASES, asked.page)) bad(`no stand-in page named "${asked.page}"; the pages are: ${Object.keys(CASES).join(', ')}`)
  if (!fs.existsSync(path.join(ROOT, 'lib', 'client.js'))) bad('lib/client.js is missing; run npm run build')
  const server = await serveStandIn((name) => (name === asked.page ? behaviourPage(name) : undefined))
  const browser = await launchBrowser()
  let door = null
  let release
  const stopped = new Promise((resolve) => { release = resolve })
  const stopSession = () => release()
  try {
    const context = await newStandInContext(browser, { width: asked.band.width, height: asked.band.height, reducedMotion: 'no-preference' })
    const page = await context.newPage()
    // A bisecting run names the features to leave out before the bundle boots;
    // the entry reads the list once, and a page the reader opens never sets it.
    if (asked.off.length > 0) await page.addInitScript((names) => { window.__dshClaudeOff = names }, asked.off)
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
    door = await openDoor(page, asked.page, outDir, stopSession)
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
async function evaluate(asked, bad) {
  const code = asked.stdin ? await readStdin() : asked.code
  if (code.trim() === '') bad(asked.stdin ? '--stdin read an empty script' : '--eval takes an expression')
  const { status, body } = await callDoor(asked.at, 'eval', { code, timeoutMs: asked.timeout })
  if (asked.json) {
    process.stdout.write(`${JSON.stringify(body, null, 2)}\n`)
    return status === 200 && body.ok === true ? 0 : 1
  }
  if (status !== 200 || body.ok !== true) {
    reportDoorFailure(status, body)
    return 1
  }
  printValue(body.value, asked.raw)
  return 0
}

/** Print a door's failure: the request's status, then the error it named, with its stack when it carried one. */
function reportDoorFailure(status, body) {
  const error = body.error ?? {}
  const prefix = status === 200 ? '' : `request failed with status ${status}; `
  process.stderr.write(`behaviour: ${prefix}${error.name ?? 'Error'}: ${error.message ?? 'no message'}\n`)
  if (typeof error.stack === 'string') process.stderr.write(`${error.stack}\n`)
}

/** Keep one frame of the open page, in the theme asked for, with the privacy sweep already applied. */
async function shoot(asked) {
  const { status, body } = await callDoor(asked.at, 'shot', { dark: asked.dark })
  if (status !== 200 || body.ok !== true) {
    reportDoorFailure(status, body)
    return 1
  }
  console.log(`behaviour: wrote ${body.value.path}`)
  return 0
}

/** Ask the open page for one scheduler pass, the way a page change would. */
async function askForPass(asked) {
  const { status, body } = await callDoor(asked.at, 'pass', {})
  if (status !== 200 || body.ok !== true) {
    reportDoorFailure(status, body)
    return 1
  }
  console.log('behaviour: asked the page for one pass')
  return 0
}

/** End an open session from another command line. */
async function closeSession(asked) {
  const { status, body } = await callDoor(asked.at, 'close', {})
  if (status !== 200 || body.ok !== true) {
    reportDoorFailure(status, body)
    return 1
  }
  console.log(`behaviour: closed ${asked.at}`)
  return 0
}

/** The live-page debugging commands, each on its own address the lane does not hold. */
export async function runDebugMode(asked, options) {
  if (asked.mode === 'open') return openStandIn(asked, options)
  if (asked.mode === 'eval') return evaluate(asked, options.bad)
  if (asked.mode === 'close') return closeSession(asked)
  if (asked.mode === 'shot') return shoot(asked)
  if (asked.mode === 'pass') return askForPass(asked)
  return null
}
