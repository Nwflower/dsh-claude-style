import { STATUS_SWAP_ATTR } from '../../constants'
import { motionReduced } from '../../core/prefs'

/**
 * The status line's swap (D56): dsh-better-display moves one line of status
 * copy out and the next one in — 150 ms each way, 50 ms apart, 8 px of travel
 * and a 2 px blur, ease-in-out — instead of replacing the words in place.
 *
 * The skin's own status line is a `content: attr()` pseudo-element on the
 * moved turn control (turn-status.ts), so there is one element and one copy:
 * the reader sees the line leave and the next one rise in, at the reference's
 * two-phase timing, rather than two copies crossing.
 */

/** The reference's `StatusText` clock. */
export const STATUS_MOTION = {
  swap: 150,
  gap: 50,
  distance: 8,
  blur: 2,
} as const

/** The control whose status copy the skin renders, with the text in its attribute. */
const STATUS_CONTROL = 'button[data-dsh-claude-turn-status]'
/** The attribute the stylesheet renders (`content: attr(data-dsh-claude-turn-status)`). */
const STATUS_TEXT_ATTR = 'data-dsh-claude-turn-status'

const shown = new WeakMap<Element, string>()
/** The controls mid-swap, with the timers that will finish them. A plain Map,
 * because the pass that ends a swap is what takes the control out of it. */
const swapping = new Map<Element, number[]>()

/** The control's current line of copy, as the stylesheet renders it. */
function copyOf(control: Element): string {
  return control.getAttribute(STATUS_TEXT_ATTR) ?? ''
}

/** Clear a control's swap: the line stands still again. */
function settle(control: Element) {
  for (const timer of swapping.get(control) ?? []) window.clearTimeout(timer)
  swapping.set(control, [])
  control.removeAttribute(STATUS_SWAP_ATTR)
}

/**
 * Play the two-phase swap on one control, at the reference's numbers: out over
 * 150 ms, a 50 ms beat, then in over 150 ms from the opposite side.
 */
function swap(control: HTMLElement) {
  settle(control)
  control.setAttribute(STATUS_SWAP_ATTR, 'out')
  const at = window.setTimeout(() => {
    // The entry pose is committed before the transition is released: the line
    // starts 8 px low and blurred, and moves to rest from there.
    control.setAttribute(STATUS_SWAP_ATTR, 'in')
    void control.getBoundingClientRect()
    const running = window.setTimeout(() => {
      control.setAttribute(STATUS_SWAP_ATTR, 'run')
      const done = window.setTimeout(() => settle(control), STATUS_MOTION.swap)
      swapping.set(control, [done])
    }, STATUS_MOTION.gap)
    swapping.set(control, [running])
  }, STATUS_MOTION.swap)
  swapping.set(control, [at])
}

/**
 * One pass: a status line whose copy changed swaps, one that did not stands
 * still. A control that left the page forgets its copy, so the next running
 * turn's first line arrives without a swap.
 */
export function syncStatusSwap() {
  const controls = new Set<Element>(document.querySelectorAll(STATUS_CONTROL))
  for (const control of controls) {
    const copy = copyOf(control)
    const previous = shown.get(control)
    shown.set(control, copy)
    if (previous === undefined || previous === copy) continue
    if (motionReduced() || !(control instanceof HTMLElement)) continue
    swap(control)
  }
  for (const control of [...swapping.keys()]) {
    if (controls.has(control)) continue
    settle(control)
  }
}

/** Stop every swap; the feature's teardown. */
export function stopStatusSwap() {
  for (const control of [...swapping.keys()]) settle(control)
}
