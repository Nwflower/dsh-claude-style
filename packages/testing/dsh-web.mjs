#!/usr/bin/env node
/**
 * dsh-web.mjs — a scratch DSH web instance with this checkout's plugin installed,
 * and a browser page on it (D92).
 *
 * The end-to-end lane needs a real host: the smoke's stand-in page reproduces
 * the structure its author knows, while the timing and ordering the skin leans
 * on only exist in the assembled client. This tool owns that host:
 *
 *   start()   a scratch `$DSH_HOME` under .debug/runs/e2e/, the plugin linked into its
 *             web profile once, `dsh --profile web --port 0 --no-open` booted,
 *             and the URL it prints — which carries the launch token — handed
 *             back. The token must be exchanged by a browser: a bare fetch of
 *             the URL without a cookie is answered 401. The host ends with
 *             the process that called start(), however that process ends
 *             (packages/testing/lifeline.mjs).
 *   openPage() a headless Chrome from packages/testing/browser.mjs on that URL.
 *
 * Run it directly to keep an instance up for manual work: it prints the URL and
 * stays until interrupted.
 *
 * Usage: node packages/testing/dsh-web.mjs [--home <dir>] [--profile <name>] [--port <n>]
 */
import { spawn, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { runsPath } from '../../scripts/shared/debug-paths.mjs'
import { newContextOn, openBrowser } from './browser.mjs'
import { argOf } from './cli-args.mjs'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
/** The scratch host's home: build output, so it lives with the other debug artifacts. */
const DEFAULT_HOME = runsPath(ROOT, 'e2e', 'home')
/** Preloaded into the host so it ends with the process that started it. */
const LIFELINE = path.join(import.meta.dirname, 'lifeline.mjs')
/** A console line the GPU process writes into the page on a runner without one. */
const DRIVER_MESSAGE = /^\[\.WebGL-[^\]]*\]GL Driver Message/

/** The one file the workspace holds: with none, the `@` menu has no candidate to open on. */
function writeLaneNote(directory) {
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(path.join(directory, 'lane-note.md'), '# Lane workspace\n\nA file the @ menu can offer.\n')
}

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
  const directory = path.join(home, 'workspace')
  if (fs.existsSync(file)) {
    // A home a run before this one made keeps its registry and its workspace:
    // the note goes back, so the `@` menu has a candidate on this run too.
    if (fs.existsSync(directory)) writeLaneNote(directory)
    return
  }
  writeLaneNote(directory)
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
 * Give the signed-in user control of a scratch home, with the entry inherited
 * by everything written under it.
 *
 * The host provisions its sandbox inside `$DSH_HOME`: it grants the workspace
 * to the sandbox with SetNamedSecurityInfoW, which needs the user to hold
 * WRITE_OWNER on that directory. A directory carries only the inherited
 * `Modify` entry, and Windows does not derive WRITE_OWNER from it, so the
 * host's own grant fails there (Win32 5, `grantWrite(<home>\workspace)`) and a
 * program the model runs never starts. The lane owns the home, so the lane
 * makes it one the host can provision — inherited, so a workspace the host or a
 * scenario creates under it later is covered too.
 */
function provisionHome(home) {
  if (process.platform !== 'win32') return
  const { USERDOMAIN, USERNAME } = process.env
  if (!USERNAME) throw new Error(`cannot tell which account owns ${home}: USERNAME is unset`)
  const account = USERDOMAIN ? `${USERDOMAIN}\\${USERNAME}` : USERNAME
  const granted = spawnSync('icacls', [home, '/grant:r', `${account}:(OI)(CI)F`], { stdio: 'pipe', encoding: 'utf8' })
  if (granted.status !== 0) {
    throw new Error(`icacls could not give ${account} control of ${home} (exit ${granted.status}): ${granted.stderr.trim()}`)
  }
}

/**
 * Boot one scratch host.
 *
 * @param options.home - the scratch `$DSH_HOME` (created when absent).
 * @param options.profile - the profile to boot.
 * @param options.port - the port; 0 lets the OS pick one.
 * @param options.patch - loader patch entries (YAML text) written into a `--patch`
 *     overlay before boot: how a lane points the host's model adapter at the
 *     scripted service (packages/testing/mock-llm.mjs, D92).
 * @param options.args - extra arguments for the web app's own command line
 *     (`--trusted-host <name>`, which a page under a non-loopback name needs).
 * @param options.plugins - other plugins' package specs (`name@version`) added
 *     to the profile beside this checkout, from the registry: what a lane
 *     checks against another plugin's real browser half installs it here, in
 *     a home of its own.
 * @param options.env - extra environment for the host process.
 * @param options.resetState - clear the home's sessions and their sidebar cache
 *     first, so a lane that asserts on what the page shows starts from an empty
 *     conversation list, and put the profile's settings layer back to the copy
 *     kept beside it, so the preferences a run's own settings page turned on do
 *     not carry into the next one. The profile stays — it holds the plugin link
 *     and the onboarding steps already answered — and so does the workspace
 *     registry, without which the shell asks for a workspace instead of starting
 *     a turn.
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
  provisionHome(home)
  // The Anthropic faces are the reader's own download and never ship in the
  // package (D75): the lane plants this checkout's copies in the scratch home's
  // drop point, so a capture shows the intended typography instead of falling
  // back per face and logging a 404 for each.
  const dropPoint = path.join(home, 'dsh-claude-style', 'fonts')
  const faces = path.join(ROOT, 'packages', 'assets', 'src', 'fonts', 'anthropic')
  if (fs.existsSync(faces)) {
    fs.mkdirSync(dropPoint, { recursive: true })
    for (const name of fs.readdirSync(faces)) fs.copyFileSync(path.join(faces, name), path.join(dropPoint, name))
  }
  if (options.resetState === true) {
    // The usage record counts twice: the record itself, and the fold cache an
    // earlier build wrote at the path the record is migrated from
    for (const entry of ['sessions', path.join('storages', 'session_projcache'), path.join('dsh-claude-style', 'usage.json'), path.join('cache', 'dsh-claude-style', 'usage.json')]) {
      fs.rmSync(path.join(home, entry), { recursive: true, force: true })
    }
    // The skin's settings page is part of the end-to-end walk, and the choices
    // it leaves behind are persisted in the profile's patch layer: the layer
    // goes back to the copy kept beside it, or that copy is taken now, so a run
    // starts from the same preferences whatever the run before it turned on.
    const layer = path.join(home, 'profiles', profile, 'cordis.patch.yml')
    const pristine = path.join(home, 'profiles', profile, 'cordis.patch.pristine.yml')
    if (fs.existsSync(layer)) {
      if (fs.existsSync(pristine)) fs.copyFileSync(pristine, layer)
      else fs.copyFileSync(layer, pristine)
    }
  }
  ensureWorkspace(home)
  // Idempotent: the profile is initialized and the checkout linked into it on
  // the first run, and pnpm reports "already up to date" afterwards.
  run(`dsh plugin --profile ${profile} add "${ROOT}"`, { env: { ...process.env, DSH_HOME: home } })
  for (const spec of options.plugins ?? []) run(`dsh plugin --profile ${profile} add ${spec}`, { env: { ...process.env, DSH_HOME: home } })
  // The lane's own entries go into a separate overlay (`--patch`), never into
  // the profile's `cordis.patch.yml`: that file is the host's user layer, where
  // the shell persists settings such as the answered onboarding steps, and
  // overwriting it brings those steps back on every boot.
  const overlay = path.join(home, `${profile}.lane.patch.yml`)
  fs.writeFileSync(overlay, `# Written by packages/testing/dsh-web.mjs for this run.\n${options.patch ?? '[]'}\n`)

  const env = { ...process.env, DSH_HOME: home, ...options.env }
  // The host's stdin is its lifeline (packages/testing/lifeline.mjs): this
  // process never writes to it, and its end closes with this process. The path
  // goes in with forward slashes: NODE_OPTIONS reads a backslash inside quotes
  // as an escape.
  env.DSH_WEB_LIFELINE = '1'
  env.NODE_OPTIONS = [env.NODE_OPTIONS, `--require "${LIFELINE.replaceAll('\\', '/')}"`].filter(Boolean).join(' ')
  const command = [`dsh --profile ${profile} --patch "${overlay}" --port ${port} --no-open`, ...options.args ?? []].join(' ')
  const child = spawn(command, {
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
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
 * @param options.args - extra Chrome switches.
 * @param options.width/height - the viewport.
 * @param options.initScript - a function the page runs before any of its own
 *     scripts, for a reading that has to be in place before the first frame.
 * @param options.browser - a browser to open the page on, from
 *     packages/testing/browser.mjs; a lane that drives several pages at once
 *     starts one browser and passes it, and `close()` then closes this page's
 *     own context alone.
 * @returns `{ page, context, browser, close() }`.
 */
async function openPage(url, options = {}) {
  const opened = options.browser === undefined
    ? await openBrowser({
      headless: options.headless,
      args: options.args,
      width: options.width,
      height: options.height,
      initScript: options.initScript,
    })
    : await sharedOn(options.browser, options)
  const problems = []
  opened.page.on('console', (message) => {
    const problem = consoleProblem(message)
    if (problem !== null) problems.push(problem)
  })
  opened.page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
  await opened.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  return { page: opened.page, context: opened.context, browser: opened.browser, problems, close: opened.close }
}

/**
 * What one console message means for a check that reads the page's problems:
 * an error or a warning the page itself wrote. The GPU process speaks through
 * the page's console on a runner without one, and a driver message is the
 * machine's, not the page's.
 *
 * @param message - a Playwright console message.
 * @returns the problem's line, or null when the message is not the page's.
 */
function consoleProblem(message) {
  if (DRIVER_MESSAGE.test(message.text())) return null
  if (message.type() !== 'error' && message.type() !== 'warning') return null
  return `${message.type()}: ${message.text()}`
}

/** One page in a context of its own on a browser the caller owns. */
async function sharedOn(browser, options) {
  const context = await newContextOn(browser, options)
  const page = await context.newPage()
  return { page, context, browser, close: () => context.close() }
}

/** Wait until the skin has taken the page (its build id is on `<body>`). */
async function waitForSkin(page, timeoutMs = 30000) {
  await page.waitForFunction(() => document.body.hasAttribute('data-dsh-claude-style'), undefined, { timeout: timeoutMs })
}

/**
 * Press one button of the topmost overlay, read and press in the page in one
 * synchronous step: the shell's overlays open and close on their own, so a
 * locator read can find the dialog that answered a count already gone when it
 * resolves, and the read then waits out its default 30s and fails the scenario
 * (a loaded runner failed the release walk exactly there). No frame can run
 * inside one `evaluate`, so nothing can be taken away between the two, and the
 * press needs no hit test, which the shell's mask would never let settle.
 *
 * The host draws the sidebar as a drawer of its own in a narrow frame, and it
 * mounts that drawer as a dialog — closed, off the page's edge, it is still
 * there. It is not one of the shell's first-run overlays, so it is not pressed:
 * a press would land on the sidebar's own controls, and the search button in it
 * opens the skin's palette, which no press closes.
 *
 * @param page - the page to press in.
 * @param tried - how many buttons of each dialog, keyed by its text, are spent.
 * @returns which overlay was answered — a dialog with the button's place in it,
 *     a presentation root, its escape, or nothing open to press.
 */
const pressOverlay = (page, tried) => page.evaluate((spent) => {
  const shown = (element) => element.checkVisibility() && element.getBoundingClientRect().width > 0
  const top = (selector) => {
    const found = Array.from(document.querySelectorAll(selector)).filter(shown)
    return found[found.length - 1]
  }
  const dialog = top('[role="dialog"]:not([data-shortcut-modal="sidebar"])')
  if (dialog !== undefined) {
    const text = dialog.innerText
    const buttons = Array.from(dialog.querySelectorAll('button')).filter(shown)
    const at = spent[text] ?? 0
    if (buttons.length > at) {
      buttons[at].click()
      return { pressed: 'dialog', text, at }
    }
  }
  const layer = top('[role="presentation"]')
  if (layer === undefined) return { pressed: 'none' }
  const button = Array.from(layer.querySelectorAll('button')).filter(shown)[0]
  if (button === undefined) return { pressed: 'escape' }
  button.click()
  return { pressed: 'layer' }
}, tried)

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
 * pressing them again; the press itself is `pressOverlay`, which reads and
 * presses in one step.
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
  // The host's own drawer sidebar is a dialog it mounts whether it stands open
  // or not, so it is left out of both the read and the verdict.
  const byText = () => page.locator('[role="dialog"]:not([data-shortcut-modal="sidebar"]):visible')
  const roots = () => page.locator('[role="presentation"]:visible')
  /** How many buttons of each dialog were already pressed, keyed by its text. */
  const pressed = new Map()
  const overlayOpen = () => page.evaluate(() => document.querySelector('[role="dialog"]:not([data-shortcut-modal="sidebar"]), [role="presentation"]') !== null)
  const started = Date.now()
  let quietSince = null
  let answered = 0
  while (Date.now() - started < settleMs) {
    if (answered < limit * 3) {
      const hit = await pressOverlay(page, Object.fromEntries(pressed))
      if (hit.pressed !== 'none') {
        if (hit.pressed === 'dialog') pressed.set(hit.text, hit.at + 1)
        answered += 1
        if (hit.pressed === 'escape') await page.keyboard.press('Escape')
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
  const open = page.locator('[role="dialog"]:not([data-shortcut-modal="sidebar"]):visible, [role="presentation"]:visible')
  if (await open.count() === 0) return ''
  const text = await open.last().innerText().catch(() => '')
  return text.replace(/\s+/g, ' ').trim().slice(0, 200)
}

export { start, openPage, waitForSkin, dismissOverlays, firstRunOverlayText, consoleProblem, DEFAULT_HOME }

if (import.meta.main) {
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
