/**
 * chrome.cjs — the headless Chrome/Edge that smoke, probe, probe-timing and
 * shoot drive over the DevTools protocol.
 *
 * Every run gets a throwaway profile under `.debug/` and lets the browser pick
 * its own DevTools port (`--remote-debugging-port=0`), read back from the
 * profile's DevToolsActivePort file, so runs side by side never contend for
 * one fixed port. CHROME_PATH overrides the browser lookup.
 */
'use strict'
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

/** The throwaway profiles go under the repository's own scratch directory. */
const PROFILES = path.resolve(__dirname, '..', '..', '.debug')

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** The browser to drive: CHROME_PATH, else the first installed Chrome/Edge; undefined when there is none. */
function findChrome() {
  return CANDIDATES.filter(Boolean).find((candidate) => fs.existsSync(candidate))
}

/** The DevTools port the browser picked, read back from its profile. */
async function devtoolsPort(profile) {
  const file = path.join(profile, 'DevToolsActivePort')
  for (let i = 0; i < 150; i++) {
    if (fs.existsSync(file)) {
      const port = Number(fs.readFileSync(file, 'utf8').split('\n')[0])
      if (port > 0) return port
    }
    await sleep(100)
  }
  throw new Error('the browser never opened its DevTools port')
}

/**
 * Start `browser` headless on a fresh profile under `.debug/`.
 *
 * @param browser - the executable (findChrome()).
 * @param options - `{ name, width, height }`; `name` labels the profile directory.
 * @returns `{ port, close }`: the DevTools port, and `close()`, which stops the
 *   browser and removes its profile. An abrupt exit (Ctrl+C, an uncaught
 *   error) still stops the browser; its profile then stays in `.debug/`.
 */
async function launchChrome(browser, options) {
  fs.mkdirSync(PROFILES, { recursive: true })
  const profile = fs.mkdtempSync(path.join(PROFILES, `chrome-${options.name}-`))
  const proc = spawn(browser, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    `--window-size=${options.width},${options.height}`,
    'about:blank',
  ], { stdio: 'ignore' })
  const exited = new Promise((resolve) => proc.once('exit', resolve))
  const killOnExit = () => proc.kill()
  const interrupt = () => process.exit(130)
  process.on('exit', killOnExit)
  process.once('SIGINT', interrupt)
  let closed = false
  async function close() {
    if (closed) return
    closed = true
    process.removeListener('exit', killOnExit)
    process.removeListener('SIGINT', interrupt)
    proc.kill()
    await exited
    // The browser's helper processes can hold profile files a moment longer.
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })
  }
  try {
    return { port: await devtoolsPort(profile), close }
  } catch (error) {
    await close()
    throw error
  }
}

/**
 * Open a tab and talk to it over the DevTools protocol.
 *
 * @param port - the browser's DevTools port (launchChrome()).
 * @returns `{ send, evalJs, close }`: `send(method, params)` resolves with the
 *   protocol reply; `evalJs(expression)` resolves with the expression's value
 *   and throws when the page threw; `close()` closes the tab.
 */
async function connectTab(port) {
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let seq = 0
  const pending = new Map()
  ws.onmessage = (message) => {
    const data = JSON.parse(message.data)
    if (data.id && pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id) }
  }
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = ++seq
    pending.set(id, resolve)
    ws.send(JSON.stringify({ id, method, params }))
  })
  const evalJs = async (expression) => {
    const reply = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (reply.result && reply.result.exceptionDetails) {
      const detail = JSON.stringify(reply.result.exceptionDetails).slice(0, 300)
      throw new Error(`page eval failed: ${detail}\n  expression: ${expression.replace(/\s+/g, ' ').slice(0, 160)}`)
    }
    return reply.result && reply.result.result ? reply.result.result.value : undefined
  }
  const close = async () => {
    ws.close()
    const response = await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`)
    if (!response.ok) throw new Error(`closing the tab failed: HTTP ${response.status}`)
  }
  return { send, evalJs, close }
}

module.exports = { findChrome, launchChrome, connectTab }
