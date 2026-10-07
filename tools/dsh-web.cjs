#!/usr/bin/env node
/**
 * dsh-web.cjs — a scratch DSH web instance with this checkout's plugin installed,
 * and a browser page on it (D45).
 *
 * The end-to-end lane needs a real host: the smoke's stand-in page reproduces
 * the structure its author knows, while the timing and ordering the skin leans
 * on only exist in the assembled client. This tool owns that host:
 *
 *   start()   a scratch `$DSH_HOME` under .debug/, the plugin linked into its
 *             web profile once, `dsh --profile web --port 0 --no-open` booted,
 *             and the URL it prints — which carries the launch token — handed
 *             back. The token must be exchanged by a browser: a bare fetch of
 *             the URL without a cookie is answered 401.
 *   openPage() a headless Chrome from scripts/chrome.cjs on that URL.
 *
 * Run it directly to keep an instance up for manual work: it prints the URL and
 * stays until interrupted.
 *
 * Usage: node tools/dsh-web.cjs [--home <dir>] [--profile <name>] [--port <n>]
 */
'use strict'
const { spawn, spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const chrome = require('../scripts/chrome.cjs')

const ROOT = path.resolve(__dirname, '..')
/** The scratch host's home: build output, so it lives with the other debug artifacts. */
const DEFAULT_HOME = path.join(ROOT, '.debug', 'e2e', 'home')

/** Run one command line to completion, inheriting its output; throws on a non-zero exit. */
function run(command, options = {}) {
  const result = spawnSync(command, { stdio: 'inherit', shell: true, ...options })
  if (result.status !== 0) throw new Error(`${command} exited with ${result.status}`)
}

/**
 * Boot one scratch host.
 *
 * @param options.home - the scratch `$DSH_HOME` (created when absent).
 * @param options.profile - the profile to boot.
 * @param options.port - the port; 0 lets the OS pick one.
 * @param options.patch - loader patch entries (YAML text) written into a `--patch`
 *     overlay before boot: how a lane points the host's model adapter at the
 *     scripted service (tools/mock-llm.cjs, D45).
 * @param options.env - extra environment for the host process.
 * @param options.resetState - clear the home's sessions and their sidebar cache
 *     first, so a lane that asserts on what the page shows starts from an empty
 *     conversation list. The profile stays — it holds the plugin link and the
 *     onboarding steps already answered — and so does the workspace registry,
 *     without which the shell asks for a workspace instead of starting a turn.
 * @param options.timeoutMs - how long to wait for the printed URL.
 * @returns `{ url, home, stop() }`; `stop` ends the host and everything it spawned.
 */
async function start(options = {}) {
  const home = options.home ?? DEFAULT_HOME
  const profile = options.profile ?? 'web'
  const port = options.port ?? 0
  const timeoutMs = options.timeoutMs ?? 120000
  fs.mkdirSync(home, { recursive: true })
  if (options.resetState === true) {
    for (const entry of ['sessions', path.join('storages', 'session_projcache'), path.join('cache', 'dsh-claude-style', 'usage.json')]) {
      fs.rmSync(path.join(home, entry), { recursive: true, force: true })
    }
  }
  // Idempotent: the profile is initialized and the checkout linked into it on
  // the first run, and pnpm reports "already up to date" afterwards.
  run(`dsh plugin --profile ${profile} add "${ROOT}"`, { env: { ...process.env, DSH_HOME: home } })
  // The lane's own entries go into a separate overlay (`--patch`), never into
  // the profile's `cordis.patch.yml`: that file is the host's user layer, where
  // the shell persists settings such as the answered onboarding steps, and
  // overwriting it brings those steps back on every boot.
  const overlay = path.join(home, `${profile}.lane.patch.yml`)
  fs.writeFileSync(overlay, `# Written by tools/dsh-web.cjs for this run.\n${options.patch ?? '[]'}\n`)

  const env = { ...process.env, DSH_HOME: home, ...options.env }
  const command = `dsh --profile ${profile} --patch "${overlay}" --port ${port} --no-open`
  const child = spawn(command, {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  })
  const stop = () => {
    if (child.exitCode !== null || child.signalCode !== null) return
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    else child.kill('SIGTERM')
  }
  const url = await new Promise((resolve, reject) => {
    let output = ''
    const timer = setTimeout(() => {
      stop()
      reject(new Error(`dsh web printed no URL within ${timeoutMs} ms; output so far:\n${output}`))
    }, timeoutMs)
    const watch = (chunk) => {
      output += chunk.toString()
      const match = output.match(/dsh web: (http\S+)/)
      if (match === null) return
      clearTimeout(timer)
      resolve(match[1])
    }
    child.stdout.on('data', watch)
    child.stderr.on('data', watch)
    child.on('exit', (code) => {
      clearTimeout(timer)
      reject(new Error(`dsh web exited with ${code} before printing a URL:\n${output}`))
    })
  })
  // A host that dies while the page is being driven is a failure, not a state to
  // read past.
  const ended = new Promise((resolve, reject) => {
    child.on('exit', (code) => reject(new Error(`the scratch host exited with ${code}`)))
  })
  ended.catch(() => {})
  return { url, home, stop, exited: ended }
}

/**
 * Open a headless browser page on a scratch host.
 *
 * @param url - the URL `start()` printed, token included.
 * @param options.headless - run without a window (default true).
 * @param options.width/height - the viewport.
 * @returns `{ page, context, browser, close() }`.
 */
async function openPage(url, options = {}) {
  const executablePath = chrome.findChrome()
  if (!executablePath) throw new Error('no local Chrome or Edge found; set CHROME_PATH')
  const browser = await chromium.launch({ executablePath, headless: options.headless ?? true })
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: options.height ?? 900 } })
  const page = await context.newPage()
  const problems = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') problems.push(`${message.type()}: ${message.text()}`)
  })
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  return { page, context, browser, problems, close: () => browser.close() }
}

/** Wait until the skin has taken the page (its build id is on `<body>`). */
async function waitForSkin(page, timeoutMs = 30000) {
  await page.waitForFunction(() => document.body.hasAttribute('data-dsh-claude-style'), undefined, { timeout: timeoutMs })
}

/**
 * Close the shell's own first-run overlays so a lane can reach the composer: a
 * fresh `$DSH_HOME` opens them in turn (the preview notice, then the credentials
 * form) behind a full-page mask that takes the pointer events aimed at the page
 * below.
 *
 * The shell ignores Escape, so each overlay is answered by its first button —
 * the only one the notice has, and the one that defers the credentials form. A
 * dialog whose text survives its own button is not going away, and the loop
 * reports that rather than pressing it again. Clicks are forced: the mask sits
 * over the page, so the hit test the default click performs never settles.
 *
 * @param options.limit - how many overlays to answer before giving up.
 * @returns whether no dialog is left open.
 */
async function dismissOverlays(page, options = {}) {
  const open = () => page.locator('[role="dialog"]:visible')
  let answered = null
  for (let attempt = 0; attempt < (options.limit ?? 6); attempt++) {
    const dialogs = open()
    if (await dialogs.count() === 0) return true
    const text = await dialogs.last().innerText()
    if (text === answered) return false
    answered = text
    await dialogs.last().locator('button:visible').first().click({ force: true })
    await page.waitForTimeout(600)
  }
  return (await open().count()) === 0
}

module.exports = { start, openPage, waitForSkin, dismissOverlays, DEFAULT_HOME }

if (require.main === module) {
  const args = process.argv.slice(2)
  const argOf = (name) => {
    const at = args.indexOf(`--${name}`)
    return at === -1 ? undefined : args[at + 1]
  }
  const home = argOf('home')
  start({ home, profile: argOf('profile'), port: argOf('port') === undefined ? 0 : Number(argOf('port')) }).then((instance) => {
    console.log(`dsh web: ${instance.url}\nDSH_HOME: ${instance.home}\nCtrl+C to stop.`)
    process.on('SIGINT', () => {
      instance.stop()
      process.exit(0)
    })
  }).catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
