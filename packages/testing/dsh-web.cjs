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
 *   openPage() a headless Chrome from scripts/shared/chrome.cjs on that URL.
 *
 * Run it directly to keep an instance up for manual work: it prints the URL and
 * stays until interrupted.
 *
 * Usage: node packages/testing/dsh-web.cjs [--home <dir>] [--profile <name>] [--port <n>]
 */
'use strict'
const { spawn, spawnSync } = require('node:child_process')
const { randomUUID } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const chrome = require('../../scripts/shared/chrome.cjs')

const ROOT = path.resolve(__dirname, '..', '..')
/** The scratch host's home: build output, so it lives with the other debug artifacts. */
const DEFAULT_HOME = path.join(ROOT, '.debug', 'e2e', 'home')

/**
 * Give the home a workspace of the lane's own when it has none.
 *
 * A fresh `$DSH_HOME` carries an empty workspace registry, and the shell then
 * asks the reader to pick a directory instead of starting a turn — a step the
 * lane cannot answer. The registered directory lives inside the home, so nothing
 * on the machine running the lane is touched, and a home that already has a
 * registry (a lane run before, a reader's own) keeps it.
 *
 * @param home - the scratch `$DSH_HOME`.
 */
function ensureWorkspace(home) {
  const storages = path.join(home, 'storages')
  const file = path.join(storages, 'workspace.json')
  if (fs.existsSync(file)) return
  const directory = path.join(home, 'workspace')
  fs.mkdirSync(directory, { recursive: true })
  fs.mkdirSync(storages, { recursive: true })
  const id = randomUUID()
  const now = new Date().toISOString()
  fs.writeFileSync(file, `${JSON.stringify({
    unit: { name: 'workspace', version: 2 },
    global: {
      initialized: true,
      workspaceIds: [id],
      archivedSessionIds: [],
      pinnedSessionIds: [],
      defaultWorkspaceId: id,
    },
    tables: {
      workspaces: {
        [id]: { path: directory, title: 'lane-workspace', sessionIds: [], createdAt: now, updatedAt: now },
      },
    },
  }, null, 2)}\n`)
}

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
 *     scripted service (packages/testing/mock-llm.cjs, D45).
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
  // Resolved: the home goes into the host's own state (the workspace registry)
  // as a path it has to be able to read, and `--home` may be relative.
  const home = path.resolve(options.home ?? DEFAULT_HOME)
  const profile = options.profile ?? 'web'
  const port = options.port ?? 0
  const timeoutMs = options.timeoutMs ?? 120000
  fs.mkdirSync(home, { recursive: true })
  // The Anthropic faces are the reader's own download and never ship in the
  // package (D11): the lane plants this checkout's copies in the scratch home's
  // drop point, so a capture shows the intended typography instead of falling
  // back per face and logging a 404 for each.
  const dropPoint = path.join(home, 'dsh-claude-style', 'fonts')
  const faces = path.join(ROOT, 'packages', 'assets', 'src', 'fonts', 'anthropic')
  if (fs.existsSync(faces)) {
    fs.mkdirSync(dropPoint, { recursive: true })
    for (const name of fs.readdirSync(faces)) fs.copyFileSync(path.join(faces, name), path.join(dropPoint, name))
  }
  if (options.resetState === true) {
    for (const entry of ['sessions', path.join('storages', 'session_projcache'), path.join('cache', 'dsh-claude-style', 'usage.json')]) {
      fs.rmSync(path.join(home, entry), { recursive: true, force: true })
    }
  }
  ensureWorkspace(home)
  // Idempotent: the profile is initialized and the checkout linked into it on
  // the first run, and pnpm reports "already up to date" afterwards.
  run(`dsh plugin --profile ${profile} add "${ROOT}"`, { env: { ...process.env, DSH_HOME: home } })
  // The lane's own entries go into a separate overlay (`--patch`), never into
  // the profile's `cordis.patch.yml`: that file is the host's user layer, where
  // the shell persists settings such as the answered onboarding steps, and
  // overwriting it brings those steps back on every boot.
  const overlay = path.join(home, `${profile}.lane.patch.yml`)
  fs.writeFileSync(overlay, `# Written by packages/testing/dsh-web.cjs for this run.\n${options.patch ?? '[]'}\n`)

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
 * The shell ignores Escape, so each overlay is answered by its own buttons, in
 * order: the first one is the notice's only action and the credentials form's
 * "later", and a dialog that survives it — a wizard step whose first button
 * merely focuses a field, a form whose submit is refused while empty — gets the
 * next button on the following pass. A dialog whose every button was pressed and
 * which is still there is not going away, and the loop reports that rather than
 * pressing them again. Clicks are forced: the mask sits over the page, so the hit
 * test the default click performs never settles.
 *
 * The pass keeps going until nothing has been open for `quietMs`, because the
 * overlay that follows the one just closed mounts a moment later: a check made
 * in that gap read an empty page, the lane declared the shell dismissed, and the
 * scenario walked into a form whose mask swallows its clicks.
 *
 * @param options.limit - how many overlays to answer before giving up.
 * @param options.quietMs - how long nothing may appear for the page to count as settled.
 * @param options.settleMs - the whole wait, at most.
 * @returns whether no dialog is left open.
 */
async function dismissOverlays(page, options = {}) {
  const limit = options.limit ?? 6
  const quietMs = options.quietMs ?? 1000
  const settleMs = options.settleMs ?? 8000
  const byText = () => page.locator('[role="dialog"]:visible')
  const roots = () => page.locator('[role="presentation"]:visible')
  /** How many buttons of each dialog were already pressed, keyed by its text. */
  const pressed = new Map()
  const overlayOpen = () => page.evaluate(() => document.querySelector('[role="dialog"], [role="presentation"]') !== null)
  const started = Date.now()
  let quietSince = null
  let answered = 0
  while (Date.now() - started < settleMs) {
    if (answered < limit * 3) {
      const dialogs = byText()
      if (await dialogs.count() > 0) {
        const dialog = dialogs.last()
        const text = await dialog.innerText()
        const buttons = dialog.locator('button:visible')
        const count = await buttons.count()
        const tried = pressed.get(text) ?? 0
        if (count > 0 && tried < count) {
          pressed.set(text, tried + 1)
          answered += 1
          await buttons.nth(tried).click({ force: true })
          await page.waitForTimeout(500)
          continue
        }
      }
      const layer = roots()
      if (await layer.count() > 0) {
        const button = layer.last().locator('button:visible').first()
        answered += 1
        if (await button.count() > 0) await button.click({ force: true })
        else await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
        continue
      }
    }
    const now = Date.now()
    if (await overlayOpen()) quietSince = null
    else {
      quietSince = quietSince ?? now
      if (now - quietSince >= quietMs) break
    }
    await page.waitForTimeout(150)
  }
  return (await byText().count()) === 0 && (await roots().count()) === 0
}

/**
 * The text of the first-run overlay still on the page, for a failure message.
 *
 * @returns one line of its text, or an empty string when nothing is open.
 */
async function firstRunOverlayText(page) {
  const open = page.locator('[role="dialog"]:visible, [role="presentation"]:visible')
  if (await open.count() === 0) return ''
  const text = await open.last().innerText().catch(() => '')
  return text.replace(/\s+/g, ' ').trim().slice(0, 200)
}

module.exports = { start, openPage, waitForSkin, dismissOverlays, firstRunOverlayText, DEFAULT_HOME }

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
