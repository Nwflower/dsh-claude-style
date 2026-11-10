#!/usr/bin/env node
/**
 * smoke.mjs — installation-case implementation for stand-in.mjs (D92): the
 * host half in Node and the browser half in the stand-in host page under
 * headless Chrome; pages run several at a time, the motion pages two at a time last.
 *
 * Usage: node packages/testing/smoke.mjs [--case <name>[,<name>…]] [--feature <dir>[,<dir>…]] [--quick] [--jobs <n>] [--host]
 *        (CHROME_PATH picks the browser, DSH_SMOKE_JOBS the page count; --host
 *        runs the Node half alone and takes no case, directory or tier)
 * Exit:  0 every check passed · 1 a check failed · 2 the command line names
 *        nothing it can run · 3 the browser half gave no verdict
 */
import { availableParallelism } from 'os'
import { pathToFileURL } from 'node:url'
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
function selection(args) {
  const cases = []
  let quick = false
  let host = false
  let jobs = DEFAULT_JOBS
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--quick') {
      quick = true
      continue
    }
    if (arg === '--host') {
      host = true
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
  // --host opens no page, so a case, a directory or a tier named beside it would
  // name work this run cannot do; the run refuses rather than leaving it out.
  if (host && (cases.length > 0 || quick)) bad('--host runs the Node host half alone, so it takes no --case, --feature or --quick')
  return { cases: [...new Set(cases)], quick, jobs, host }
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

async function main(args) {
  const { cases, quick, jobs, host } = selection(args)
  checkFeatureTable()
  if (host) {
    await hostHalf()
    if (failures() > 0) {
      console.log(`\nsmoke: ${failures()} check(s) failed`)
      return 1
    }
    console.log('\nsmoke: the host half passed; no page was opened')
    return 0
  }
  const planned = plan(cases, quick)
  setTier(quick ? 'quick' : 'full')
  await hostHalf()
  const { ran, scope } = await browserHalf(planned, jobs)
  const skipped = skips() === 0 ? '' : `, ${skips()} timing checks skipped`
  if (failures() > 0) console.log(`\nsmoke: ${failures()} check(s) failed`)
  else if (ran) console.log(`\nsmoke: all checks passed (${scope}${skipped})`)
  else console.log(`\nsmoke: the browser half gave no verdict${skipped}`)
  return failures() > 0 ? 1 : ran ? 0 : UNJUDGED_EXIT
}

/** Run the stand-in's installation checks; the shared runner and this file's own CLI both use it. */
export function runSmoke(args = process.argv.slice(2)) {
  return withLock('smoke', 'smoke', () => main(args))
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSmoke().then((code) => process.exit(code), (error) => {
    console.error(error)
    process.exit(1)
  })
}
