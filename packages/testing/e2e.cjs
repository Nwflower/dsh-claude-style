#!/usr/bin/env node
/**
 * e2e.cjs — the end-to-end lane: a real `dsh web` with this checkout's plugin,
 * a scripted model service, and a browser on the page (D45).
 *
 * The smoke's stand-in page reproduces the structure its author knows; this lane
 * runs the assembled client and asserts what only it shows — that a scripted
 * answer renders as the reader sees it, that a scripted tool call becomes a row
 * with its result, that the conversation never jumps or slides backward while
 * the answer streams in, that the send flight hands the reader's words over
 * without a blank frame, and that both palettes capture the README frame's own
 * picture with nothing personal in it. The `contract` scenario walks packages/contracts/src/table.ts against the same page, so
 * each host literal the skin depends on is checked where it lives (D44), and the
 * `importance` scenario holds every `!important` the skin writes to one the page
 * needs (packages/testing/importance.cjs, D51).
 *
 * This file is the runner: it boots each scenario's instance, samples the page
 * once per frame while the turn runs, and writes the evidence of a failure. The
 * scenarios are the table in packages/testing/scenarios.cjs.
 * Every scenario runs against its own scratch instance, so nothing a scenario
 * writes can reach another.
 *
 * Usage: node packages/testing/e2e.cjs [--scenario <name>[,<name>…]] [--headed] [--out <dir>] [--delay <ms>]
 *        scenarios: conversation, narrow, tool, scroll, readerScroll, send, processSummary, reasoningStream, contract, statsPosition, statsOverlay, sidebarRail, importance, remoteSettings, shots
 *        (default: every scenario but statsPosition and statsOverlay)
 */
'use strict'
const fs = require('node:fs')
const path = require('node:path')
const { start, openPage, waitForSkin, dismissOverlays, firstRunOverlayText } = require('./dsh-web.cjs')
const { MARKS } = require('./lane.cjs')
const { SCENARIOS } = require('./scenarios.cjs')
const { sendPrompt, waitForTurn } = require('./prompt.cjs')
const { startMockLlm } = require('./mock-llm.cjs')
const { loadModule } = require('../../scripts/shared/ts-module.cjs')

const ROOT = path.resolve(__dirname, '..', '..')
const DEFAULT_OUT = path.join(ROOT, '.debug', 'e2e', 'out')
/**
 * How long one scenario may take. A wait that never settles would otherwise hold
 * the run until the runner's own limit: this deadline writes the failure evidence
 * and stops the run instead. `DSH_E2E_DEADLINE_MS` shortens it, for trying the
 * watchdog itself.
 */
const SCENARIO_DEADLINE_MS = Number(process.env.DSH_E2E_DEADLINE_MS ?? '') || 3 * 60 * 1000

/**
 * What the page looked like when a scenario failed: a picture, the console
 * problems, and the markers a timeout usually turns on — the composer's own
 * value, the host flow rows that did appear, any overlay still open. The lane
 * writes these into its output directory, which CI keeps as an artifact.
 */
async function captureFailure(session, out, name) {
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
    }
  }).catch((error) => ({ error: String(error) }))
  const report = [
    `scenario: ${name}`,
    `problems (${session.problems.length}):`,
    ...session.problems.slice(0, 20).map((line) => `  ${line}`),
    `state: ${JSON.stringify(state, null, 2)}`,
  ].join('\n')
  fs.writeFileSync(path.join(out, `${name}-failure.txt`), `${report}\n`)
  process.stdout.write(`  failure evidence: ${file}\n`)
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
      const last = rows.length === 0 ? null : rows[rows.length - 1]
      frame.ghost = ghost !== null
      frame.echo = document.querySelector(host.echo) !== null || (last !== null && last.hasAttribute(host.echoAttribute))
      frame.ghostWords = words(ghost)
      frame.rows = rows.length
      frame.rowFlying = last !== null && last.hasAttribute(host.flyingMark)
      frame.rowVisible = visible(last)
      frame.rowWords = words(last)
      // The live turn's own status line at the end of the flow: the skin pins it
      // while the reader is at the tail, so its screen position is the check.
      const running = document.querySelector(host.running)
      frame.running = running === null ? null : Math.round(running.getBoundingClientRect().top)
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
  const mock = await startMockLlm({ script: scenario.script, delayMs: scenario.delayMs ?? options.delayMs })
  const patch = ['- id: llm-deepseek', '  config:', `    baseURL: ${mock.url}`, '    apiKeyEnv: DSH_E2E_MOCK_KEY', ...scenario.patch ?? []].join('\n')
  const host = await start({ patch, args: scenario.hostArgs, env: { DSH_E2E_MOCK_KEY: 'mock' }, home: options.home, resetState: true })
  process.stdout.write(`\n== ${name} ==  mock ${mock.url}  host ${host.url}\n`)
  /** Where the scenario is, so a hang in the log says which step it never left. */
  const step = (label) => process.stdout.write(`  · ${label}\n`)
  let session
  let expired = false
  const timer = setTimeout(() => { expired = true }, SCENARIO_DEADLINE_MS)
  try {
    session = await openPage(host.url, { headless: options.headed !== true, args: scenario.browserArgs, ...scenario.viewport })
    const { page } = session
    const body = (async () => {
      step('waiting for the skin')
      await waitForSkin(page)
      step('answering the first-run overlays')
      if (!(await dismissOverlays(page))) {
        const left = await firstRunOverlayText(page)
        throw new Error(`the shell left a first-run overlay open${left === '' ? '' : `: ${left}`}`)
      }
      const context = { page, session, url: host.url, trace: [], notes: {}, out: options.out }
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
      for (const item of checks) process.stdout.write(`  ${item.ok ? '✓' : '✗'} ${item.name}${item.detail === '' ? '' : `  — ${item.detail}`}\n`)
      const failed = checks.filter((item) => !item.ok).length
      if (expired) throw new Error(`scenario "${name}" overran its ${SCENARIO_DEADLINE_MS / 1000} s deadline`)
      return { scenario: name, checks, failed, requested: mock.requests.length, trace: context.trace, notes: context.notes }
    })()
    return await body
  } catch (error) {
    if (session !== undefined) await captureFailure(session, options.out, name).catch(() => {})
    if (expired) {
      // The hung step is still holding the page; the run stops here with the
      // evidence written above instead of waiting on the runner's own limit.
      process.stdout.write(`  scenario "${name}" passed its ${SCENARIO_DEADLINE_MS / 1000} s deadline; stopping the run\n`)
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
  }
}

async function main() {
  const args = process.argv.slice(2)
  const argOf = (flag) => {
    const at = args.indexOf(`--${flag}`)
    return at === -1 ? undefined : args[at + 1]
  }
  // The timing table names the scenarios that hold it (D44), so the two lists are
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
  const names = (argOf('scenario') ?? 'conversation,narrow,tool,send,scroll,readerScroll,processSummary,reasoningStream,sidebarRail,contract,importance,remoteSettings,shots').split(',').map((name) => name.trim()).filter(Boolean)
  const out = path.resolve(argOf('out') ?? DEFAULT_OUT)
  const options = {
    headed: args.includes('--headed'),
    delayMs: argOf('delay') === undefined ? undefined : Number(argOf('delay')),
    home: argOf('home'),
    out,
  }
  fs.mkdirSync(out, { recursive: true })
  // The first boot of the scratch host installs this checkout into the scratch
  // profile, which on a cold machine outlasts the waits a scenario makes on the
  // page. Booting once up front keeps that cost out of the first scenario.
  if (names.length > 1) {
    const warm = await start({ home: options.home, env: {}, resetState: false })
    warm.stop()
  }
  const results = []
  for (const name of names) {
    const result = await runScenario(name, options)
    fs.writeFileSync(path.join(out, `${name}.json`), `${JSON.stringify(result, null, 2)}\n`)
    results.push(result)
  }
  const failed = results.reduce((sum, result) => sum + result.failed, 0)
  process.stdout.write(`\n${failed === 0 ? 'E2E PASS' : 'E2E FAIL'} — ${results.length} scenarios, ${failed} failed checks; traces in ${out}\n`)
  // A scenario leaves a handle behind on a slow runner — the CI job walked every
  // scenario in minutes and then sat until its own cap, because the process had
  // finished and its event loop had not. The exit code is the result.
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
