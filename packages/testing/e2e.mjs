#!/usr/bin/env node
/**
 * e2e.mjs — the end-to-end lane: a real `dsh web` with this checkout's plugin,
 * a scripted model service, and a browser on the page (D77).
 *
 * The smoke's stand-in page reproduces the structure its author knows; this lane
 * runs the assembled client and asserts what only it shows — that a scripted
 * answer renders as the reader sees it, that a scripted tool call becomes a row
 * with its result, that the conversation never jumps or slides backward while
 * the answer streams in, that the send flight hands the reader's words over
 * without a blank frame, and that both palettes capture the README frame's own
 * picture with nothing personal in it. The `contract` scenario walks packages/contracts/src/table.ts against the same page, so
 * each host literal the skin depends on is checked where it lives (D3), and the
 * `importance` scenario holds every `!important` the skin writes to one the page
 * needs (packages/testing/importance.mjs, D9).
 *
 * This file is the runner: it boots each scenario's instance, samples the page
 * once per frame while the turn runs, and writes the evidence of a failure. The
 * scenarios are the table in packages/testing/scenarios.mjs.
 * Every scenario runs against its own scratch instance, so nothing a scenario
 * writes can reach another. The instances stand beside each other: the walk runs
 * several scenarios at once (DEFAULT_JOBS, `--jobs` to change it), each in a
 * scratch home of its own, over one browser the lane starts for the whole walk.
 *
 * Usage: node packages/testing/e2e.mjs [--scenario <name>[,<name>…]] [--shard <index>:<total>] [--jobs <n>] [--headed] [--out <dir>] [--delay <ms>]
 *        --scenario names what to run; without it the walk is every scenario in
 *        the table (packages/testing/scenarios.mjs) but the parked pair below.
 *        --shard takes one slice of that walk, so several runs hold the whole
 *        of it between them (D77); a slice runs one scenario at a time, since
 *        the cloud's own parallelism is the shards.
 */
import fs from 'node:fs'
import { availableParallelism } from 'node:os'
import path from 'node:path'
import { launchBrowser } from './browser.mjs'
import { start, openPage, waitForSkin, dismissOverlays, firstRunOverlayText, DEFAULT_HOME } from './dsh-web.mjs'
import { MARKS, measureFrameMs } from './lane.mjs'
import { requireNewestHost } from './host-version.mjs'
import { SCENARIOS } from './scenarios.mjs'
import { sendPrompt, waitForTurn } from './prompt.mjs'
import { startMockLlm } from './mock-llm.mjs'
import { startMockPlatform, accountStore } from './mock-platform.mjs'
import { loadModule } from '../../scripts/shared/ts-module.mjs'
import { withLock } from '../../scripts/shared/verify-lock.mjs'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const DEFAULT_OUT = path.join(ROOT, '.debug', 'e2e', 'out')
/**
 * How long one scenario may take. A wait that never settles would otherwise hold
 * the run until the runner's own limit: this deadline writes the failure evidence
 * and stops the run instead. `DSH_E2E_DEADLINE_MS` shortens it, for trying the
 * watchdog itself.
 */
const SCENARIO_DEADLINE_MS = Number(process.env.DSH_E2E_DEADLINE_MS ?? '') || 3 * 60 * 1000

/**
 * How many scenarios the walk runs at once. Each one boots its own host and
 * drives its own page, and the scenarios that read the page frame by frame —
 * the tail's follow, the flight's landing, the doors' pin, the frame cost of a
 * long session — are the ones a loaded machine disturbs, so the count stays
 * well under the machine's cores. `--jobs` or `DSH_E2E_JOBS` says another.
 */
const DEFAULT_JOBS = Math.max(2, Math.min(4, Math.floor(availableParallelism() / 5)))

/** How many scenarios to run at once: the flag or the environment, else DEFAULT_JOBS. */
function jobsOf(value) {
  const asked = value ?? process.env.DSH_E2E_JOBS
  if (asked === undefined) return DEFAULT_JOBS
  const count = Number(asked)
  if (!Number.isInteger(count) || count < 1) throw new Error(`--jobs takes how many scenarios to run at once, not "${asked}"`)
  return count
}

/**
 * One scratch home per scenario running at once: `dsh-web.mjs` clears a home's
 * sessions and puts its settings layer back before every boot, so two scenarios
 * in one home would clear each other's state mid-turn. A walk of one scenario
 * uses the home itself, so `--home` keeps meaning what it says.
 */
function workerHomes(base, jobs, total) {
  const root = path.resolve(base ?? DEFAULT_HOME)
  const wanted = Math.max(1, Math.min(jobs, total))
  return wanted === 1 ? [root] : Array.from({ length: wanted }, (_, at) => `${root}-${at}`)
}

/**
 * The scenarios the default walk leaves out: the two that read the host's own
 * statistics surfaces on a page the reader has moved (stats-position.mjs,
 * stats-overlay.mjs). This list is the only place a scenario is parked — the
 * default walk is every other entry of the table, derived in main() — so a
 * scenario added to the table runs by default, and a name here that the table
 * no longer holds stops the run.
 */
const PARKED = new Set(['statsPosition', 'statsOverlay'])

/**
 * What the page looked like when a scenario failed: a picture, the console
 * problems, and the markers a timeout usually turns on — the composer's own
 * value, the host flow rows that did appear, any overlay still open. The lane
 * writes these into its output directory, which CI keeps as an artifact.
 */
async function captureFailure(session, out, name, say) {
  const { page } = session
  const file = path.join(out, `${name}-failure.png`)
  await page.screenshot({ path: file }).catch(() => {})
  const state = await page.evaluate(() => {
    const input = document.querySelector('[data-composer-input]')
    return {
      url: location.href,
      composerValue: input === null ? null : (input.value ?? input.textContent ?? ''),
      rows: [...document.querySelectorAll('[data-chat-flow-kind]')].map((row) => row.getAttribute('data-chat-flow-kind')),
      dialogs: [...document.querySelectorAll('[role="dialog"]')]
        .filter((node) => node.offsetParent !== null)
        .map((node) => (node.innerText || '').replace(/\s+/g, ' ').slice(0, 160)),
      skin: document.body.getAttribute('data-dsh-claude-style'),
      // Whatever a scenario left in the title: a page under test has no other
      // channel out of the browser, and a failure is when it is worth reading.
      title: document.title,
    }
  }).catch((error) => ({ error: String(error) }))
  const report = [
    `scenario: ${name}`,
    `problems (${session.problems.length}):`,
    ...session.problems.slice(0, 20).map((line) => `  ${line}`),
    `state: ${JSON.stringify(state, null, 2)}`,
  ].join('\n')
  fs.writeFileSync(path.join(out, `${name}-failure.txt`), `${report}\n`)
  say(`  failure evidence: ${file}\n`)
}

/**
 * Sample the page once per frame, until the turn settles.
 *
 * The trace holds what each frame painted. The scroll offset a frame later reads
 * is the one the previous frame left, so a decrease between two samples is a
 * frame the reader saw slide backward, and the gap is what sat below the fold.
 * The same samples carry the send flight: the stand-in the composer leaves behind
 * (`send-snapshot.ts`), the mark on the real row while it flies, and — taken once,
 * on the stand-in's first frame — the type and card colors it copied, so a
 * take-off that changes the reader's own look is visible in the trace.
 */
async function startTrace(page) {
  await page.evaluate((host) => {
    const trace = []
    window.__e2eTrace = trace
    const visible = (element) => element !== null && getComputedStyle(element).visibility !== 'hidden' && Number(getComputedStyle(element).opacity) > 0
    const words = (element) => element === null ? null : [...element.querySelectorAll('*')]
      .filter((node) => node.children.length === 0 && (node.textContent ?? '').trim() !== '' && visible(node))
      .map((node) => (node.textContent ?? '').trim().slice(0, 24))
    const type = (element) => {
      if (element === null) return null
      const style = getComputedStyle(element)
      return { family: style.fontFamily, size: style.fontSize, weight: style.fontWeight, color: style.color }
    }
    const cardOf = (element) => element === null ? null : element.querySelector(host.composerCard)
    let takeOff = null
    // The row the skin marks while the stand-in flies is the row it replaces, and
    // it stays the measured row after the mark clears, when the row is shown
    // again. Reading the last user row in the document instead measures whichever
    // row the host renders last, which is not the newest message: on a full
    // transcript the stand-in then looks hundreds of pixels off the row it lands
    // on. The stand-in's own words ride along in the same trace.
    let adopted = null
    const sample = () => {
      const frame = { t: Math.round(performance.now()) }
      const scroller = document.querySelector(host.scroller)
      if (scroller !== null) {
        frame.top = Math.round(scroller.scrollTop)
        frame.height = Math.round(scroller.scrollHeight)
        frame.gap = Math.round(scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop)
        frame.following = document.querySelector(host.followingTail) !== null
        frame.hold = document.querySelector(host.hold) !== null
      }
      const ghost = document.querySelector(host.sendGhost)
      const rows = [...document.querySelectorAll(host.userRow)]
      // The element the skin marks while the stand-in flies is the one it
      // replaces, wherever the host keeps it: a fresh message may sit in the
      // host's own echo element rather than in a user row. It stays the measured
      // row after the mark clears, when the row is shown again, and it is
      // dropped once the host re-renders it away.
      const marked = [...document.querySelectorAll(`[${host.flyingMark}]`)]
      if (marked.length > 0) adopted = marked[marked.length - 1]
      if (adopted !== null && !adopted.isConnected) adopted = null
      const last = adopted ?? (rows.length === 0 ? null : rows[rows.length - 1])
      frame.ghost = ghost !== null
      // The stand-in's own shape against the row it stands in for. Both marks are
      // read every frame: the stand-in has to cover that row whole, because the
      // part of the row left outside it keeps the page's own paint while the
      // covered part carries the stand-in's faded paint on top — one bubble with
      // a stripe across it, which is what send-shape.ts's destination-height
      // floor and send-snapshot.ts's flattened fill exist to prevent.
      const shell = ghost === null ? null : ghost.firstElementChild?.children[1] ?? null
      // The bubble is the first element inside the row that paints a fill, as
      // engine/chat-dom.ts's userBubble looks for it: the host's class names are
      // not a contract this lane may lean on.
      const bubble = last === null ? null : [...last.querySelectorAll('*')].find((node) => {
        const value = getComputedStyle(node).backgroundColor
        const match = /rgba?\(([^)]+)\)/.exec(value)
        if (match === null) return false
        const parts = match[1].split(',').map(Number)
        return (parts[3] ?? 1) > 0.01 && node.getBoundingClientRect().width > 60
      }) ?? null
      const shellRect = shell === null ? null : shell.getBoundingClientRect()
      const bubbleRect = bubble === null || bubble === undefined ? null : bubble.getBoundingClientRect()
      // Both boxes whole, not just their vertical extent: the row may only be
      // shown once the stand-in is on it (send-flight.ts's arrived()), and a row
      // shown while the stand-in is still travelling paints the same message
      // twice, tens of pixels apart, for as long as the landing fade lasts.
      frame.shell = shellRect === null ? null : [shellRect.left, shellRect.top, shellRect.right, shellRect.bottom]
      frame.bubble = bubbleRect === null ? null : [bubbleRect.left, bubbleRect.top, bubbleRect.right, bubbleRect.bottom]
      frame.shellFill = shell === null ? null : getComputedStyle(shell).backgroundColor
      // The ancestor chain's links are there for selector matching alone: a
      // pseudo-element one of them generates paints inside the stand-in.
      const links = ghost === null ? [] : [...ghost.querySelectorAll(host.sendLink)]
      frame.links = links.length
      frame.linkPaints = links.flatMap((link) => ['::before', '::after']
        .filter((pseudo) => !['none', 'normal'].includes(getComputedStyle(link, pseudo).content))
        .map((pseudo) => `${link.className}${pseudo}`))
      frame.bubbleFill = bubble === null || bubble === undefined ? null : getComputedStyle(bubble).backgroundColor
      frame.echo = document.querySelector(host.echo) !== null || (last !== null && last.hasAttribute(host.echoAttribute))
      frame.ghostWords = words(ghost)
      frame.rows = rows.length
      frame.rowFlying = last !== null && last.hasAttribute(host.flyingMark)
      frame.rowVisible = visible(last)
      frame.rowWords = words(last)
      // The live turn's own status line at the end of the flow: the skin pins it
      // while the reader is at the tail, so its screen position is the check.
      // Kept to the hundredth: a pin that slips by a fraction of a pixel is the
      // shake a reader sees once the page is scaled, and rounding would hide it.
      const running = document.querySelector(host.running)
      frame.running = running === null ? null : Math.round(running.getBoundingClientRect().top * 100) / 100
      // The composer's own box and the message column's foot in the viewport:
      // the composer is the scroller's sibling and may not move while the answer
      // grows, and the column's foot against the scroller's own bottom is the
      // stream slide's offset as drawn (stream-pace.mjs). The column keeps a
      // foot of its own below its last block — the host's clearance for the
      // composer — so its foot is read from that block, the flow's last row.
      const card = document.querySelector(host.composerCard)
      const column = scroller === null ? null : scroller.querySelector(host.flow)
      const lastRow = column === null ? null : column.lastElementChild
      const cardRect = card === null ? null : card.getBoundingClientRect()
      const scrollerRect = scroller === null ? null : scroller.getBoundingClientRect()
      const rowRect = lastRow === null ? null : lastRow.getBoundingClientRect()
      const columnRect = column === null ? null : column.getBoundingClientRect()
      // What the reader sees of everything already streamed: the column's layout
      // top, the scroller's offset and the stream slide's transform in one
      // number. A slide that keeps up with the growth holds this steady; one
      // that cancels the host's pin and then re-carries more than arrived shows
      // up here as the column moving down between two frames (stream-jitter.mjs).
      frame.flowTop = columnRect === null ? null : Math.round(columnRect.top * 10) / 10
      frame.card = cardRect === null ? null : Math.round(cardRect.top * 10) / 10
      frame.cardBottom = cardRect === null ? null : Math.round(cardRect.bottom * 10) / 10
      frame.lag = rowRect === null || scrollerRect === null ? null : Math.round((rowRect.bottom - scrollerRect.bottom) * 10) / 10
      if (ghost !== null && takeOff === null) {
        // The stand-in is a clone of the composer card appended to the page, so
        // the real card is the first one the stand-in does not contain.
        const real = (selector) => [...document.querySelectorAll(selector)].find((element) => !ghost.contains(element)) ?? null
        const cloneCard = ghost.querySelector(host.composerCard)
        const card = real(host.composerCard)
        takeOff = {
          clone: type(ghost.querySelector(host.composer)),
          composer: type(real(host.composer)),
          cloneCard: cloneCard === null ? null : getComputedStyle(cloneCard).backgroundColor,
          composerCard: card === null ? null : getComputedStyle(card).backgroundColor,
        }
        frame.takeOff = takeOff
      }
      trace.push(frame)
      if (trace.length < 6000) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  }, MARKS)
}

/** Run one scenario on its own instance, and return its checks and trace. */
async function runScenario(name, options) {
  const scenario = SCENARIOS[name]
  if (scenario === undefined) throw new Error(`no scenario named "${name}" (${Object.keys(SCENARIOS).join(', ')})`)
  /** This scenario's own log lines, handed to the runner as one block when it is done. */
  const lines = []
  const say = (line) => lines.push(line)
  const flush = () => {
    if (lines.length === 0) return
    const block = lines.join('')
    lines.length = 0
    if (options.say === undefined) process.stdout.write(block)
    else options.say(block)
  }
  // The scratch home is known before the host boots, and a scripted tool call
  // needs it: the model service fills the script's `{{workspace}}` slots with it
  // (packages/testing/mock-llm.mjs), and the scenario writes files beside them.
  // A program-dispatched call carries the path inside the program's own source,
  // where a backslash is an escape, so that slot carries the doubled form.
  // A scenario that installs another plugin boots a home of its own: the
  // shared one would carry that plugin onto every later scenario's page. The
  // home starts empty on every run, since the reset below clears the host's
  // sessions and leaves the other plugin's own store pointing at them.
  const sharedHome = path.resolve(options.home ?? DEFAULT_HOME)
  const home = scenario.plugins === undefined
    ? sharedHome
    : path.join(path.dirname(sharedHome), `home-${name}${options.worker === undefined ? '' : `-${options.worker}`}`)
  if (scenario.plugins !== undefined) fs.rmSync(home, { recursive: true, force: true })
  const workspace = path.join(home, 'workspace')
  const mock = await startMockLlm({
    script: scenario.script,
    delayMs: scenario.delayMs ?? options.delayMs,
    vars: { workspace, workspaceCode: workspace.replaceAll('\\', '\\\\') },
  })
  // A scenario that draws the account surfaces signs in against the scripted
  // platform: the host's account provider reads it over loopback, from a store
  // of this boot's own, and the account's model route answers from the same
  // scripted model service as the key route.
  const platform = scenario.account === true ? await startMockPlatform() : null
  const accountPatch = []
  if (platform !== null) {
    const store = path.join(home, 'lane-account.credentials.yaml')
    fs.mkdirSync(home, { recursive: true })
    accountStore(store, platform.url)
    accountPatch.push(
      '- id: credentials', '  config:', `    path: ${JSON.stringify(store)}`,
      '- id: deepseek-account', '  config:', `    platformOrigin: ${platform.url}`, '    allowLoopbackHttp: true', `    inferenceOrigin: ${mock.url}`,
      '- id: llm-deepseek-account', '  config:', `    baseURL: ${mock.url}`,
    )
  }
  const patch = ['- id: llm-deepseek', '  config:', `    baseURL: ${mock.url}`, '    apiKeyEnv: DSH_E2E_MOCK_KEY', ...accountPatch, ...scenario.patch ?? []].join('\n')
  const host = await start({ patch, args: scenario.hostArgs, env: { DSH_E2E_MOCK_KEY: 'mock' }, home, plugins: scenario.plugins, resetState: true })
  say(`\n== ${name} ==  mock ${mock.url}  host ${host.url}\n`)
  /** Where the scenario is, so a hang in the log says which step it never left. */
  const step = (label) => say(`  · ${label}\n`)
  let session
  let expired = false
  const timer = setTimeout(() => { expired = true }, SCENARIO_DEADLINE_MS)
  try {
    // `args` are launch switches, and the walk's shared browser was started
    // without them: a scenario that carries any starts a browser of its own,
    // which its own `close` takes down again.
    session = await openPage(host.url, {
      browser: scenario.browserArgs === undefined ? options.browser : undefined,
      headless: options.headed !== true,
      args: scenario.browserArgs,
      initScript: scenario.initScript,
      ...scenario.viewport,
    })
    const { page } = session
    const body = (async () => {
      step('waiting for the skin')
      await waitForSkin(page)
      step('answering the first-run overlays')
      if (!(await dismissOverlays(page))) {
        const left = await firstRunOverlayText(page)
        throw new Error(`the shell left a first-run overlay open${left === '' ? '' : `: ${left}`}`)
      }
      const context = { page, session, url: host.url, home, trace: [], notes: {}, out: options.out }
      if (scenario.beforeSend !== undefined) await scenario.beforeSend(context)
      step('sending the prompt')
      await startTrace(page)
      await sendPrompt(page, scenario.prompt)
      step('waiting for the turn to settle')
      // A scenario that acts while the turn runs, beside the wait rather than after it.
      const during = scenario.duringTurn === undefined ? null : scenario.duringTurn(context)
      await waitForTurn(page)
      if (during !== null) await during
      context.trace = await page.evaluate(() => window.__e2eTrace ?? [])
      if (scenario.afterTurn !== undefined) {
        step('after the turn')
        await scenario.afterTurn(context)
      }
      step('asserting')
      const checks = await scenario.assert(context)
      // An observation that differs is printed as a difference and fails nothing (D77).
      for (const item of checks) say(`  ${item.ok ? '✓' : item.observation === true ? '△' : '✗'} ${item.name}${item.detail === '' ? '' : `  — ${item.detail}`}\n`)
      const failed = checks.filter((item) => !item.ok && item.observation !== true).length
      const observed = checks.filter((item) => !item.ok && item.observation === true)
      if (expired) throw new Error(`scenario "${name}" overran its ${SCENARIO_DEADLINE_MS / 1000} s deadline`)
      return { scenario: name, checks, failed, observed, frameMs: await measureFrameMs(page), requested: mock.requests.length, trace: context.trace, notes: context.notes }
    })()
    return await body
  } catch (error) {
    if (session !== undefined) await captureFailure(session, options.out, name, say).catch(() => {})
    if (expired) {
      // The hung step is still holding the page; the run stops here with the
      // evidence written above instead of waiting on the runner's own limit.
      say(`  scenario "${name}" passed its ${SCENARIO_DEADLINE_MS / 1000} s deadline; stopping the run\n`)
      flush()
      host.stop()
      await mock.stop().catch(() => {})
      process.exit(1)
    }
    throw error
  } finally {
    clearTimeout(timer)
    if (session !== undefined) await session.close()
    host.stop()
    await mock.stop()
    if (platform !== null) await platform.stop()
    // The lines of a scenario that failed are printed before its error leaves
    // this function, so the evidence and the step it hung on stay together.
    flush()
  }
}

/**
 * One slice of a walk: every `<total>`th name from `<index>`. The scenarios of a
 * walk are independent of one another, so slices taken this way cover the walk
 * exactly once between them however many runners hold it (D77).
 */
function shardOf(names, spec) {
  const at = spec.indexOf(':')
  const index = at === -1 ? NaN : Number(spec.slice(0, at))
  const total = at === -1 ? NaN : Number(spec.slice(at + 1))
  if (!Number.isInteger(index) || !Number.isInteger(total) || total < 1 || index < 0 || index >= total) {
    throw new Error(`--shard takes <index>:<total> with 0 <= index < total, not "${spec}"`)
  }
  return names.filter((name, position) => position % total === index)
}

async function main() {
  const args = process.argv.slice(2)
  const argOf = (flag) => {
    const at = args.indexOf(`--${flag}`)
    return at === -1 ? undefined : args[at + 1]
  }
  // The lane reads what the host draws; a host other than the pinned one gets no verdict (D77).
  requireNewestHost()
  // The timing table names the scenarios that hold it (D3), so the two lists are
  // checked against each other rather than kept in step by hand.
  const { E2E_SCENARIOS } = loadModule('packages/contracts/src/timing.ts')
  const known = Object.keys(SCENARIOS)
  const unknown = E2E_SCENARIOS.filter((name) => !known.includes(name))
  const unnamed = known.filter((name) => !E2E_SCENARIOS.includes(name))
  if (unknown.length > 0 || unnamed.length > 0) {
    throw new Error(`the lane runs ${known.join(', ')} while packages/contracts/src/timing.ts names ${E2E_SCENARIOS.join(', ')}`
      + `${unknown.length > 0 ? `; named there but missing here: ${unknown.join(', ')}` : ''}`
      + `${unnamed.length > 0 ? `; run here but unnamed there: ${unnamed.join(', ')}` : ''}`)
  }
  const parked = [...PARKED].filter((name) => !known.includes(name))
  if (parked.length > 0) {
    throw new Error(`the lane parks ${parked.join(', ')}, which packages/testing/scenarios.mjs does not hold`)
  }
  const names = (argOf('scenario') ?? E2E_SCENARIOS.filter((name) => !PARKED.has(name)).join(',')).split(',').map((name) => name.trim()).filter(Boolean)
  const shard = argOf('shard')
  if (shard !== undefined && argOf('scenario') !== undefined) {
    throw new Error('--shard takes one slice of the default walk; --scenario names the scenarios itself')
  }
  const walked = shard === undefined ? names : shardOf(names, shard)
  if (walked.length === 0) throw new Error(`--shard ${shard} of ${names.length} scenarios has nothing to run`)
  const out = path.resolve(argOf('out') ?? DEFAULT_OUT)
  // A shard is one slice of a walk the cloud holds between several machines, and
  // its own parallelism is the shards; a slice driven several at a time on a
  // small runner is what its frame readings do not survive. `--jobs` says
  // otherwise, and everywhere else the machine's own core count answers.
  const jobs = shard !== undefined && argOf('jobs') === undefined ? 1 : jobsOf(argOf('jobs'))
  const options = {
    headed: args.includes('--headed'),
    delayMs: argOf('delay') === undefined ? undefined : Number(argOf('delay')),
    home: argOf('home'),
    out,
  }
  fs.mkdirSync(out, { recursive: true })
  const homes = workerHomes(options.home, jobs, walked.length)
  // The first boot of a scratch home installs this checkout into its profile,
  // which on a cold machine outlasts the waits a scenario makes on the page.
  // Every home pays that once, up front and beside the others. The home the
  // plugin's own scenarios use is made when their scenario runs (`runScenario`).
  if (walked.length > 1) {
    await Promise.all(homes.map(async (home) => {
      const warm = await start({ home, env: {}, resetState: false })
      warm.stop()
    }))
  }
  // One browser for the whole walk: a scenario's page lives in a context of its
  // own, so what the browser start costs is paid once instead of per scenario.
  const browser = await launchBrowser({ headless: options.headed !== true })
  const queue = [...walked]
  const finished = new Map()
  /** The first scenario that threw, kept until every instance has stopped. */
  let broke = null
  const say = (block) => process.stdout.write(block)
  try {
    await Promise.all(homes.map(async (home, worker) => {
      // A scenario that throws ends the walk the way a serial one does — the
      // scenarios still in flight finish, none is started after it, and what it
      // threw is raised once its instance is down.
      while (queue.length > 0 && broke === null) {
        const name = queue.shift()
        try {
          const result = await runScenario(name, { ...options, home, worker, browser, say })
          fs.writeFileSync(path.join(out, `${name}.json`), `${JSON.stringify(result, null, 2)}\n`)
          finished.set(name, result)
        } catch (error) {
          broke = error
        }
      }
    }))
  } finally {
    await browser.close()
  }
  if (broke !== null) throw broke
  const results = walked.map((name) => finished.get(name))
  const failed = results.reduce((sum, result) => sum + result.failed, 0)
  const observed = results.flatMap((result) => result.observed.map((item) => ({ scenario: result.scenario, ...item })))
  fs.writeFileSync(path.join(out, 'observations.json'), `${JSON.stringify(observed, null, 2)}\n`)
  process.stdout.write(`\n${failed === 0 ? 'E2E PASS' : 'E2E FAIL'} — ${results.length} scenarios, ${failed} failed checks, ${observed.length} observations that differ from their record; traces in ${out}\n`)
  // The cloud's job page carries the differences, so the ones that fail nothing are still read.
  if (observed.length > 0 && process.env.GITHUB_STEP_SUMMARY) {
    const lines = observed.map((item) => `- **${item.scenario}** — ${item.name}: ${item.detail}`)
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Observations that differ from their record\n\n${lines.join('\n')}\n`)
  }
  // A scenario leaves a handle behind on a slow runner — the CI job walked every
  // scenario in minutes and then sat until its own cap, because the process had
  // finished and its event loop had not. The exit code is the result.
  process.exit(failed > 0 ? 1 : 0)
}

withLock('e2e', 'e2e', main).catch((error) => {
  console.error(error)
  process.exit(1)
})
