import { observeSize } from '@dsh-claude-style/engine/bus'
import { inPageBox } from './page-zoom'

/** `measure` reads and `sync` writes; a control met for the first time is measured by its size observer's first report, so its first pill does not slide.
 * ResizeObserver covers font-driven width changes. Reduced motion keeps this functional movement.
 */
export function createSlidingPill(activeSelector: string) {
  const PILL_ATTR = 'data-dsh-claude-pill'
  let control: HTMLElement | null = null
  /** The last written box, so an unchanged placement writes nothing. */
  let lastX: number | null = null
  let lastY: number | null = null
  let lastW: number | null = null
  let lastH: number | null = null
  /** Stops watching the current control's size. */
  let stopSize: (() => void) | null = null
  /** What the read phase measured: the item's box against the control's. */
  let reading: { x: number, y: number, w: number, h: number } | null = null
  /** The control that reading belongs to, whether a pass took one, and the item it measured. */
  let measured: HTMLElement | null = null
  let measuredItem: Element | null = null
  let taken = false

  function clear(el: HTMLElement) {
    el.removeAttribute(PILL_ATTR)
    el.style.removeProperty('--dsh-claude-pill-x')
    el.style.removeProperty('--dsh-claude-pill-y')
    el.style.removeProperty('--dsh-claude-pill-w')
    el.style.removeProperty('--dsh-claude-pill-h')
    lastX = null
    lastY = null
    lastW = null
    lastH = null
  }

  /** The active item inside a control: the reading's subject, and what a later sync checks it against. */
  function activeItemOf(next: HTMLElement | null) {
    return next === null ? null : next.querySelector(activeSelector)
  }

  /** The pass's read phase: where the active item sits inside the control. */
  function measure(next: HTMLElement | null, active = activeItemOf(next)) {
    taken = true
    measured = next
    if (next === null) {
      reading = null
      measuredItem = null
      return
    }
    measuredItem = active
    // Both boxes in the pixels the four properties are read in; the control's
    // own border and padding already are (shared/page-zoom.ts).
    const box = inPageBox(next.getBoundingClientRect())
    const itemBox = active === null ? null : inPageBox(active.getBoundingClientRect())
    if (box.width === 0 || itemBox === null || itemBox.width === 0) {
      reading = null
      return
    }
    // A transform on an ancestor — a panel arriving at its scale — scales both
    // rects while the styles under it keep their layout: the ratio between the
    // control's rect and its own layout width takes that scale back out, so a
    // pill read during the arrival still lands on the item's box.
    const scale = next.offsetWidth === 0 ? 1 : box.width / next.offsetWidth
    reading = {
      x: Math.round(((itemBox.left - box.left) / scale - next.clientLeft) * 100) / 100,
      y: Math.round(((itemBox.top - box.top) / scale - next.clientTop) * 100) / 100,
      w: Math.round(itemBox.width / scale * 100) / 100,
      h: Math.round(itemBox.height / scale * 100) / 100,
    }
  }

  /** The write phase: the control's four custom properties, from that reading. */
  function place(next: HTMLElement, measured: { x: number, y: number, w: number, h: number } | null) {
    // A fresh placement is measured here. The control's own feature stamps it in
    // this same task, and those stamps can move it: a reading taken before them
    // would place the pill a step off and slide it there on the next pass. One
    // task computes its styles once, so the values written after the attribute
    // is on are the ones it is first drawn with — no slide.
    const fresh = !next.hasAttribute(PILL_ATTR)
    if (fresh) {
      measure(next)
      measured = reading
    }
    if (measured === null) {
      if (next.hasAttribute(PILL_ATTR)) clear(next)
      return
    }
    const { x, y, w, h } = measured
    if (x === lastX && y === lastY && w === lastW && h === lastH && next.hasAttribute(PILL_ATTR)) return
    lastX = x
    lastY = y
    lastW = w
    lastH = h
    next.style.setProperty('--dsh-claude-pill-x', `${x}px`)
    next.style.setProperty('--dsh-claude-pill-y', `${y}px`)
    next.style.setProperty('--dsh-claude-pill-w', `${w}px`)
    next.style.setProperty('--dsh-claude-pill-h', `${h}px`)
    if (!next.hasAttribute(PILL_ATTR)) next.setAttribute(PILL_ATTR, '')
  }

  /** Measure the control again and place its pill, from a callback of its own. */
  function remeasure() {
    if (control === null) return
    measure(control)
    taken = false
    place(control, reading)
  }

  function sync(next: HTMLElement | null) {
    if (next !== control) {
      taken = false
      if (stopSize !== null) stopSize()
      stopSize = null
      if (control !== null) clear(control)
      control = next
      if (control === null) return
      // A control met for the first time is measured by its size observer's
      // first report. That report comes once the frame has laid the control
      // out and before it paints, so the reading sees the stamps this pass
      // writes — the first pill does not slide — and costs no layout of its
      // own. Read here, in the pass's write phase, it would compute the layout
      // of the whole transcript a session switch has just mounted once more.
      stopSize = observeSize(control, remeasure)
      // A webfont that lands after the first report widens the items without
      // changing the control's own box, which the size observer watches: the
      // items are read again once the page's fonts have settled.
      if (document.fonts.status !== 'loaded') void document.fonts.ready.then(remeasure)
      return
    }
    if (control === null) return
    // A reading taken in an earlier pass describes the item that was active
    // then. A press can move the active item before the control is synced from
    // its own task — the search palette places its pill from its render — and
    // that reading would leave the pill on the item the reader just left.
    const active = activeItemOf(next)
    if (!taken || measured !== next || active !== measuredItem) measure(next, active)
    taken = false
    place(control, reading)
  }

  function release() {
    if (stopSize !== null) stopSize()
    stopSize = null
    if (control !== null) clear(control)
    control = null
    reading = null
    measured = null
    measuredItem = null
    taken = false
  }

  return { measure, sync, release }
}
