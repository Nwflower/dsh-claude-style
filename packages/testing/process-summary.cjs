#!/usr/bin/env node
/**
 * process-summary.cjs — the enhanced tier's waiting line and counted process
 * headers on the real host (D32, D45).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.cjs).
 *
 * The `process` script keeps the model silent past the overtime mark before its
 * first event, then runs two rounds of a thought and a tool call around an
 * intermediate note. While the turn waits, the running row has to carry the
 * skin's line with the turn's clock and the overtime badge; once the model
 * writes, the badge leaves. After the turn, every process group's header has to
 * name what the group holds in figures, the host's own words out of sight.
 */
'use strict'

/**
 * The shipped copy, so the assertions read the words the page is in rather than
 * one language: the lane runs under whatever locale the machine has, and the
 * host's own word for the fallback is read off the page itself.
 */
const COPY = require('../client/data/model-descriptions.json').ui

/** One template with its count filled in. */
const fill = (template, count) => template.replace('{count}', String(count))

/** What the reader sees of the running row: the skin's line, its parts, and the host's words. */
const readWait = (page) => page.evaluate(() => {
  const row = document.querySelector('[data-chat-running]')
  const line = row === null ? null : row.querySelector('.dsh-claude-chat-wait')
  const words = row === null ? null : row.querySelector(':scope > span > :not([aria-hidden="true"])')
  if (line === null) return { row: row !== null, line: false }
  const [label, clock, badge] = line.children
  return {
    row: true,
    line: true,
    label: label.textContent,
    clock: clock.checkVisibility() ? clock.textContent : null,
    badge: badge.checkVisibility() ? badge.textContent : null,
    words: words === null ? null : words.textContent,
    wordsShown: words !== null && words.checkVisibility(),
  }
})

/**
 * Every process group's header: its name, the wording it draws and the room it
 * had for it. The host's words and the summary are read by their own computed
 * display, which answers the same however the turn's own process stands.
 */
const readHeaders = (page) => page.evaluate(() => [...document.querySelectorAll('[data-step-process]')].map((group) => {
  const header = group.querySelector('button[data-process-activity]')
  const summary = header?.querySelector('.dsh-claude-process-summary') ?? null
  // The host's words are the one child of the control it does not mark
  // decorative; the icon and the chevron sit in an aria-hidden span, and the
  // summary is the skin's own.
  const words = header === null ? null : [...header.children].find((child) => child.getAttribute('aria-hidden') !== 'true') ?? null
  const text = summary === null ? null : [...summary.querySelectorAll('.dsh-claude-process-summary-part')].map((part) => {
    const parts = part.querySelectorAll('.dsh-claude-process-summary-words')
    const digit = part.querySelector('.dsh-claude-process-summary-roll [data-dsh-claude-roll]:not([data-dsh-claude-roll="exit"])')
    return `${parts[0].textContent}${digit === null ? '' : digit.textContent}${parts[1].textContent}`
  }).join('')
  return {
    name: header?.getAttribute('aria-label') ?? null,
    form: summary?.getAttribute('data-dsh-claude-summary-form') ?? null,
    text,
    headerWidth: header === null ? null : Math.round(header.clientWidth),
    summaryWidth: summary === null ? null : Math.round(summary.clientWidth),
    summaryDisplay: summary === null ? null : getComputedStyle(summary).display,
    wordsDisplay: words === null ? null : getComputedStyle(words).display,
  }
}))

function processSummaryScenario({ check }) {
  return {
    script: 'process',
    prompt: 'look around',
    delayMs: 300,
    async duringTurn(context) {
      const { page } = context
      // The model holds its first event for 11.5 s: the badge rises at 10 s.
      await page.waitForFunction(() => document.querySelector('[data-chat-running] .dsh-claude-chat-wait') !== null, undefined, { timeout: 15000 })
      context.notes.waitEarly = await readWait(page)
      await page.waitForFunction(() => {
        const badge = document.querySelector('[data-chat-running] .dsh-claude-chat-wait-badge')
        return badge !== null && badge.checkVisibility()
      }, undefined, { timeout: 15000 }).catch(() => {})
      context.notes.waitOvertime = await readWait(page)
      await page.waitForFunction(() => document.querySelector('[data-step-process]') !== null, undefined, { timeout: 15000 })
      await page.waitForTimeout(300)
      context.notes.waitWorking = await readWait(page)
    },
    async afterTurn(context) {
      const { page } = context
      // The tiers that cap the body fold the finished turn's process under the
      // host's own control, which is what opens the groups; the detailed tier
      // keeps them open and disables that control.
      const control = page.locator('button[data-turn-process]')
      if (await control.isEnabled()) await control.click()
      await page.waitForTimeout(500)
      context.notes.headers = await readHeaders(page)
    },
    async assert({ session, notes }) {
      const early = notes.waitEarly ?? {}
      const overtime = notes.waitOvertime ?? {}
      const working = notes.waitWorking ?? {}
      const headers = notes.headers ?? []
      // The page's own language, read off the line the skin wrote: the same two
      // languages the copy document carries.
      const lang = working.label === COPY.turnStatusThinking.zh ? 'zh' : 'en'
      const sentence = (parts) => parts.join(COPY.processSummaryFullSeparator[lang])
      const expected = [
        sentence([fill(COPY.processSummaryFullThoughtOther[lang], 2), fill(COPY.processSummaryFullToolOne[lang], 1)]),
        sentence([fill(COPY.processSummaryFullThoughtOne[lang], 1), fill(COPY.processSummaryFullToolOne[lang], 1)]),
      ]
      return [
        check('the running row carries the skin\'s line in place of the host\'s words',
          early.line === true && early.wordsShown === false, JSON.stringify(early)),
        check('a turn whose state cannot be read falls back to the host\'s own word',
          (early.label ?? '') !== '' && (early.words ?? '').startsWith(early.label), JSON.stringify({ label: early.label, words: early.words })),
        check('the line keeps the turn\'s clock in the host\'s units', /^\d+\s*(s|sec|secs|second|seconds|秒)$/i.test(early.clock ?? ''), JSON.stringify(early.clock)),
        check('past ten seconds of silence the line says the model has not answered', overtime.badge === COPY.chatWaitOvertime[lang], JSON.stringify(overtime)),
        check('the badge leaves once the model writes', working.line === true && working.badge === null, JSON.stringify(working)),
        check('the line says what the model is doing once it writes',
          [COPY.turnStatusThinking[lang], COPY.turnStatusWriting[lang], COPY.turnStatusToolCall[lang], COPY.turnStatusTools[lang]].includes(working.label ?? ''),
          JSON.stringify({ label: working.label, lang })),
        check('every process group\'s header says what it holds, the host\'s words out of sight',
          headers.length === 2 && headers.every((header) => header.summaryDisplay !== 'none' && header.wordsDisplay === 'none'),
          JSON.stringify(headers)),
        check('the sentence stands in a header with room for it, naming the thoughts and the tool calls',
          JSON.stringify(headers.map((header) => header.name)) === JSON.stringify(expected) &&
            headers.every((header) => header.form === 'full') && headers[0]?.text === expected[0],
          JSON.stringify({ expected, got: headers.map((header) => ({ form: header.form, text: header.text, name: header.name })) })),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { processSummaryScenario }
