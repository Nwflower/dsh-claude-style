#!/usr/bin/env node
/**
 * reader-view.cjs — the redraw tier's reading view, end to end (D45, D57).
 *
 * Its own module rather than a block inside packages/testing/e2e.cjs, which is
 * at its stop line (AGENTS.md).
 *
 * The scenario asks for the redraw tier and runs a turn whose script thinks
 * three times, calls two tools and writes an intermediate output before the
 * final answer. It asserts what only the assembled client shows: that the
 * plugin's own view replaces Chat in the session, that a new thought folds the
 * steps before it while the turn runs and new words fade in through the
 * highlights, and that a completed turn keeps only its answer, with the process
 * one press away.
 */
'use strict'
const { setWorkDetails } = require('./prompt.cjs')

/**
 * The figures a fold's summary carries, in order (`思考×2 · 输出×1` → `[2, 1]`).
 * The labels are the reader's own language, so a check reads the numbers.
 */
const counts = (summary) => (summary ?? '').split('·').map(part => Number((part.match(/\d+/) ?? [NaN])[0]))


/** Everything one reading of the view needs, straight from the page. */
const read = (page) => page.evaluate(() => {
  const reader = document.querySelector('.dsh-claude-reader')
  const text = (element) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim()
  const closed = document.querySelector('[data-dsh-claude-reader-fold="closed"]')
  return {
    present: reader !== null,
    inScroller: reader?.closest('[data-conversation-scroll]') !== null && reader !== null,
    column: reader?.querySelector('.dsh-claude-reader-column[data-chat-flow]') !== null && reader !== null,
    userRows: document.querySelectorAll('.dsh-claude-reader [data-chat-flow-kind="user"]').length,
    tailRows: document.querySelectorAll('.dsh-claude-reader [data-chat-flow-kind="turn-tail"]').length,
    answers: [...document.querySelectorAll('.dsh-claude-reader-answer')].map(text),
    closed: closed === null ? null : closed.querySelector('.dsh-claude-reader-fold-figures')?.getAttribute('aria-label') ?? null,
    expanded: document.querySelector('.dsh-claude-reader-status-lane button')?.getAttribute('aria-expanded') ?? null,
    tools: document.querySelectorAll('.dsh-claude-reader-tool').length,
    thoughts: document.querySelectorAll('.dsh-claude-reader-thought').length,
    // A finished turn's thoughts are one line each, until one is pressed open.
    thoughtLines: [...document.querySelectorAll('.dsh-claude-reader-thought-line-text')].map((line) => Math.round(line.getBoundingClientRect().height)),
    // Each reads "<label> · <text>" inside the thought's frame, which sets it apart from interim output.
    thoughtFrames: [...document.querySelectorAll('.dsh-claude-reader-thought-line')].map((line) => ({
      labelled: (line.textContent ?? '').includes(' · ') && (line.textContent ?? '').trim().length > 3,
      border: getComputedStyle(line).borderTopWidth,
    })),
    commentary: [...document.querySelectorAll('.dsh-claude-reader-commentary')].map(text),
    copy: document.querySelectorAll('.dsh-claude-reader-answer-actions button').length,
    hostRows: document.querySelectorAll('[data-chat-flow] > [data-chat-flow-kind]:not(.dsh-claude-reader *)').length,
    // The tabs a reader can see: the host's Chat registration beneath the view has none.
    tabs: [...document.querySelectorAll('[data-conversation-tabs] > [role="tab"]')].filter((tab) => tab.getClientRects().length > 0).map(text),
  }
})

function readerScenario({ check }) {
  return {
    script: 'process',
    prompt: 'look at the workspace',
    // Paced so each fold's whole sequence (shrink, count, pause, reveal) plays before the next step.
    delayMs: 300,
    patch: [
      '- id: ui-skin-claude-style',
      '  config:',
      '    chatAnimations: redraw',
    ],
    /**
     * The live turn passes too quickly for an after-the-fact poll, so the page
     * watches itself: the most live folds it held at once with their figures,
     * and whether a word ever faded through the highlights. The view mounts with
     * the session the prompt opens, so the watch starts on the empty page.
     */
    async beforeSend({ page }) {
      // The scratch home keeps whatever the host's work-details setting held
      // last: this scenario reads `detailed`, the Web client's own default.
      await setWorkDetails(page, 'detailed')
      await page.evaluate(() => {
        const seen = { folds: 0, figures: [], fading: false, waiting: false, statuses: [], statusLines: 0, statusInTurn: false, laneWhileOpen: false, wrappedStatus: false, thoughtCards: 0, cardChrome: false }
        window.__liveReader = seen
        const sample = () => {
          const folds = [...document.querySelectorAll('[data-dsh-claude-reader-fold="live"]')]
          seen.folds = Math.max(seen.folds, folds.length)
          for (const fold of folds) {
            const figures = fold.querySelector('.dsh-claude-reader-fold-figures')?.getAttribute('aria-label')
            if (figures && !seen.figures.includes(figures)) seen.figures.push(figures)
          }
          if (!seen.fading) seen.fading = [...CSS.highlights.keys()].some((name) => name.startsWith('dsh-claude-reader-fade-'))
          if (document.querySelector('.dsh-claude-reader [data-chat-running]') !== null) seen.waiting = true
          // Every live state is said by one line under the newest message, never at the top of the running turn.
          const lines = [...document.querySelectorAll('.dsh-claude-reader-live-status')]
          seen.statusLines = Math.max(seen.statusLines, lines.length)
          for (const line of lines) {
            if (line.closest('.dsh-claude-reader-turn') !== null) seen.statusInTurn = true
            const sizer = line.querySelector('.dsh-claude-reader-status-sizer')
            const status = line.querySelector('.dsh-claude-reader-status')
            const statusText = sizer?.textContent ?? ''
            if (statusText !== '' && !seen.statuses.includes(statusText)) seen.statuses.push(statusText)
            // A label that grows mid-swap must stay one line: the row is as tall as
            // the sizer and the copies hang outside it.
            const height = status === null ? 0 : parseFloat(getComputedStyle(status).lineHeight) || 24
            if ((sizer?.getBoundingClientRect().height ?? 0) > height + 2) seen.wrappedStatus = true
            for (const copy of line.querySelectorAll('.dsh-claude-reader-status-copy')) {
              if (copy.getBoundingClientRect().height > height + 2) seen.wrappedStatus = true
            }
          }
          if (document.querySelector('.dsh-claude-reader-turn[data-dsh-claude-reader-turn="open"] .dsh-claude-reader-status-lane') !== null) seen.laneWhileOpen = true
          // A live thought's card holds its text and nothing else: no label, step count or controls.
          for (const card of document.querySelectorAll('.dsh-claude-reader-thought')) {
            seen.thoughtCards += 1
            if (card.children.length !== 1 || card.querySelector('button') !== null) seen.cardChrome = true
          }
        }
        new MutationObserver(sample).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true })
        const tick = () => {
          sample()
          if (window.__liveReader === seen) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
    },
    async assert({ page, session }) {
      const live = await page.evaluate(() => {
        const seen = window.__liveReader
        window.__liveReader = null
        return seen ?? null
      })
      // The completed turn folds its process once the turn closes; the closing pass settles first.
      await page.waitForSelector('[data-dsh-claude-reader-fold="closed"]', { timeout: 20000 })
      await page.waitForTimeout(800)
      const folded = await read(page)
      await page.click('.dsh-claude-reader-status-lane button')
      await page.waitForTimeout(1200)
      const opened = await read(page)
      const lineHeight = () => page.evaluate(() => Math.round(document.querySelector('.dsh-claude-reader-thought-line')?.getBoundingClientRect().height ?? 0))
      const before = await lineHeight()
      await page.click('.dsh-claude-reader-thought-line-text')
      await page.waitForTimeout(500)
      const pressed = await page.evaluate(() => {
        const line = document.querySelector('.dsh-claude-reader-thought-line')
        return { open: line?.hasAttribute('data-dsh-claude-reader-open') ?? false, expanded: line?.querySelector('button')?.getAttribute('aria-expanded') ?? null }
      })
      pressed.grew = { before, after: await lineHeight() }
      return [
        check('the redraw tier puts the plugin\'s reading view in the session\'s scroller',
          folded.present && folded.inScroller && folded.column, JSON.stringify({ present: folded.present, inScroller: folded.inScroller, column: folded.column })),
        check('the host\'s Chat rows are not on the page while the reader is selected',
          folded.hostRows === 0, `hostRows=${folded.hostRows}`),
        check('the reader stands in Chat\'s place: the host\'s own Chat tab is not shown beside it',
          folded.tabs.length > 0 && new Set(folded.tabs).size === folded.tabs.length, JSON.stringify(folded.tabs)),
        check('while the turn ran, one status line under the newest message said every live state, the model\'s silence and the tools\' work alike',
          live !== null && live.statusLines === 1 && !live.statusInTurn && !live.laneWhileOpen && live.statuses.length >= 2,
          JSON.stringify(live && { lines: live.statusLines, inTurn: live.statusInTurn, lane: live.laneWhileOpen, statuses: live.statuses })),
        check('a label that grew mid-swap stayed one line, and the status line never wrapped',
          live !== null && live.wrappedStatus === false, JSON.stringify(live && { wrapped: live.wrappedStatus, statuses: live.statuses })),
        check('the reader\'s rows carry the host\'s row attributes',
          folded.userRows === 1 && folded.tailRows === 1, JSON.stringify({ user: folded.userRows, tail: folded.tailRows })),
        check('while the turn ran, each new thought folded the steps of its chain before it into one row',
          live !== null && live.folds === 1 && live.figures.length >= 1
            && live.figures.every((figures) => counts(figures).every((value) => Number.isFinite(value)))
            && live.figures.some((figures) => counts(figures).length >= 2 && counts(figures).every((value) => value > 0)),
          JSON.stringify(live)),
        check('new words faded in through the reader\'s highlights',
          live !== null && live.fading === true, JSON.stringify(live)),
        check('a completed turn keeps its final answer and folds the rest',
          folded.answers.length === 1 && folded.answers[0].includes('这是最终答案') && folded.tools === 0 && folded.thoughts === 0 && folded.commentary.length === 0,
          JSON.stringify({ answers: folded.answers, tools: folded.tools, thoughts: folded.thoughts, commentary: folded.commentary })),
        check('the closed turn\'s summary counts its thinking, its interim output and its tools',
          folded.closed !== null && counts(folded.closed).length === 3 && counts(folded.closed).every((value) => value > 0) && folded.expanded === 'false',
          JSON.stringify({ closed: folded.closed, counts: counts(folded.closed), expanded: folded.expanded })),
        check('the finished answer carries its actions',
          folded.copy >= 1, `copy=${folded.copy}`),
        check('a live thought\'s card holds only its text',
          live !== null && live.thoughtCards > 0 && !live.cardChrome, JSON.stringify(live && { cards: live.thoughtCards, chrome: live.cardChrome })),
        check('opening the status line lays the process out again, each thought on one line',
          opened.expanded === 'true' && opened.tools === 2 && opened.thoughts === 0 && opened.thoughtLines.length === 3 && opened.thoughtLines.every((height) => height > 0 && height <= 26)
            && opened.commentary.some((line) => line.includes('先记一句中间结论')),
          JSON.stringify({ expanded: opened.expanded, tools: opened.tools, thoughts: opened.thoughts, lines: opened.thoughtLines, commentary: opened.commentary })),
        check('a folded thought reads its label and text inside the thought\'s frame',
          opened.thoughtFrames.length === 3 && opened.thoughtFrames.every((frame) => frame.labelled && frame.border === '1px'), JSON.stringify(opened.thoughtFrames)),
        check('pressing a thought\'s line opens its whole text and grows its frame',
          pressed.open && pressed.expanded === 'true' && pressed.grew.after > pressed.grew.before, JSON.stringify(pressed)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { readerScenario }
