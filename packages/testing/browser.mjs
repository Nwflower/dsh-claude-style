/**
 * browser.mjs — the headless Chrome/Edge every tool here drives through
 * Playwright, and the browser lookup they share (D87).
 *
 * The machine's own Chrome or Edge is what runs; Playwright's bundled browsers
 * are never downloaded. CHROME_PATH overrides the lookup.
 */
import fs from 'node:fs'
import { chromium } from 'playwright'

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

/** The browser to drive: CHROME_PATH, else the first installed Chrome/Edge; undefined when there is none. */
function findChrome() {
  return CANDIDATES.filter(Boolean).find((candidate) => fs.existsSync(candidate))
}

/**
 * Start that browser headless and open one page on it.
 *
 * @param options.headless - run without a window (default true).
 * @param options.args - extra Chrome switches.
 * @param options.width/height - the viewport.
 * @param options.reducedMotion - 'no-preference' or 'reduce'; left out, the
 *     machine's own setting answers, which only a case that watches motion wants.
 * @param options.initScript - a function the page runs before any of its own
 *     scripts, for a reading that has to be in place before the first frame.
 * @returns `{ browser, context, page, newContext(), close() }`. `newContext()`
 *   opens another isolated context on the same browser — its own cache and
 *   cookies — which is how a page that must fetch everything fresh gets one.
 */
async function openBrowser(options = {}) {
  const browser = await launchBrowser(options)
  const context = await newContextOn(browser, options)
  const page = await context.newPage()
  return { browser, context, page, newContext: (extra = {}) => newContextOn(browser, options, extra), close: () => browser.close() }
}

/**
 * Start the machine's browser with no page on it. A tool that drives several
 * pages at once — the smoke's page loads, the end-to-end lane's scenarios — pays
 * this once and opens a context per page, instead of a browser each.
 *
 * The switches keep every page at full frame rate while others hold the focus:
 * a page the browser backgrounds runs its animation frames at a fraction of
 * that rate, and a reading taken after a pass the skin schedules would then
 * wait for a frame that does not come.
 */
async function launchBrowser(options = {}) {
  const executablePath = findChrome()
  if (!executablePath) throw new Error('no local Chrome or Edge found; set CHROME_PATH')
  const args = [
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    ...options.args ?? [],
  ]
  return chromium.launch({ executablePath, headless: options.headless ?? true, args })
}

/**
 * One isolated context on a browser already running: its own cache, cookies and
 * storage, which is what keeps two pages from reading each other's fetches.
 *
 * @param browser - a browser from `launchBrowser` or `openBrowser`.
 * @param options - `width`/`height`, `reducedMotion` and `initScript` as above.
 * @param extra - further `newContext` options, merged over them.
 */
async function newContextOn(browser, options = {}, extra = {}) {
  const context = await browser.newContext({
    viewport: { width: options.width ?? 1280, height: options.height ?? 900 },
    ...(options.reducedMotion === undefined ? {} : { reducedMotion: options.reducedMotion }),
    ...extra,
  })
  if (options.initScript !== undefined) await context.addInitScript(options.initScript)
  return context
}

export { findChrome, openBrowser, launchBrowser, newContextOn }
