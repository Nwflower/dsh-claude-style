#!/usr/bin/env node
/**
 * smoke.mjs — the installation cases of the stand-in lane (D92): the host half in
 * Node, and the browser half in the stand-in host page under headless Chrome.
 * stand-in.mjs owns the request, the stand-in server, the browser and the verify
 * lock; this file turns a selection into page loads and case results, and a
 * request for the host half alone needs neither a server nor a browser.
 */
import { availableParallelism } from 'os'
import { setTier, tierName, TIMING_CASES, FEATURE_CASES, pagesFor } from './smoke/shared.mjs'
import { hostHalf } from './smoke/host-half.mjs'
import { CASES } from './smoke/cases.mjs'
import { mapAtOnce } from './at-once.mjs'

/** End the request over a selection or a table that cannot be honoured. */
function bad(message) {
  console.error(`stand-in: ${message}`)
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
 * The cases a selection names: a case stands for itself, a feature directory
 * stands for the cases its manifest gives it, and an empty selection is every
 * case. An unknown name ends the request before any page opens, so a misprint
 * cannot pass as a full run.
 */
function casesFor(names) {
  if (names.length === 0) return Object.keys(CASES)
  const cases = []
  for (const name of names) {
    if (Object.hasOwn(CASES, name)) {
      cases.push(name)
      continue
    }
    if (!Object.hasOwn(FEATURE_CASES, name)) bad(`no case or feature directory named "${name}" — the cases are: ${Object.keys(CASES).join(', ')}`)
    // A feature with no installation case of its own is judged by behaviour
    // specs or end-to-end scenarios; the host-half check above still runs.
    if (FEATURE_CASES[name].length > 0) cases.push(...FEATURE_CASES[name])
  }
  return [...new Set(cases)]
}

/**
 * Every case a manifest names has to exist: a renamed case ends the request
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
async function runPage(browser, base, name) {
  const context = await browser.newContext()
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
      // throw itself: the failure that caused it is what the request must show.
      throw new Error(`case "${name}" threw: ${error.message}`)
    }
  } finally {
    await context.close()
  }
}

/**
 * The cases this request loads: the picked ones (or every case) minus the timing
 * cases the quick tier leaves out. A selection that leaves nothing ends the
 * request before the host half, so an empty quick run cannot look like a pass.
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

/**
 * Drive the page loads the plan names on the browser and stand-in server the lane
 * holds, and judge each case's report.
 */
async function drivePages(planned, jobs, browser, base) {
  const { cases, leftOut, total } = planned
  const pages = pagesFor(cases)
  // A page that watches motion reads it frame by frame, so it runs alone over an
  // idle browser; every other page is independent of its neighbours and runs in
  // the pool.
  const timing = new Set(TIMING_CASES)
  const alone = pages.filter((entry) => entry.cases.some((name) => timing.has(name)))
  const together = pages.filter((entry) => !alone.includes(entry))
  console.log(`\nbrowser half — tier ${tierName()} — ${cases.length} of ${total} cases in ${pages.length} page loads${alone.length === 0 ? '' : `, ${alone.length} of them ${MOTION_JOBS} at a time`}: ${cases.join(', ')}`)
  if (leftOut.length) console.log(`browser half — left out as timing: ${leftOut.join(', ')}`)
  const reports = new Map()
  const spent = new Map()
  const read = async ({ page: pageName }) => {
    const at = Date.now()
    reports.set(pageName, await runPage(browser, base, pageName))
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
  return `${cases.length} of ${total} browser cases in ${pages.length} page loads, tier ${tierName()}`
}

/**
 * The installation cases of a stand-in request: the host half, then the page
 * loads its selection names, on the browser and server the lane opened.
 */
async function serveInstallation(request, browser, base) {
  checkFeatureTable()
  await hostHalf()
  if (request.host) return { scope: '' }
  const planned = plan(casesFor(request.cases), request.quick === true)
  setTier(request.quick === true ? 'quick' : 'full')
  const scope = await drivePages(planned, request.jobs, browser, base)
  return { scope }
}

export { casesFor, serveInstallation, DEFAULT_JOBS, MOTION_JOBS }
