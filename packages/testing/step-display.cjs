#!/usr/bin/env node
/**
 * step-display.cjs — the reading view under the host's work-details modes (D45,
 * D57).
 *
 * Its own module rather than a block inside packages/testing/e2e.cjs, which is
 * at its stop line (AGENTS.md).
 *
 * The first turn runs in whatever mode the host already holds; the scenario
 * then puts the host's `ui-chat` work-details setting in each remaining mode —
 * through the settings service, the only handle the page half has — and reads
 * what the reader does with it: `compact` gathers a whole turn into one summary
 * row while it runs, `detailed` leaves the intermediate output as a row of its
 * own, and `verbose` shows a thought in a fold as its whole text. It also holds
 * the reader's own rows: a thought's line toggles from its text in both
 * directions, and a tool's details never open on their own.
 */
'use strict'
const { sendPrompt, waitForTurn, setWorkDetails } = require('./prompt.cjs')

/** Put the host in one work-details mode, through the settings service. */
const setMode = (page, mode) => setWorkDetails(page, mode)

/** The figures a fold's summary carries, in order (`思考×2 · 输出×1` → `[2, 1]`); the labels are the reader's own language. */
const counts = (summary) => (summary ?? '').split('·').map(part => Number((part.match(/\d+/) ?? [NaN])[0]))

/** Read the newest turn — the open one while a turn runs — and the rows its process lays out. */
const readTurn = (page) => page.evaluate(() => {
  const text = (element) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim()
  const turn = [...document.querySelectorAll('.dsh-claude-reader-turn')].at(-1) ?? null
  const within = (selector) => [...(turn?.querySelectorAll(selector) ?? [])]
  return {
    open: turn?.getAttribute('data-dsh-claude-reader-turn') === 'open',
    mode: document.body.getAttribute('data-dsh-claude-step-display'),
    status: text(turn?.querySelector('.dsh-claude-reader-status-sizer')),
    folds: within('[data-dsh-claude-reader-fold]').length,
    summaries: within('.dsh-claude-reader-fold-figures').map(element => element.getAttribute('aria-label')),
    thoughtLines: within('.dsh-claude-reader-thought-line').map(line => text(line.querySelector('.dsh-claude-reader-thought-line-text'))),
    thoughtCards: within('.dsh-claude-reader-thought').length,
    toolRows: within('.dsh-claude-reader-tool-row').map(row => row.getAttribute('aria-expanded')),
  }
})

/** A live turn watched from the page: the most live folds it ever held at once, reset per turn. */
const WATCH = () => {
  const seen = { folds: 0 }
  const sample = () => {
    seen.folds = Math.max(seen.folds, document.querySelectorAll('[data-dsh-claude-reader-fold="live"]').length)
  }
  const watch = { current: seen, reset: () => { seen.folds = 0 } }
  window.__stepDisplayWatch = watch
  new MutationObserver(sample).observe(document.body, { subtree: true, childList: true, characterData: true })
  sample()
}

/** The newest turn, open while one runs, is the last of its kind on the page. */
const NEWEST = '.dsh-claude-reader-turn:last-of-type'

/** Open the newest turn's process, then read the rows it lays out once they have settled. */
async function openTurnProcess(page) {
  const button = page.locator(`${NEWEST} .dsh-claude-reader-status-lane button`).last()
  const expanded = () => page.evaluate(() => [...document.querySelectorAll('.dsh-claude-reader-turn')].at(-1)
    ?.querySelector('.dsh-claude-reader-status-lane button')?.getAttribute('aria-expanded') === 'true')
  const count = () => page.evaluate(() => {
    const turn = [...document.querySelectorAll('.dsh-claude-reader-turn')].at(-1)
    return turn?.querySelectorAll('.dsh-claude-reader-thought-line, .dsh-claude-reader-thought, .dsh-claude-reader-tool-row').length ?? 0
  })
  // A finished turn's process stands folded: its own lane line opens it, and a
  // press that landed while the lane was still moving is taken again.
  for (let attempt = 0; attempt < 3 && !await expanded() && await button.count() > 0; attempt++) {
    await button.click().catch(() => {})
    await page.waitForTimeout(600)
  }
  // The rows arrive one at a time as the process opens: read the count that holds.
  let previous = -1
  for (let attempt = 0; attempt < 8; attempt++) {
    const now = await count()
    if (now > 0 && now === previous) break
    previous = now
    await page.waitForTimeout(350)
  }
  return readTurn(page)
}

/** Wait until the newest turn's own state has settled: the last turn on the page is closed. */
const waitForTurnClosed = (page) => page.waitForFunction(
  () => [...document.querySelectorAll('.dsh-claude-reader-turn')].at(-1)?.getAttribute('data-dsh-claude-reader-turn') === 'closed',
  undefined, { timeout: 20000 },
).catch(() => {})

function stepDisplayScenario({ check }) {
  return {
    script: 'process',
    prompt: 'look at the workspace',
    delayMs: 250,
    patch: [
      '- id: ui-skin-claude-style',
      '  config:',
      '    chatAnimations: redraw',
    ],
    /** The opening turn runs in `detailed`, so the baseline is the same whatever the host last held. */
    async beforeSend({ page }) {
      await setWorkDetails(page, 'detailed')
      await page.evaluate(WATCH)
    },
    async assert({ page, session }) {
      /** The live-fold count of the turn that opens next; one watch serves every turn. */
      const resetWatch = () => page.evaluate(() => window.__stepDisplayWatch?.reset())
      const liveFolds = () => page.evaluate(() => window.__stepDisplayWatch?.current.folds ?? null)
      // The opening turn was watched from the page as it ran.
      const live = await liveFolds()
      await waitForTurnClosed(page)
      const baseline = await openTurnProcess(page)

      // Each mode is written through the host's settings service and awaited,
      // so the reading view holds it before the turn that shows it opens.
      const compactMode = await setMode(page, 'compact')
      await resetWatch()
      await sendPrompt(page, 'look again')
      await page.waitForFunction(() => document.querySelector('[data-dsh-claude-reader-turn="open"]') !== null, undefined, { timeout: 30000 }).catch(() => {})
      await page.waitForTimeout(1200)
      const compactWatch = await page.evaluate(() => window.__stepDisplayWatch?.current ?? null)
      const compactMid = await readTurn(page)
      await waitForTurn(page)
      await waitForTurnClosed(page)
      const compactLive = await liveFolds()
      const compact = await readTurn(page)

      const detailedMode = await setMode(page, 'detailed')
      await resetWatch()
      await sendPrompt(page, 'and again')
      await page.waitForFunction(() => document.querySelector('[data-dsh-claude-reader-turn="open"]') !== null, undefined, { timeout: 30000 }).catch(() => {})
      await page.waitForTimeout(1200)
      const detailedWatch = await page.evaluate(() => window.__stepDisplayWatch?.current ?? null)
      const detailedMid = await readTurn(page)
      await waitForTurn(page)
      await waitForTurnClosed(page)
      const detailedLive = await liveFolds()
      const detailed = await openTurnProcess(page)
      const toggle = await page.evaluate(() => {
        const turn = [...document.querySelectorAll('.dsh-claude-reader-turn[data-dsh-claude-reader-turn="closed"]')].at(-1)
        const line = turn?.querySelector('.dsh-claude-reader-thought-line')
        const text = line?.querySelector('.dsh-claude-reader-thought-line-text')
        if (line === null || line === undefined || text === null || text === undefined) return null
        const before = line.hasAttribute('data-dsh-claude-reader-open')
        text.click()
        return { before }
      })
      await page.waitForTimeout(400)
      const opened = await page.evaluate(() => [...document.querySelectorAll('.dsh-claude-reader-turn[data-dsh-claude-reader-turn="closed"]')].at(-1)?.querySelector('.dsh-claude-reader-thought-line')?.hasAttribute('data-dsh-claude-reader-open') ?? null)
      await page.evaluate(() => [...document.querySelectorAll('.dsh-claude-reader-turn[data-dsh-claude-reader-turn="closed"]')].at(-1)?.querySelector('.dsh-claude-reader-thought-line-text')?.click())
      await page.waitForTimeout(400)
      const closedAgain = await page.evaluate(() => [...document.querySelectorAll('.dsh-claude-reader-turn[data-dsh-claude-reader-turn="closed"]')].at(-1)?.querySelector('.dsh-claude-reader-thought-line')?.hasAttribute('data-dsh-claude-reader-open') ?? null)

      const verboseMode = await setMode(page, 'verbose')
      await page.evaluate(WATCH)
      await sendPrompt(page, 'once more')
      await waitForTurn(page)
      await waitForTurnClosed(page)
      const verbose = await openTurnProcess(page)

      return [
        check('the host\'s work-details setting is mirrored onto the page and followed',
          compactMode && detailedMode && verboseMode && compact.mode === 'compact' && detailed.mode === 'detailed' && verbose.mode === 'verbose',
          JSON.stringify({ compactMode, detailedMode, verboseMode, modes: [compact.mode, detailed.mode, verbose.mode] })),
        check('a completed turn folds its process into one summary row, and its thoughts read one line each',
          baseline.folds === 1 && baseline.summaries.length === 1 && counts(baseline.summaries[0]).length === 3 && counts(baseline.summaries[0]).every(value => value > 0)
            && baseline.thoughtLines.length >= 1 && baseline.thoughtLines.every(line => line.includes(' · ')),
          JSON.stringify({ folds: baseline.folds, summaries: baseline.summaries, lines: baseline.thoughtLines, cards: baseline.thoughtCards })),
        check('compact gathers a whole turn into one summary row while it runs',
          compactWatch !== null && compactWatch.folds === 1 && compactMid.folds === 1 && compact.folds === 1
            && compactMid.summaries.length === 1,
          JSON.stringify({ watch: compactWatch, compactLive, mid: compactMid.folds, folds: compact.folds, summaries: compact.summaries })),
        check('detailed leaves the intermediate output as a row of its own',
          detailedWatch !== null && detailedWatch.folds === 1 && detailedMid.folds === 1
            && detailed.summaries.length === 1 && counts(detailed.summaries[0]).length === 2 && detailed.thoughtLines.length > 0,
          JSON.stringify({ watch: detailedWatch, live: detailedLive, summaries: detailed.summaries, mid: detailedMid, lines: detailed.thoughtLines })),
        check('a thought\'s line toggles from its own text, both ways',
          toggle !== null && toggle.before === false && opened === true && closedAgain === false,
          JSON.stringify({ toggle, opened, closedAgain })),
        check('verbose shows a thought in a fold as its whole text, and opens no tool by itself',
          verbose.thoughtCards >= 1 && verbose.thoughtLines.length === 0 && verbose.toolRows.every(value => value === 'false'),
          JSON.stringify({ cards: verbose.thoughtCards, lines: verbose.thoughtLines, tools: verbose.toolRows })),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { stepDisplayScenario }
