import { requestFrame } from '../../core/frame'
import { motionReduced } from '../../core/prefs'
import { EXPANDED_ATTRIBUTE, REASONING_TEXT_SELECTOR, ROW_PHASE_ATTRIBUTE, RUNNING_STATE, THINK_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'

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
 * collapsing: the window is the nearest ancestor of the host's rendered Markdown
 * that has a box of its own — one host version wraps it in a slot that generates
 * none — and what slides inside that is the Markdown itself. Once the reasoning
 * stops, or the row leaves the running phase, the window comes off and the whole
 * text stands there again.
 *
 * The window's clock is also its watch: a step re-measures the text, so a
 * reasoning that grew past the window since the last step is windowed then,
 * without a second observer on the streaming subtree.
 */

/** On the reasoning's window while it stands: the stylesheet clips it and masks its edges. */
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

/** One windowed row: what it clips, what slides there, the wait between steps and how far the text has risen. */
interface WindowState {
  window: HTMLElement
  text: HTMLElement
  timer: number
  offset: number
}

/** The rendered reasoning text of a row, or null while the host renders none. */
function textOf(row: Element) {
  const text = row.querySelector<HTMLElement>(REASONING_TEXT_SELECTOR)
  return text === null || text.offsetHeight === 0 ? null : text
}

/** The nearest ancestor of the text that is laid out as a box: what the window clips. */
function windowOf(row: Element, text: HTMLElement) {
  let node: HTMLElement | null = text.parentElement
  while (node !== null && node !== row) {
    if (getComputedStyle(node).display !== 'contents') return node
    node = node.parentElement
  }
  return null
}

/** The line height the text is set in, in pixels. */
function lineHeightOf(text: HTMLElement) {
  const parsed = Number.parseFloat(getComputedStyle(text).lineHeight)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20
}

/**
 * Watch every thinking row and keep its reasoning in the streamed window while
 * the model is working.
 *
 * @returns teardown: the windows come off and every wait is dropped.
 */
export function createReasoningStream() {
  const windows = new Map<Element, WindowState>()
  let queued = false
  const pending = new Set<Element>()

  /** Take one row's window off and drop its wait: the text stands as the host drew it. */
  function clearWindow(row: Element) {
    const state = windows.get(row)
    if (state === undefined) return
    window.clearTimeout(state.timer)
    windows.delete(row)
    state.window.removeAttribute(REASON_WINDOW_ATTR)
    state.window.style.removeProperty(REASON_WINDOW_HEIGHT_PROPERTY)
    state.text.style.removeProperty('transform')
  }

  /**
   * One wait of the window: the text rises by the snippet's step, never past the
   * newest line, and the next wait is booked for when this one has landed. The
   * wait is also where the text is re-measured, so a reasoning that has grown
   * past the window since the last step is windowed on this one.
   */
  function tick(row: Element, state: WindowState) {
    const live = row.isConnected && state.window.isConnected && state.text.isConnected
      && row.getAttribute(ROW_PHASE_ATTRIBUTE) === RUNNING_STATE
      && row.hasAttribute(EXPANDED_ATTRIBUTE)
      && !motionReduced()
    // The host can rebuild the body under the same row (a session switch, a fresh
    // stream): the window follows what the row holds now.
    const current = live ? textOf(row) : null
    const viewport = current === null || current !== state.text ? null : state.window
    if (viewport === null) {
      // Not this module's window any more: the host's own body stands.
      if (windows.get(row) === state) clearWindow(row)
      return
    }
    const style = getComputedStyle(viewport)
    const lineHeight = lineHeightOf(state.text)
    const windowPx = Math.round(lineHeight * tokenNumber(style.getPropertyValue('--dsh-claude-reason-window'), FALLBACKS.window))
    const stepPx = Math.round(lineHeight * tokenNumber(style.getPropertyValue('--dsh-claude-reason-lines'), FALLBACKS.lines))
    const holdMs = tokenNumber(style.getPropertyValue('--dsh-claude-reason-hold'), FALLBACKS.hold)
    const windowed = state.text.offsetHeight > windowPx
    viewport.toggleAttribute(REASON_WINDOW_ATTR, windowed)
    if (windowed) {
      viewport.style.setProperty(REASON_WINDOW_HEIGHT_PROPERTY, `${windowPx}px`)
      const reachable = Math.max(0, state.text.offsetHeight - windowPx)
      const next = Math.min(state.offset + stepPx, reachable)
      if (next !== state.offset) {
        state.offset = next
        state.text.style.transform = `translateY(${-next}px)`
      }
    } else if (state.offset !== 0) {
      state.offset = 0
      state.text.style.removeProperty('transform')
    }
    state.timer = window.setTimeout(() => tick(row, state), Math.max(1, holdMs))
  }

  /** Give one row the window its phase asks for, or take it off. */
  function syncRow(row: Element) {
    const running = row.getAttribute(ROW_PHASE_ATTRIBUTE) === RUNNING_STATE
    const text = running && row.hasAttribute(EXPANDED_ATTRIBUTE) && !motionReduced() ? textOf(row) : null
    const viewport = text === null ? null : windowOf(row, text)
    const held = windows.get(row)
    if (text === null || viewport === null) {
      if (held !== undefined) clearWindow(row)
      return
    }
    if (held !== undefined && held.text === text && held.window === viewport) return
    if (held !== undefined) clearWindow(row)
    const state: WindowState = { window: viewport, text, timer: 0, offset: 0 }
    windows.set(row, state)
    tick(row, state)
  }

  function flush() {
    queued = false
    const rows = [...pending]
    pending.clear()
    for (const row of rows) {
      if (row.isConnected) syncRow(row)
    }
    // A row the host replaced takes no wait with it.
    for (const row of [...windows.keys()]) {
      if (row.isConnected) continue
      clearWindow(row)
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
      for (const row of [...windows.keys()]) clearWindow(row)
      pending.clear()
    },
  }
}
