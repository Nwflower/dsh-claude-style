#!/usr/bin/env node
/**
 * process-summary.mjs — the enhanced tier's waiting line and counted process
 * headers on the real host (D74, D92).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.mjs).
 *
 * The `process` script keeps the model silent past the overtime mark before its
 * first event, then runs two rounds of a thought and a tool call around an
 * intermediate note. While the turn waits, the running row has to carry the
 * skin's line with the turn's clock and the overtime badge; once the model
 * writes, the badge leaves. After the turn, every process group's header has to
 * name what the group holds in figures, the host's own words out of sight.
 */

/**
 * The shipped copy, so the assertions read the words the page is in rather than
 * one language: the lane runs under whatever locale the machine has, and the
 * host's own word for the fallback is read off the page itself. The waiting
 * line's words belong to chat-wait and the counted headers' to chat-fold (D72).
 */
import waitCopy from '../../client/src/features/chat-wait/chat-wait.copy.json' with { type: 'json' }
import foldCopy from '../../client/src/features/chat-fold/chat-fold.copy.json' with { type: 'json' }

const COPY = {
  ...waitCopy,
  ...foldCopy,
}

const fill = (template, count) => template.replace('{count}', String(count))

/** What the reader sees of the running row: the skin's line, its parts, and the host's words. */
const readWait = (page) => page.evaluate(() => {
  const row = document.querySelector('[data-chat-running]')
  const line = row === null ? null : row.querySelector('.dsh-claude-chat-wait')
  const words = row === null ? null : row.querySelector(':scope > span > :not([aria-hidden="true"])')
  if (line === null) return { row: row !== null, line: false }
  // The line's parts are read by their own names rather than by position: the
  // loader leads them (chat-wait.css), and where each of the rest sits is the
  // stylesheet's business.
  const label = line.querySelector('.dsh-claude-chat-wait-label')
  const clock = line.querySelector('.dsh-claude-chat-wait-clock')
  const badge = line.querySelector('.dsh-claude-chat-wait-badge')
  return {
    row: true,
    line: true,
    // The wording this line is on: the label holds a hidden sizer and, while a
    // wording swaps, two copies of the words, so its raw text joins them.
    // `data-text` names the wording the line committed to, which is what a state
    // is judged on (shared/swapping-text.ts).
    label: label.dataset.text ?? '',
    labelText: label.textContent,
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
      // languages the copy document carries. Any of the states answers it, since
      // the reading may be taken while the line is on any of them.
      const stateWords = [COPY.chatWaitThinking, COPY.chatWaitWriting, COPY.chatWaitToolCall, COPY.chatWaitTools]
      const lang = stateWords.some((word) => word.zh === working.label) ? 'zh' : 'en'
      const sentence = (parts) => parts.join(COPY.processSummaryFullSeparator[lang])
      const expected = [
        sentence([fill(COPY.processSummaryFullThoughtOther[lang], 2), fill(COPY.processSummaryFullToolOne[lang], 1)]),
        sentence([fill(COPY.processSummaryFullThoughtOne[lang], 1), fill(COPY.processSummaryFullToolOne[lang], 1)]),
      ]
      return [
        check('the running row carries the skin\'s line in place of the host\'s words',
          early.line === true && early.wordsShown === false, JSON.stringify(early)),
        // The brand in force here is the Claude one, whose wait word is the
        // skin's own: the host's own words under the line are not what stands
        // (shared/turn-activity.ts, one word per brand).
        check('a wait nothing can be read from stands on the brand\'s own word, not the host\'s',
          [COPY.chatWaitThinking.zh, COPY.chatWaitThinking.en].includes(early.label ?? '') &&
            (early.words ?? '').includes(early.label ?? '') === false,
          JSON.stringify({ label: early.label, words: early.words })),
        check('the line keeps the turn\'s clock in the host\'s units', /^\d+\s*(s|sec|secs|second|seconds|秒)$/i.test(early.clock ?? ''), JSON.stringify(early.clock)),
        check('past ten seconds of silence the line says the model has not answered', overtime.badge === COPY.chatWaitOvertime[lang], JSON.stringify(overtime)),
        check('the badge leaves once the model writes', working.line === true && working.badge === null, JSON.stringify(working)),
        check('the line says what the model is doing once it writes',
          [COPY.chatWaitThinking[lang], COPY.chatWaitWriting[lang], COPY.chatWaitToolCall[lang], COPY.chatWaitTools[lang]].includes(working.label ?? ''),
          JSON.stringify({ label: working.label, labelText: working.labelText, lang })),
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

export { processSummaryScenario }
