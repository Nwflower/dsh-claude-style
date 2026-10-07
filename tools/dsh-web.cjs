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
 * @param options.timeoutMs - how long to wait for the printed URL.
 * @returns `{ url, home, stop() }`; `stop` ends the host and everything it spawned.
 */
async function start(options = {}) {
  const home = options.home ?? DEFAULT_HOME
  const profile = options.profile ?? 'web'
  const port = options.port ?? 0
  const timeoutMs = options.timeoutMs ?? 120000
  fs.mkdirSync(home, { recursive: true })
  // Idempotent: the profile is initialized and the checkout linked into it on
  // the first run, and pnpm reports "already up to date" afterwards.
  run(`dsh plugin --profile ${profile} add "${ROOT}"`, { env: { ...process.env, DSH_HOME: home } })

  const command = `dsh --profile ${profile} --port ${port} --no-open`
  const child = spawn(command, {
    env: { ...process.env, DSH_HOME: home },
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

module.exports = { start, openPage, waitForSkin, DEFAULT_HOME }

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
