#!/usr/bin/env node
/**
 * reasoning-stream.cjs — the reasoning's streamed window, end to end (D45).
 *
 * Its own module rather than a block inside packages/testing/e2e.cjs, which is
 * at its stop line (AGENTS.md).
 *
 * The `think` script reasons a couple of lines at a time for several seconds.
 * While that runs, the host's slot for the reasoning body has to stand in the
 * window transitions.dev's "Reasoning stream" describes — a few lines tall,
 * masked at both edges — and the text inside it has to step up on that snippet's
 * clock without ever passing the newest line. Once the reasoning stops the
 * window has to come off, leaving the whole text for the reader who opens the
 * row.
 */
'use strict'

/** The thinking row and the reasoning body it holds. */
const HOST = {
  row: '[data-variant="think"]',
  slot: '[data-slot="conversation.chat.reasoning.body"]',
  text: '[data-markdown-variant]',
}

/** What the window looks like right now, in one reading. */
const read = (page) => page.evaluate((host) => {
  const row = document.querySelector(host.row)
  const slot = row === null ? null : row.querySelector(host.slot)
  const text = slot === null ? null : slot.querySelector(host.text)
  if (slot === null || text === null) return { row: row !== null, windowed: false }
  const style = getComputedStyle(slot)
  const mask = style.maskImage === 'none' ? style.webkitMaskImage : style.maskImage
  const matrix = /matrix\(1, 0, 0, 1, 0, (-?[\d.]+)\)/.exec(getComputedStyle(text).transform)
  return {
    row: true,
    phase: row.getAttribute('data-state'),
    expanded: row.hasAttribute('data-expanded'),
    windowed: slot.hasAttribute('data-dsh-claude-reason-window'),
    slotHeight: Math.round(slot.getBoundingClientRect().height),
    maxHeight: style.maxHeight,
    masked: mask.startsWith('linear-gradient'),
    textHeight: Math.round(text.getBoundingClientRect().height),
    offset: matrix === null ? 0 : -Number(matrix[1]),
    lineHeight: Math.round(Number.parseFloat(getComputedStyle(text).lineHeight)),
  }
}, HOST)

/**
 * Open one row of the finished turn when it stands folded, the way a reader
 * does. A control that never appears, or one that cannot be pressed, is left
 * alone: the reading that follows says what was found.
 */
async function openWhenFolded(page, selector, attribute = 'aria-expanded') {
  const control = page.locator(selector).first()
  if ((await control.count()) === 0) return false
  const state = await control.getAttribute(attribute)
  if (state !== 'false') return true
  try {
    await control.click({ timeout: 2000 })
    return true
  } catch {
    return false
  }
}

function reasoningStreamScenario({ check }) {
  return {
    script: 'think',
    prompt: 'think it through',
    delayMs: 700,
    /** Sample the window every 250 ms while the model reasons. */
    async duringTurn(context) {
      const { page } = context
      await page.waitForFunction((host) => {
        const slot = document.querySelector(host.slot)
        return slot !== null && slot.hasAttribute('data-dsh-claude-reason-window')
      }, HOST, { timeout: 40000 })
      const samples = []
      for (let round = 0; round < 26; round += 1) {
        samples.push(await read(page))
        await page.waitForTimeout(250)
      }
      context.notes.samples = samples.filter((sample) => sample.windowed === true)
    },
    /** Once the reasoning is over, the reader opens the row and reads it whole. */
    async afterTurn(context) {
      const { page } = context
      await page.waitForFunction((host) => {
        const row = document.querySelector(host.row)
        return row !== null && row.getAttribute('data-state') !== 'running'
      }, HOST, { timeout: 30000 })
      // The finished turn keeps its work under two of the host's own controls in
      // the tiers that cap it: the turn's process, then the group holding the row.
      const turnControl = page.locator('button[data-turn-process]').first()
      if ((await turnControl.count()) > 0 && (await turnControl.isEnabled())) {
        await turnControl.click().catch(() => {})
        await page.waitForTimeout(300)
      }
      await openWhenFolded(page, 'button[data-process-activity]')
      await page.waitForTimeout(300)
      await openWhenFolded(page, `${HOST.row} [role="button"][aria-expanded]`)
      await page.waitForTimeout(400)
      context.notes.standing = await read(page)
    },
    async assert({ session, notes }) {
      const samples = notes.samples ?? []
      const standing = notes.standing ?? {}
      const first = samples[0] ?? {}
      const offsets = samples.map((sample) => sample.offset)
      const step = (first.lineHeight ?? 0) * 2
      // The text keeps growing while the window steps, so what the window can
      // reach is measured against the tallest the text stood while it was read.
      const tallest = samples.reduce((most, sample) => Math.max(most, sample.textHeight ?? 0), 0)
      const reachable = Math.max(0, tallest - (first.slotHeight ?? 0))
      return [
        check('正在推理时，文本站在一个几行高的窗口里，上下边缘带遮罩',
          samples.length > 2 && samples.every((sample) => sample.windowed === true && sample.masked === true) &&
            first.slotHeight === (first.lineHeight ?? 0) * 4 && first.maxHeight === `${first.slotHeight}px`,
          JSON.stringify({ samples: samples.length, first })),
        check('窗口里的文本按两行一步往上走，从不停在整步上（过渡真的在跑）',
          offsets.length > 2 && Math.max(...offsets) > 0 &&
            offsets.some((offset) => Math.round(offset) % (step === 0 ? 1 : step) !== 0),
          JSON.stringify({ offsets: offsets.slice(0, 8), step })),
        check('走到的位置不超过内容的末尾，最新一行始终留在窗口里',
          offsets.length > 0 && offsets.every((offset) => offset <= reachable + 0.5) &&
            Math.max(...offsets) >= reachable - step,
          JSON.stringify({ max: Math.max(...offsets), reachable, step })),
        check('推理结束后窗口撤下，读者打开这一行读到的是完整文本',
          standing.windowed === false && standing.offset === 0 && standing.masked === false &&
            standing.textHeight > (standing.lineHeight ?? 0) * 4,
          JSON.stringify(standing)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { reasoningStreamScenario }
