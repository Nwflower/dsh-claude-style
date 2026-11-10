#!/usr/bin/env node
/**
 * reasoning-stream.mjs — the reasoning's streamed window, end to end (D92).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.mjs).
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
import path from 'node:path'
import { settlePage, recordUntil } from '../lane.mjs'
import { bound } from '../bounds.mjs'
import surfaceTable from '../data/surface.json' with { type: 'json' }

const SURFACE = surfaceTable.surface
const selector = (id) => {
  const entry = SURFACE.find((candidate) => candidate.id === id)
  if (entry?.selector === undefined) throw new Error(`reasoning-stream: ${id} names no element`)
  return entry.selector
}
const attribute = (id) => {
  const entry = SURFACE.find((candidate) => candidate.id === id)
  if (entry?.attribute === undefined) throw new Error(`reasoning-stream: ${id} names no attribute`)
  return entry.attribute
}

/** The least wait between two steps of the window; the value and its reason are in packages/testing/data/bounds.json. */
const STEP_MIN_GAP_MS = bound('reasonStepMinGapMs')

/** The thinking row, the window the module puts on it and the text it slides. */
const HOST = {
  row: '[data-variant="think"]',
  flow: '[data-chat-flow]',
  window: selector('chat.reason-window'),
  windowed: `[data-variant="think"] ${selector('chat.reason-window')}`,
  capped: attribute('chat.reason-capped'),
  text: '[data-markdown-variant]',
}

/** The mark the fold glide hangs on the body a door is rolling (packages/client/src/constants.ts). */
const ROLLING = '[data-dsh-claude-rolling]'

/**
 * Watch for the door the skin's own fold of a thinking row rolls.
 *
 * The row this feature opens and folds dispatches a real click down the fold
 * glide's capture path (reasoning-fold.ts), so the door has to roll for it
 * exactly as it does for a reader's press: the body the glide presses carries
 * the rolling mark for the door's duration. The door lasts 200 ms and the
 * step's frame samples every frame, so a fold that takes the row's state in
 * one frame — no door at all — leaves the tally empty.
 *
 * @param page - the lane's page.
 * @returns the tally object the page fills in, as a global.
 */
function watchDoor(page) {
  return page.evaluate((selector) => {
    const tally = { frames: 0, rolling: 0, unfoldedRolling: 0, tallest: 0 }
    window.__reasoningDoor = tally
    const sample = () => {
      const row = document.querySelector('[data-variant="think"]')
      tally.frames += 1
      if (row !== null) {
        const rolling = row.querySelector(selector)
        if (rolling !== null) {
          tally.rolling += 1
          // The fold of an open row: the body is still in the DOM, so the door
          // is measured where the reader sees it rather than after the unmount.
          if (row.hasAttribute('data-expanded')) tally.unfoldedRolling += 1
          tally.tallest = Math.max(tally.tallest, Math.round(rolling.getBoundingClientRect().height))
        }
      }
      if (tally.frames < 60000) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  }, ROLLING)
}

/**
 * What the window looks like right now, in one reading.
 *
 * The row that carries the window is read where there is one, so a finished
 * turn's own thinking rows cannot answer for the running one. With the window
 * off, the reading is of the host's own body, so the same numbers answer the
 * state after the reasoning: the whole text, no mask.
 */
function readInPage(host) {
  const row = document.querySelector(host.row)
  if (row === null) return { row: false, windowed: false }
  const window = row.querySelector(host.window)
  const scope = window ?? row
  const text = scope.querySelector(host.text)
  if (text === null) return { row: true, windowed: window !== null }
  const style = getComputedStyle(scope)
  const mask = style.maskImage === 'none' ? style.webkitMaskImage : style.maskImage
  const matrix = /matrix\(1, 0, 0, 1, 0, (-?[\d.]+)\)/.exec(getComputedStyle(text).transform)
  const flow = row.closest(host.flow)
  return {
    row: true,
    phase: row.getAttribute('data-state'),
    flowTop: flow?.getBoundingClientRect().top ?? null,
    expanded: row.hasAttribute('data-expanded'),
    windowed: window !== null,
    capped: window !== null && window.hasAttribute(host.capped),
    slotHeight: Math.round(scope.getBoundingClientRect().height),
    masked: mask.startsWith('linear-gradient'),
    textHeight: Math.round(text.getBoundingClientRect().height),
    offset: matrix === null ? 0 : -Number(matrix[1]),
    // The step the module wrote, apart from where the transition has carried
    // the text so far: it changes once per wait, which is what times the clock.
    target: text.style.transform,
    at: Math.round(performance.now()),
    lineHeight: Math.round(Number.parseFloat(getComputedStyle(text).lineHeight)),
  }
}

const read = (page) => page.evaluate(readInPage, HOST)

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
    patch: [
      '- id: ui-skin-claude-style',
      '  config:',
      '    reasoningDisplay: stepped',
    ],
    delayMs: 700,
    /** Read the window on every frame while the model reasons, until the window comes off. */
    async duringTurn(context) {
      const { page } = context
      await page.waitForFunction((host) => document.querySelector(host.windowed) !== null, HOST, { timeout: 40000 })
      await watchDoor(page)
      const recording = recordUntil(page, readInPage, (seen) => seen[seen.length - 1].windowed === false, HOST, 60000, 'the window coming off the reasoning')
      await page.waitForFunction((host) => document.querySelector(`${host.windowed}[${host.capped}]`) !== null, HOST, { timeout: 40000 })
      await page.screenshot({ path: path.join(context.out, 'reasoning-stepped.png') })
      const frames = await recording
      context.notes.samples = frames.filter((sample) => sample.windowed === true)
    },
    /** Once the reasoning is over, the reader opens the row and reads it whole. */
    async afterTurn(context) {
      const { page } = context
      // The window leaves with the running phase; the row's own phase follows the
      // host's state, so the reading below waits for both before it opens the row.
      await page.waitForFunction((host) => document.querySelector(host.windowed) === null, HOST, { timeout: 60000 })
      // The door the feature's own fold of this row rolled, read once the window
      // is off — the fold is what ends the window, so this is the fold's own door.
      await page.waitForFunction((host) => {
        const row = document.querySelector(host.row)
        return row === null || row.getAttribute('data-state') !== 'running'
      }, HOST, { timeout: 30000 })
      await settlePage(page)
      // The row's own allowance, read as soon as the reasoning is over: the
      // window's last reading stands against it, so a lane whose host still holds
      // its cap open while the model reasons is read by the same number.
      context.notes.cap = await readCap(page)
      // The finished turn keeps its work under two of the host's own controls in
      // the tiers that cap it: the turn's process, then the group holding the row.
      const turnControl = page.locator('button[data-turn-process]').first()
      if ((await turnControl.count()) > 0 && (await turnControl.isEnabled())) {
        await turnControl.click().catch(() => {})
        await settlePage(page)
      }
      await openWhenFolded(page, 'button[data-process-activity]')
      await settlePage(page)
      // The door the feature's own fold of this row rolled. The fold is what ends
      // the window, so the tally holds it by now; the reader's own press below
      // rolls a door too, and that one is not this one.
      context.notes.door = await page.evaluate(() => window.__reasoningDoor ?? null)
      await openWhenFolded(page, `${HOST.row} [role="button"][aria-expanded]`)
      await settlePage(page)
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
      // The window's height is written by the module's own pass, which can land
      // after the markdown layer grew the text in the same frame, so a frame
      // catches the text a step ahead of the slot now and then. What may not
      // happen is a window taller than the text it holds, or a lag no later frame
      // closes — by catching up or by reaching the cap: a window that stopped
      // following the text stays behind, uncapped, on every frame after it, the
      // last one the window stood on included.
      const uncapped = samples.filter((sample) => sample.capped === false)
      const lagging = (sample) => sample.textHeight - sample.slotHeight > (sample.lineHeight ?? 0)
      const lags = uncapped.filter(lagging)
      const final = samples[samples.length - 1]
      const unclosed = final !== undefined && final.capped === false && lagging(final) ? [final] : []
      const door = notes.door ?? {}
      // When the written step changed, frame by frame: the wait between two of
      // them is the snippet's hold, and a wait read in the wrong unit steps the
      // text on every timer turn.
      const stepped = samples.filter((sample, index) => index > 0 && sample.target !== samples[index - 1].target)
      const gaps = stepped.slice(1).map((sample, index) => sample.at - stepped[index].at)
      // Where each step was written to, against the end the text had then: a step
      // rises as far as the text has grown, so it lands within one step of the
      // newest line and never past it.
      const landings = cap === null ? [] : stepped.map((sample) => {
        const written = /translateY\((-?[\d.]+)px\)/.exec(sample.target)
        return { to: written === null ? 0 : -Number(written[1]), end: Math.max(0, sample.textHeight - cap) }
      })
      const short = landings.filter((landing) => landing.to > landing.end + 0.5 || landing.to < landing.end - step)
      return [
        // The feature's own fold of this row is a press down the fold glide's
        // capture path, so the body it folds has to roll like any other door; a
        // fold that takes the row's state in one frame rolled none.
        check('思考行自动收起时门真的滚动',
          (door.rolling ?? 0) > 1 && (door.unfoldedRolling ?? 0) > 0 && (door.tallest ?? 0) > 20,
          JSON.stringify(door)),
        check('窗口跟着推理文本长高，长到推理能到的最大高度就停住',
          samples.length > 0 && Number.isFinite(cap) && capped.length > 0 &&
            samples.every((sample) => sample.windowed === true) &&
            samples[0].slotHeight < samples[samples.length - 1].slotHeight &&
            capped.every((sample) => sample.masked === true) &&
            last.slotHeight <= cap + step && last.capped === true,
          JSON.stringify({ samples: samples.length, capped: capped.length, cap, first: samples[0], last })),
        check('窗口还没长满时，文本铺满窗口、没有遮罩、也没有位移',
          uncapped.length > 0 && uncapped.some((sample) => sample.textHeight > 0) &&
            uncapped.every((sample) => sample.masked === false && sample.offset === 0 &&
              sample.slotHeight - sample.textHeight <= (sample.lineHeight ?? 0)) &&
            unclosed.length === 0,
          JSON.stringify({ lags: lags.length, unclosed: unclosed.length, first: uncapped.slice(0, 3), lag: lags[0] ?? null })),
        check('窗口里的文本按两行一步往上走，从不停在整步上（过渡真的在跑）',
          Math.max(0, ...offsets) > 0 &&
            offsets.some((offset) => Math.round(offset) % (step === 0 ? 1 : step) !== 0),
          JSON.stringify({ offsets: offsets.slice(0, 8), step })),
        check('两步之间隔着一整段停留，文本不会每个计时器周期都往上走',
          gaps.length > 0 && Math.min(...gaps) >= STEP_MIN_GAP_MS,
          JSON.stringify({ steps: stepped.length, gaps: gaps.slice(0, 8) })),
        check('走到的位置不超过内容的末尾，每一步都走到最新一行',
          cap !== null && offsets.every((offset) => offset <= reachable + 0.5) &&
            landings.length > 0 && short.length === 0,
          JSON.stringify({ max: Math.max(...offsets), reachable, step, cap, landings: landings.slice(-6), short: short.slice(0, 3) })),
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

function reasoningContinuousScenario({ check }) {
  return {
    script: 'think',
    prompt: 'think it through',
    patch: [
      '- id: ui-skin-claude-style',
      '  config:',
      '    motion: full',
      '    reasoningDisplay: continuous',
    ],
    delayMs: 1200,
    async duringTurn(context) {
      const { page } = context
      // The row has to be running with text already in it: a first sample taken
      // before the mock's reasoning starts would read as the turn being over,
      // and the recording would stop with nothing in it.
      await page.waitForFunction((host) => {
        const row = document.querySelector(host.row)
        const text = row?.querySelector(host.text)
        return row !== null && row.getAttribute('data-state') === 'running' &&
          text !== null && text !== undefined && text.getBoundingClientRect().height > 100
      }, HOST, { timeout: 40000 })
      const recording = recordUntil(page, readInPage, (seen) => seen[seen.length - 1].phase !== 'running', HOST, 60000, 'the continuous reasoning ending')
      await page.waitForFunction((host) => {
        const row = document.querySelector(host.row)
        const text = row?.querySelector(host.text)
        return text !== null && text !== undefined && text.getBoundingClientRect().height > 400
      }, HOST, { timeout: 40000 })
      await page.screenshot({ path: path.join(context.out, 'reasoning-continuous.png') })
      context.notes.samples = await recording
    },
    async assert({ session, notes }) {
      const samples = notes.samples ?? []
      const running = samples.filter((sample) => sample.phase === 'running' && sample.textHeight > 0)
      const first = running[0] ?? {}
      const last = running[running.length - 1] ?? {}
      // Once the column has overflowed, every later growth is the moment the
      // host pins the tail. The skin's slide has to carry that growth through
      // visible intermediate positions rather than leaving one whole-step jump.
      const growths = []
      for (let index = 1; index < running.length; index += 1) {
        const previous = running[index - 1]
        const current = running[index]
        if (!(previous.flowTop < first.flowTop - 0.5) || !(current.textHeight > previous.textHeight)) continue
        let end = index + 1
        while (end < running.length && running[end].textHeight <= current.textHeight) end += 1
        const positions = running.slice(index - 1, end).map((sample) => Math.round(sample.flowTop * 10) / 10)
        growths.push({
          at: current.at,
          grew: current.textHeight - previous.textHeight,
          from: previous.flowTop,
          to: current.flowTop,
          positions: new Set(positions).size,
        })
      }
      const jumped = growths.filter((growth) => growth.positions <= 2)
      const reversals = running.filter((sample, index) => index > 0 && sample.textHeight >= running[index - 1].textHeight
        && sample.flowTop > running[index - 1].flowTop + 0.5)
      return [
        check('逐字跟随直接显示思考文本，不创建步进窗口',
          running.length > 20 && running.every((sample) => sample.windowed === false && sample.capped === false && sample.masked === false && sample.offset === 0 && sample.target === ''),
          JSON.stringify({ samples: running.length, first, last })),
        check('思考文本随宿主内容到达持续长高', (last.textHeight ?? 0) > (first.textHeight ?? 0), JSON.stringify({ first: first.textHeight, last: last.textHeight })),
        check('思考溢出后的每次增长都有连续位移，正文不整段跳变',
          growths.length > 0 && jumped.length === 0 && reversals.length === 0,
          JSON.stringify({ growths: growths.length, jumped: jumped.slice(0, 3), reversals: reversals.slice(0, 3).map((sample) => ({ at: sample.at, flowTop: sample.flowTop })) })),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { reasoningStreamScenario, reasoningContinuousScenario }
