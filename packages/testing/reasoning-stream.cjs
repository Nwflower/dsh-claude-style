#!/usr/bin/env node
/**
 * reasoning-stream.cjs — the reasoning's streamed window, end to end (D45).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.cjs).
 *
 * The `think` script reasons a couple of steps at a time for half a minute. While
 * that runs, the host's slot for the reasoning body has to stand in a window that
 * grows with the text and stops at the cap reasoning may reach — the height the
 * open row keeps once the turn settles — and once it stands at that cap the text
 * inside it has to step up on the snippet's clock behind the mask without ever
 * passing the newest line. Once the reasoning stops the window has to come off,
 * leaving the whole text for the reader who opens the row. The `think` script is
 * written to run past that cap on the lane's own column width.
 */
'use strict'

/** The thinking row, the window the module puts on it and the text it slides. */
const HOST = {
  row: '[data-variant="think"]',
  windowed: '[data-variant="think"] [data-dsh-claude-reason-window]',
  text: '[data-markdown-variant]',
}

/**
 * What the window looks like right now, in one reading.
 *
 * The row that carries the window is read where there is one, so a finished
 * turn's own thinking rows cannot answer for the running one. With the window
 * off, the reading is of the host's own body, so the same numbers answer the
 * state after the reasoning: the whole text, no mask.
 */
const read = (page) => page.evaluate((host) => {
  const row = document.querySelector(host.row)
  if (row === null) return { row: false, windowed: false }
  const window = row.querySelector('[data-dsh-claude-reason-window]')
  const scope = window ?? row
  const text = scope.querySelector(host.text)
  if (text === null) return { row: true, windowed: window !== null }
  const style = getComputedStyle(scope)
  const mask = style.maskImage === 'none' ? style.webkitMaskImage : style.maskImage
  const matrix = /matrix\(1, 0, 0, 1, 0, (-?[\d.]+)\)/.exec(getComputedStyle(text).transform)
  return {
    row: true,
    phase: row.getAttribute('data-state'),
    expanded: row.hasAttribute('data-expanded'),
    windowed: window !== null,
    capped: window !== null && window.hasAttribute('data-dsh-claude-reason-capped'),
    slotHeight: Math.round(scope.getBoundingClientRect().height),
    masked: mask.startsWith('linear-gradient'),
    textHeight: Math.round(text.getBoundingClientRect().height),
    offset: matrix === null ? 0 : -Number(matrix[1]),
    lineHeight: Math.round(Number.parseFloat(getComputedStyle(text).lineHeight)),
  }
}, HOST)

/**
 * The height the open row may reach: the host's own cap on the process group's
 * body, which the window stops at and which the row keeps once the window comes
 * off. The reading needs no window on the page, so it is taken on both sides of
 * the reasoning.
 */
const readCap = (page) => page.evaluate((host) => {
  const row = document.querySelector(host.row)
  const group = row === null ? null : row.closest('[data-step-process-body]')
  const cap = group === null ? Number.NaN : Number.parseFloat(getComputedStyle(group).maxHeight)
  return Number.isFinite(cap) ? Math.round(cap) : null
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
      await page.waitForFunction((host) => document.querySelector(host.windowed) !== null, HOST, { timeout: 40000 })
      const samples = []
      for (let round = 0; round < 40; round += 1) {
        samples.push(await read(page))
        await page.waitForTimeout(250)
      }
      context.notes.samples = samples.filter((sample) => sample.windowed === true)
    },
    /** Once the reasoning is over, the reader opens the row and reads it whole. */
    async afterTurn(context) {
      const { page } = context
      // The window leaves with the running phase; the row's own phase follows the
      // host's state, so the reading below waits for both before it opens the row.
      await page.waitForFunction((host) => document.querySelector(host.windowed) === null, HOST, { timeout: 60000 })
      await page.waitForFunction((host) => {
        const row = document.querySelector(host.row)
        return row === null || row.getAttribute('data-state') !== 'running'
      }, HOST, { timeout: 30000 })
      await page.waitForTimeout(400)
      // The row's own allowance, read as soon as the reasoning is over: the
      // window's last reading stands against it, so a lane whose host still holds
      // its cap open while the model reasons is read by the same number.
      context.notes.cap = await readCap(page)
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
      const offsets = samples.map((sample) => sample.offset)
      const step = (samples[0]?.lineHeight ?? 0) * 2
      const cap = notes.cap ?? null
      // The text keeps growing while the window steps, so what the window can
      // reach is measured against the tallest the text stood while it was read.
      const tallest = samples.reduce((most, sample) => Math.max(most, sample.textHeight ?? 0), 0)
      const capped = samples.filter((sample) => sample.capped === true)
      const reachable = cap === null ? 0 : Math.max(0, tallest - cap)
      const last = samples[samples.length - 1] ?? {}
      return [
        check('窗口跟着推理文本长高，长到推理能到的最大高度就停住',
          samples.length > 2 && Number.isFinite(cap) && capped.length > 2 &&
            samples.every((sample) => sample.windowed === true) &&
            samples[0].slotHeight < samples[samples.length - 1].slotHeight &&
            capped.every((sample) => sample.masked === true) &&
            last.slotHeight <= cap + step && last.capped === true,
          JSON.stringify({ samples: samples.length, capped: capped.length, cap, first: samples[0], last })),
        check('窗口还没长满时，文本铺满窗口、没有遮罩、也没有位移',
          samples.some((sample) => sample.capped === false && sample.textHeight > 0) &&
            samples.filter((sample) => sample.capped === false).every((sample) =>
              sample.masked === false && sample.offset === 0 &&
              Math.abs(sample.slotHeight - sample.textHeight) <= (sample.lineHeight ?? 0)),
          JSON.stringify(samples.filter((sample) => sample.capped === false).slice(0, 4))),
        check('窗口里的文本按两行一步往上走，从不停在整步上（过渡真的在跑）',
          offsets.length > 2 && Math.max(...offsets) > 0 &&
            offsets.some((offset) => Math.round(offset) % (step === 0 ? 1 : step) !== 0),
          JSON.stringify({ offsets: offsets.slice(0, 8), step })),
        check('走到的位置不超过内容的末尾，最新一行始终留在窗口里',
          cap !== null && offsets.every((offset) => offset <= reachable + 0.5) &&
            Math.max(...offsets) >= reachable - step,
          JSON.stringify({ max: Math.max(...offsets), reachable, step, cap, last })),
        check('推理结束后窗口撤下，整段文本原样站着，不再被裁也不再位移',
          standing.windowed === false && standing.offset === 0 && standing.masked === false &&
            (standing.textHeight ?? 0) >= tallest &&
            (standing.slotHeight ?? 0) >= (standing.textHeight ?? 0),
          JSON.stringify({ standing, last, tallest, step })),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { reasoningStreamScenario }
