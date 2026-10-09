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
      await page.evaluate(() => {
        const seen = { folds: 0, figures: [], fading: false, waiting: false, statuses: [], statusLines: 0, statusInTurn: false, laneWhileOpen: false }
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
            const status = line.querySelector('.dsh-claude-reader-status-sizer')?.textContent ?? ''
            if (status !== '' && !seen.statuses.includes(status)) seen.statuses.push(status)
          }
          if (document.querySelector('.dsh-claude-reader-turn[data-dsh-claude-reader-turn="open"] .dsh-claude-reader-status-lane') !== null) seen.laneWhileOpen = true
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
      return [
        check('the redraw tier puts the plugin\'s reading view in the session\'s scroller',
          folded.present && folded.inScroller && folded.column, JSON.stringify({ present: folded.present, inScroller: folded.inScroller, column: folded.column })),
        check('the host\'s Chat rows are not on the page while the reader is selected',
          folded.hostRows === 0, `hostRows=${folded.hostRows}`),
        check('the reader stands in Chat\'s place: the host\'s own Chat tab is not shown beside it',
          folded.tabs.filter((label) => label === folded.tabs[0]).length === 1 && !folded.tabs.slice(1).includes('对话'), JSON.stringify(folded.tabs)),
        check('while the turn ran, one status line under the newest message said every live state, the model\'s silence and the tools\' work alike',
          live !== null && live.statusLines === 1 && !live.statusInTurn && !live.laneWhileOpen && live.statuses.length >= 2,
          JSON.stringify(live && { lines: live.statusLines, inTurn: live.statusInTurn, lane: live.laneWhileOpen, statuses: live.statuses })),
        check('the reader\'s rows carry the host\'s row attributes',
          folded.userRows === 1 && folded.tailRows === 1, JSON.stringify({ user: folded.userRows, tail: folded.tailRows })),
        check('while the turn ran, each new thought folded the steps of its chain before it into one row',
          live !== null && live.folds === 1 && live.figures.includes('思考×1 · 工具×1') && live.figures.includes('思考×2 · 输出×1 · 工具×2'),
          JSON.stringify(live)),
        check('new words faded in through the reader\'s highlights',
          live !== null && live.fading === true, JSON.stringify(live)),
        check('a completed turn keeps its final answer and folds the rest',
          folded.answers.length === 1 && folded.answers[0].includes('这是最终答案') && folded.tools === 0 && folded.thoughts === 0 && folded.commentary.length === 0,
          JSON.stringify({ answers: folded.answers, tools: folded.tools, thoughts: folded.thoughts, commentary: folded.commentary })),
        check('the closed turn\'s summary counts its thinking, its interim output and its tools',
          folded.closed === '思考×3 · 输出×1 · 工具×2' && folded.expanded === 'false', JSON.stringify({ closed: folded.closed, expanded: folded.expanded })),
        check('the finished answer carries its actions',
          folded.copy >= 1, `copy=${folded.copy}`),
        check('opening the status line lays the process out again',
          opened.expanded === 'true' && opened.tools === 2 && opened.thoughts === 3 && opened.commentary.some((line) => line.includes('先记一句中间结论')),
          JSON.stringify({ expanded: opened.expanded, tools: opened.tools, thoughts: opened.thoughts, commentary: opened.commentary })),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { readerScenario }
