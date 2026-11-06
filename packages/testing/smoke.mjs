#!/usr/bin/env node
/**
 * smoke.mjs — zero-dependency smoke test of the BUILT plugin (`lib/`); no running
 * DSH instance is needed.
 *
 * Host half, in Node: `lib/host/index.js` is applied to a fake cordis context and the
 * username and session-delete routes get the request shapes that matter
 * (D75) — a cross-site page, a LAN peer and the browser's
 * own same-origin fetch, plus the deletion route's own guards (POST only, a
 * path-shaped id, an id carrying the escape itself, an open session) and a real
 * deletion against a scratch harness home under .debug/, including a
 * plugin-generated id stored under the harness's escaped name — once through a
 * host that offers
 * `connection.requestRejection()` and once through the local stand-in. The
 * public prefix route serves the assets the build routed from lib/assets/,
 * under the build's own manifest, and nothing else.
 *
 * Browser half, in headless Chrome/Edge through Playwright (packages/testing/browser.mjs):
 * `lib/client.js` is loaded into
 * a page that stands in for the host (module loader, ctx, a sidebar footer with
 * an account menu and two plugin entries, a composer whose editor handles Enter
 * the way the host's keymap does), and checked for:
 *   - boot       apply() installs every feature and registers its teardown;
 *   - idle       once settled, no scheduler pass runs — a pass that mutates the
 *                DOM schedules the next one, and then the page never idles;
 *   - enter      Enter on an open composer menu reaches the host, never "Send";
 *   - popovers   the shared popover rule: a pointer crossing a trigger opens
 *                nothing before the dwell elapses, and whichever card opens last
 *                folds the one before it — the skin's own cards and the host's
 *                hero menu alike;
 *   - desktop    the desktop footer: the host's own account row is the
 *                entry, and our container is injected into its account menu —
 *                first child, self-healing across a host re-render, reachable
 *                by the host's keyboard walk, and gone when the menu closes;
 *   - markup     strings from settings, the account service and plugins render
 *                as text, never as markup;
 *   - isolation  a host API that breaks one feature — at install or at sync —
 *                retires only that feature and hands its surface back (D12);
 *   - deepy      the DeepSeek brand: the whale stands on the home card and on
 *                the conversation's input area (or the panel replacing its
 *                card), follows the session's state and moments, changes
 *                frames without waking a pass, and leaves with the page;
 *   - teardown   dispose leaves no skin node, marker, body attribute or
 *                stylesheet behind, and no pass runs afterwards.
 *
 * This file is the runner. The parts live in packages/testing/smoke/: shared.mjs (paths,
 * fixtures, `check`), host-half.mjs (the Node half), page.mjs (one case's
 * stand-in page), the stand-in/ and probe/ parts (the scripts that page runs
 * before and after the bundle) and cases.mjs (what each case's report must show).
 *
 * Usage: node packages/testing/smoke.mjs [--case <name>[,<name>…]] [--feature <dir>[,<dir>…]] [--quick] [--jobs <n>]
 *        (CHROME_PATH overrides the browser lookup, DSH_SMOKE_JOBS the page count)
 *        --case runs the named browser cases alone, --feature the cases that
 *        cover the named directories under packages/client/src/features/; both may be repeated,
 *        combined, and neither means every case. --quick leaves out the cases
 *        and the checks that watch motion (TIMING_CASES in packages/testing/smoke/
 *        shared.mjs). Cases that share a stand-in configuration and a markup
 *        run in one page load (PAGES in shared.mjs), and the log names the pages
 *        it loaded. The pages are independent of one another — each carries its
 *        own context, markup and probe — so they are driven several at a time
 *        (JOBS below, `--jobs` or DSH_SMOKE_JOBS to change it) and the pages
 *        that watch motion run two at a time at the end, over a quiet browser.
 *        The Node host half runs either way.
 * Exit:  0 every check passed · 1 a check failed · 2 the command line names
 *        nothing it can run · 3 the browser half gave no verdict (no browser, or
 *        it could not start)
 */
import { availableParallelism } from 'os'
import { findChrome, openBrowser } from './browser.mjs'
import { UNJUDGED_EXIT } from './host-version.mjs'
import { check, failures, skips, setTier, tierName, TIMING_CASES, FEATURE_CASES, pagesFor } from './smoke/shared.mjs'
import { hostHalf } from './smoke/host-half.mjs'
import { page } from './smoke/page.mjs'
import { serveStandIn } from './smoke/server.mjs'
import { CASES } from './smoke/cases.mjs'
import { withLock } from '../../scripts/shared/verify-lock.mjs'
import { mapAtOnce } from './at-once.mjs'

/** End the run over a command line or a table that cannot be honoured. */
function bad(message) {
  console.error(`smoke: ${message}`)
  process.exit(2)
}

/**
 * How many page loads the run drives at once. A page spends most of its time
 * waiting — the skin's first pass, a debounce, a dwell — while its own context,
 * markup and probe are private to it, so the pages wait beside one another; the
 * count stays at half the machine's cores at most, because the pages that watch
 * motion depend on the browser keeping its frame rate.
 */
const DEFAULT_JOBS = Math.max(2, Math.min(10, Math.floor(availableParallelism() / 2)))

/**
 * How many of the pages that watch motion run at once. Their readings follow a
 * dwell, a glide or a frame sequence, which a browser short of frames answers
 * differently, so they are kept away from the pool above; two of them on one
 * machine still leave the renderer its frames and halve the tier's longest wait.
 */
const MOTION_JOBS = 2

/**
 * What the command line asked for: `--case a,b` names cases, `--feature dir`
 * names a directory under packages/client/src/features/ and stands for the cases the table
 * gives it, `--quick` picks the tier. Both name flags may be repeated and
 * combined. An unknown argument, case or directory ends the run with exit 2, so
 * a misspelling cannot pass as a full run.
 */
function selection() {
  const cases = []
  const args = process.argv.slice(2)
  let quick = false
  let jobs = DEFAULT_JOBS
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--quick') {
      quick = true
      continue
    }
    if (arg === '--jobs' || arg.startsWith('--jobs=')) {
      const value = arg.includes('=') ? arg.slice(arg.indexOf('=') + 1) : args[++i]
      if (value === undefined || !/^\d+$/.test(value.trim()) || Number(value) < 1) bad(`--jobs takes how many pages to drive at once, not "${value}"`)
      jobs = Number(value)
      continue
    }
    const flag = arg === '--case' || arg.startsWith('--case=') ? 'case'
      : arg === '--feature' || arg.startsWith('--feature=') ? 'feature'
      : null
    if (flag === null) bad(`unknown argument "${arg}"`)
    const value = arg.includes('=') ? arg.slice(arg.indexOf('=') + 1) : args[++i]
    if (value === undefined || value.trim() === '') bad(`--${flag} needs a name`)
    for (const raw of value.split(',')) {
      const name = raw.trim()
      if (name === '') continue
      if (flag === 'case') {
        if (!Object.hasOwn(CASES, name)) bad(`no browser case named "${name}" — the cases are: ${Object.keys(CASES).join(', ')}`)
        cases.push(name)
        continue
      }
      if (!Object.hasOwn(FEATURE_CASES, name)) bad(`no feature directory named "${name}" — the directories are: ${Object.keys(FEATURE_CASES).join(', ')}`)
      if (FEATURE_CASES[name].length === 0) bad(`packages/client/src/features/${name}/ has no smoke case of its own`)
      cases.push(...FEATURE_CASES[name])
    }
  }
  return { cases: [...new Set(cases)], quick, jobs }
}

/**
 * Every case a manifest names has to exist: a renamed case ends the run
 * instead of quietly leaving its feature uncovered.
 */
function checkFeatureTable() {
  for (const [name, covered] of Object.entries(FEATURE_CASES)) {
    for (const one of covered) {
      if (!Object.hasOwn(CASES, one)) bad(`a manifest in packages/client/src/features/${name}/ names the case "${one}", which the case table does not hold`)
    }
  }
}

/**
 * Load one page in a context of its own and return the report its probe answered
 * with. The fresh context is what keeps a case from reading what an earlier one
 * fetched: the routed assets are cached for good, and a case that refuses one
 * (chunk-fault) must be answered by the server, not by that cache.
 */
async function runPage(instance, base, name) {
  const context = await instance.newContext()
  try {
    const tab = await context.newPage()
    await tab.goto(`${base}/${name}`, { waitUntil: 'domcontentloaded' })
    const reported = await tab.waitForFunction(() => window.__smoke !== undefined, undefined, { timeout: 10000 })
      .then(() => true, () => false)
    if (!reported) throw new Error(`case "${name}" never reported`)
    try {
      return await tab.evaluate(() => window.__smoke)
    } catch (error) {
      // A probe that throws rejects its promise, which the page answers with the
      // throw itself: the failure that caused it is what the run must show.
      throw new Error(`case "${name}" threw: ${error.message}`)
    }
  } finally {
    await context.close()
  }
}

/**
 * The cases this run loads: the picked ones (or every case) minus the timing
 * cases the quick tier leaves out. A selection that leaves nothing ends the run
 * before the host half, so an empty quick run cannot look like a pass.
 */
function plan(only, quick) {
  const all = Object.keys(CASES)
  const timing = new Set(TIMING_CASES)
  const asked = only.length ? only : all
  const cases = asked.filter((name) => !(quick && timing.has(name)))
  const leftOut = quick ? asked.filter((name) => timing.has(name)) : []
  if (cases.length === 0) bad(`the quick tier leaves nothing to run: ${leftOut.join(', ')} watch motion`)
  return { cases, leftOut, total: all.length }
}

async function browserHalf(planned, jobs) {
  const { cases, leftOut, total } = planned
  const pages = pagesFor(cases)
  const browser = findChrome()
  if (!browser) {
    console.log('\nbrowser half — skipped: no Chrome/Edge found (set CHROME_PATH)')
    return { ran: false, scope: '' }
  }
  const server = await serveStandIn((name) => {
    const entry = pages.find((one) => one.page === name)
    return entry === undefined ? undefined : page(name, tierName(), entry.cases)
  })
  const base = server.base
  // The machine's own motion setting must not decide a check: every case runs
  // with no reduced-motion request, and a probe that needs one asks for it itself.
  let instance
  try {
    instance = await openBrowser({ width: 1280, height: 800, reducedMotion: 'no-preference' })
  } catch (error) {
    // A browser that will not start judges nothing; the run says so with the
    // exit code a no-verdict run answers, rather than a failed check.
    console.error(`smoke: the browser could not start: ${error.message}`)
    await server.close()
    return { ran: false, scope: '' }
  }
  try {
    // A page that watches motion reads it frame by frame, so it runs alone over
    // an idle browser; every other page is independent of its neighbours and
    // runs in the pool.
    const timing = new Set(TIMING_CASES)
    const alone = pages.filter((entry) => entry.cases.some((name) => timing.has(name)))
    const together = pages.filter((entry) => !alone.includes(entry))
    console.log(`\nbrowser half — tier ${tierName()} — ${cases.length} of ${total} cases in ${pages.length} page loads${alone.length === 0 ? '' : `, ${alone.length} of them ${MOTION_JOBS} at a time`}: ${cases.join(', ')}`)
    if (leftOut.length) console.log(`browser half — left out as timing: ${leftOut.join(', ')}`)
    const reports = new Map()
    const spent = new Map()
    const read = async ({ page: pageName }) => {
      const at = Date.now()
      reports.set(pageName, await runPage(instance, base, pageName))
      spent.set(pageName, Date.now() - at)
    }
    console.log(`browser half — ${together.length} pages ${jobs} at a time, then ${alone.length} at ${MOTION_JOBS}`)
    const started = Date.now()
    await mapAtOnce(together, jobs, read)
    await mapAtOnce(alone, MOTION_JOBS, read)
    const slowest = [...spent].sort((left, right) => right[1] - left[1]).slice(0, 3)
    console.log(`browser half — ${pages.length} page loads in ${((Date.now() - started) / 1000).toFixed(1)} s; slowest: ${slowest.map(([name, ms]) => `${name} ${(ms / 1000).toFixed(1)}s`).join(', ')}`)
    for (const { page: pageName, cases: pageCases } of pages) {
      if (pageCases.length > 1) console.log(`\nbrowser half — page ${pageName} — ${pageCases.join(', ')}`)
      const report = reports.get(pageName)
      for (const name of pageCases) {
        console.log(`\nbrowser half — ${name}`)
        CASES[name](report)
      }
    }
    return { ran: true, scope: `${cases.length} of ${total} browser cases in ${pages.length} page loads, tier ${tierName()}` }
  } finally {
    await server.close()
    await instance.close()
  }
}

async function main() {
  const { cases, quick, jobs } = selection()
  checkFeatureTable()
  const planned = plan(cases, quick)
  setTier(quick ? 'quick' : 'full')
  await hostHalf()
  const { ran, scope } = await browserHalf(planned, jobs)
  const skipped = skips() === 0 ? '' : `, ${skips()} timing checks skipped`
  if (failures() > 0) console.log(`\nsmoke: ${failures()} check(s) failed`)
  else if (ran) console.log(`\nsmoke: all checks passed (${scope}${skipped})`)
  else console.log(`\nsmoke: the browser half gave no verdict${skipped}`)
  process.exit(failures() > 0 ? 1 : ran ? 0 : UNJUDGED_EXIT)
}

withLock('smoke', 'smoke', main).catch((error) => {
  console.error(error)
  process.exit(1)
})
