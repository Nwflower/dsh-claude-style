import { requestFrame } from '../../core/frame'
import { motionReduced } from '../../core/prefs'
import { EXPANDED_ATTRIBUTE, REASONING_BODY_SLOT_SELECTOR, REASONING_TEXT_SELECTOR, ROW_PHASE_ATTRIBUTE, RUNNING_STATE, THINK_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'

/**
 * While the model reasons, its thinking row plays the reasoning back the way
 * transitions.dev's "Reasoning stream" does: the text stands in a window a few
 * lines tall with a soft mask at each edge, and it steps up two lines at a time
 * on the snippet's own clock instead of pushing the conversation down line by
 * line (MIT; the tokens and the mask are that snippet's, under this skin's
 * names).
 *
 * What the snippet loops over a fixed transcript, this reads as live text: no
 * copy, no wrap, and the stepping stops at the newest line, so the reader never
 * loses the end of the reasoning. The host keeps its row, its header and its own
 * collapsing: the window is the host's own slot for the reasoning body, given a
 * box to clip, and what slides inside it is the host's rendered Markdown. Once
 * the reasoning stops, or the row leaves the running phase, the window comes off
 * and the whole text stands there again.
 *
 * The window's clock is also its watch: a step re-measures the text, so a
 * reasoning that grew past the window since the last step is windowed then,
 * without a second observer on the streaming subtree.
 */

/** On the reasoning body while a window stands on it: the stylesheet clips it and masks its edges. */
export const REASON_WINDOW_ATTR = 'data-dsh-claude-reason-window'
/** The window's height in pixels, measured from the text's own line height. */
export const REASON_WINDOW_HEIGHT_PROPERTY = '--dsh-claude-reason-window-height'

/** What each of the snippet's tokens falls back to when the stylesheet's own value cannot be read. */
const FALLBACKS = { hold: 840, window: 4, lines: 2 }

/** A duration or a count written in a CSS token. */
function tokenNumber(value: string, fallback: number) {
  const amount = Number.parseFloat(value)
  return Number.isFinite(amount) ? amount : fallback
}

/** One windowed row: the wait between its steps, and how far its text has risen. */
interface WindowState {
  timer: number
  offset: number
}

/**
 * Watch every thinking row and keep its reasoning in the streamed window while
 * the model is working.
 *
 * @returns teardown: the windows come off and every wait is dropped.
 */
export function createReasoningStream() {
  const windows = new Map<HTMLElement, WindowState>()
  let queued = false
  const pending = new Set<Element>()

  /** The rendered reasoning text inside a slot, or null when the host renders none yet. */
  function textOf(slot: HTMLElement) {
    const text = slot.querySelector<HTMLElement>(`:scope > ${REASONING_TEXT_SELECTOR}`)
    return text === null || text.offsetHeight === 0 ? null : text
  }

  /** The line height the text is set in, in pixels. */
  function lineHeightOf(text: HTMLElement) {
    const parsed = Number.parseFloat(getComputedStyle(text).lineHeight)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 20
  }

  /** Take one row's window off and drop its wait: the text stands as the host drew it. */
  function clearWindow(slot: HTMLElement) {
    const state = windows.get(slot)
    if (state !== undefined) window.clearTimeout(state.timer)
    windows.delete(slot)
    slot.removeAttribute(REASON_WINDOW_ATTR)
    slot.style.removeProperty(REASON_WINDOW_HEIGHT_PROPERTY)
    const text = slot.querySelector<HTMLElement>(`:scope > ${REASONING_TEXT_SELECTOR}`)
    if (text !== null) text.style.removeProperty('transform')
  }

  /**
   * One wait of the window: the text rises by the snippet's step, never past the
   * newest line, and the next wait is booked for when this one has landed. The
   * wait is also where the text is re-measured, so a reasoning that has grown
   * past the window since the last step is windowed on this one.
   */
  function tick(slot: HTMLElement, row: Element, state: WindowState) {
    const live = row.isConnected && slot.isConnected
      && row.getAttribute(ROW_PHASE_ATTRIBUTE) === RUNNING_STATE
      && row.hasAttribute(EXPANDED_ATTRIBUTE)
      && !motionReduced()
    const text = live ? textOf(slot) : null
    if (text === null) {
      // Not this module's window any more: the host's own body stands.
      if (windows.get(slot) === state) clearWindow(slot)
      return
    }
    const style = getComputedStyle(slot)
    const lineHeight = lineHeightOf(text)
    const windowPx = Math.round(lineHeight * tokenNumber(style.getPropertyValue('--dsh-claude-reason-window'), FALLBACKS.window))
    const stepPx = Math.round(lineHeight * tokenNumber(style.getPropertyValue('--dsh-claude-reason-lines'), FALLBACKS.lines))
    const holdMs = tokenNumber(style.getPropertyValue('--dsh-claude-reason-hold'), FALLBACKS.hold)
    const windowed = text.offsetHeight > windowPx
    slot.toggleAttribute(REASON_WINDOW_ATTR, windowed)
    if (windowed) {
      slot.style.setProperty(REASON_WINDOW_HEIGHT_PROPERTY, `${windowPx}px`)
      const reachable = Math.max(0, text.offsetHeight - windowPx)
      const next = Math.min(state.offset + stepPx, reachable)
      if (next !== state.offset) {
        state.offset = next
        text.style.transform = `translateY(${-next}px)`
      }
    } else if (state.offset !== 0) {
      state.offset = 0
      text.style.removeProperty('transform')
    }
    state.timer = window.setTimeout(() => tick(slot, row, state), Math.max(1, holdMs))
  }

  /** Give one row the window its phase asks for, or take it off. */
  function syncRow(row: Element) {
    const slot = row.querySelector<HTMLElement>(REASONING_BODY_SLOT_SELECTOR)
    if (slot === null) return
    const running = row.getAttribute(ROW_PHASE_ATTRIBUTE) === RUNNING_STATE
    const wanted = running && row.hasAttribute(EXPANDED_ATTRIBUTE) && !motionReduced() && textOf(slot) !== null
    if (!wanted) {
      if (windows.has(slot)) clearWindow(slot)
      return
    }
    if (windows.has(slot)) return
    const state: WindowState = { timer: 0, offset: 0 }
    windows.set(slot, state)
    tick(slot, row, state)
  }

  function flush() {
    queued = false
    const rows = [...pending]
    pending.clear()
    for (const row of rows) {
      if (row.isConnected) syncRow(row)
    }
    // A row the host replaced takes no wait with it.
    for (const [slot, state] of [...windows]) {
      if (slot.isConnected) continue
      window.clearTimeout(state.timer)
      windows.delete(slot)
    }
  }

  function queue(row: Element) {
    pending.add(row)
    if (queued) return
    queued = true
    requestFrame({ write: flush })
  }

  return {
    /** Re-read every thinking row, for a change the caller saw outside a row. */
    sync() {
      for (const row of document.querySelectorAll(THINK_ROW_SELECTOR)) queue(row)
    },
    queueRow: queue,
    stop() {
      for (const slot of [...windows.keys()]) clearWindow(slot)
      pending.clear()
    },
  }
}
