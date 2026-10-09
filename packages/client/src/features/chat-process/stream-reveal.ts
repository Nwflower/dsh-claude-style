import { STREAM_REVEAL_ATTR } from '../../constants'
import { motionReduced } from '../../core/prefs'
import { STREAMING_SELECTOR } from '@dsh-claude-style/contracts/dom'

/**
 * The arriving answer's entrance (D56): dsh-better-display fades each new word
 * in with a small blur, on one absolute clock, so text resolves as it is written
 * rather than appearing all at once.
 *
 * The skin animates the block the new text lands in. The reference can split a
 * paragraph into word boxes because it renders that paragraph itself; the host
 * renders this markdown, and its own updates address the text nodes it made, so
 * splitting them here would make its next paint land in the wrong node. Same
 * recipe, one grain coarser: the same duration, curve, blur and cadence.
 */

/** The reference's word-motion parameters (`word-timeline.ts`). */
export const WORD_MOTION = {
  duration: 350,
  gap: 60,
  blur: 1,
  easing: 'cubic-bezier(0.22,1,0.36,1)',
  maxDelay: 240,
  /** Floor for the per-block cadence once a batch is compressed. */
  minGap: 3,
  /** One paint's arrivals should land inside this window, however many arrive. */
  batchMs: 90,
} as const

/** The block-level nodes one arriving unit is: the landing places of new text. */
const BLOCK_SELECTOR = 'p, li, h1, h2, h3, h4, h5, h6, pre, blockquote, table, figure, ul, ol, hr, img'

/**
 * When a batch of `arrived` blocks is born, in the order they arrived.
 *
 * A fixed per-block gap would cap the entrance at a few blocks a second however
 * fast the model writes, so a batch is compressed into one short window; a lone
 * arrival keeps the reading rhythm. Nothing is ever scheduled further ahead than
 * one window past now, which is what stops a queue from building up.
 *
 * @param arrived - how many blocks arrived in this paint.
 * @param lastBirth - the birth of the previous arrival, or -Infinity for the first.
 * @param now - the clock this paint runs on.
 */
export function birthTimes(arrived: number, lastBirth: number, now: number): number[] {
  const gap = arrived > 1
    ? Math.max(WORD_MOTION.minGap, Math.min(WORD_MOTION.gap, WORD_MOTION.batchMs / arrived))
    : WORD_MOTION.gap
  const times: number[] = []
  let previous = lastBirth
  for (let at = 0; at < arrived; at += 1) {
    const born = Number.isFinite(previous)
      ? Math.min(now + WORD_MOTION.batchMs, Math.max(now, previous + gap))
      : now
    times.push(born)
    previous = born
  }
  return times
}

/** The blocks inside one streaming container, in source order. */
function blocksOf(container: Element): HTMLElement[] {
  const found = [...container.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)]
  return found.length > 0 ? found : container instanceof HTMLElement ? [container] : []
}

/** The clock the animations are scheduled on: the document timeline, as the reference uses it. */
function timelineNow(): number {
  const time = document.timeline?.currentTime
  return typeof time === 'number' ? time : performance.now()
}

interface StreamState {
  container: Element | null
  seen: WeakSet<Element>
  lastBirth: number
}

const state: StreamState = { container: null, seen: new WeakSet(), lastBirth: -Infinity }

/**
 * Fade in the blocks that arrived since the last pass.
 *
 * A container the lane has not seen before is history: everything already in it
 * counts as shown, so a session opened mid-conversation does not replay, and the
 * same holds while the reader asked for no animation or the page is in the
 * background.
 */
export function syncStreamReveal() {
  const container = document.querySelector(STREAMING_SELECTOR)
  if (container === null) {
    state.container = null
    state.seen = new WeakSet()
    state.lastBirth = -Infinity
    return
  }
  if (state.container !== container) {
    state.container = container
    state.seen = new WeakSet()
    state.lastBirth = -Infinity
    for (const block of blocksOf(container)) state.seen.add(block)
    return
  }
  if (motionReduced() || document.hidden) {
    for (const block of blocksOf(container)) state.seen.add(block)
    return
  }
  const fresh = blocksOf(container).filter(block => !state.seen.has(block))
  if (fresh.length === 0) return
  const now = timelineNow()
  const births = birthTimes(fresh.length, state.lastBirth, now)
  fresh.forEach((block, at) => {
    state.seen.add(block)
    state.lastBirth = births[at] ?? now
    reveal(block, state.lastBirth)
  })
}

/** The reference's entrance: opacity from nothing while a one-pixel blur clears. */
function reveal(block: HTMLElement, born: number) {
  if (typeof block.animate !== 'function') return
  block.setAttribute(STREAM_REVEAL_ATTR, '')
  const animation = block.animate(
    [{ opacity: 0, filter: `blur(${WORD_MOTION.blur}px)` }, { opacity: 1, filter: 'blur(0px)' }],
    { duration: WORD_MOTION.duration, easing: WORD_MOTION.easing, fill: 'backwards' },
  )
  // One absolute clock: a block that mounted a frame late still enters with its
  // own batch instead of running ahead of it.
  animation.startTime = born
  const finish = () => { block.removeAttribute(STREAM_REVEAL_ATTR) }
  animation.onfinish = finish
}

/** Forget the container and its arrivals; the feature's teardown. */
export function stopStreamReveal() {
  state.container = null
  state.seen = new WeakSet()
  state.lastBirth = -Infinity
}
