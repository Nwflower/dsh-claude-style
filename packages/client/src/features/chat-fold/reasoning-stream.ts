import { requestFrame } from '@dsh-claude-style/engine/frame'
import { observeMatches } from '@dsh-claude-style/engine/bus'
import { motionReduced, readPrefs, subscribePrefs } from '../../core/prefs'
import { REASONING_DISPLAY_STEPPED } from '../../constants'
import { motionMs } from '../../shared/motion'
import { EXPANDED_ATTRIBUTE, REASONING_TEXT_SELECTOR, ROW_PHASE_ATTRIBUTE, RUNNING_STATE, THINK_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'

/* Adapted from transitions.dev's "Reasoning stream" (MIT) for live text. The nearest boxed ancestor
   clips because host slots may use display:contents. Reuse the fold observer and frame read/write
   phases (D40); step only at the cap and never beyond the newest line. */

/** On the reasoning's window while it stands: the stylesheet clips it and hangs the step on the text. */
export const REASON_WINDOW_ATTR = 'data-dsh-claude-reason-window'
/** On the Markdown the window slides: the stylesheet hangs the step's transition on it. */
export const REASON_TEXT_ATTR = 'data-dsh-claude-reason-text'
/** On the window once the text has filled the cap: the stylesheet masks its edges. */
export const REASON_CAPPED_ATTR = 'data-dsh-claude-reason-capped'
/** The window's height in pixels: the text's own height, held under the cap. */
export const REASON_WINDOW_HEIGHT_PROPERTY = '--dsh-claude-reason-window-height'

/** cap mirrors the host process body's max-height through the CSS token. */
const FALLBACKS = { lines: 2, cap: 400 }

/** motionMs handles the seconds unit emitted by the minified stylesheet (D9). */
const HOLD_MS = motionMs('--dsh-claude-period-hold')

/** A duration, a count or a length written in a CSS token. */
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

/** The height a window takes: the text's own height, held under the cap reasoning may reach. */
interface Height {
  heightPx: string
  capped: boolean
}

/** What a text measures: that height, and how far the text can still rise under it. */
interface Measure extends Height {
  reachable: number
}

/** What one wait writes: the window's height and how far the text has risen. */
interface Step extends Height {
  offset: number
}

/** One row read this frame: the window it takes (null: the one it holds comes off), or the one it holds with the height the text has grown to. */
interface Plan {
  row: Element
  state: WindowState | null
  /** The row's first wait, for a row taking a window. */
  step: Step | null
  /** What the text measures now, for a row keeping the window it holds. */
  grow: Measure | null
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
  /** Every thinking row on the page, kept current by the bus (D40): a scroll reads this instead of querying. */
  const thinkRows = observeMatches<HTMLElement>(THINK_ROW_SELECTOR)
  let queued = false
  const pending = new Set<Element>()
  /** What this frame's read phase found, for its write phase. */
  const plans: Plan[] = []
  /** Set by the teardown: no row is queued any more, and the frame in flight is cancelled. */
  let stopped = false
  /** Cancels the frame the queued rows wait on. */
  let cancelFrame: (() => void) | null = null

  /** Take one row's window off and drop its wait: the text stands as the host drew it. */
  function clearWindow(row: Element) {
    const state = windows.get(row)
    if (state === undefined) return
    window.clearTimeout(state.timer)
    windows.delete(row)
    state.window.removeAttribute(REASON_WINDOW_ATTR)
    state.window.removeAttribute(REASON_CAPPED_ATTR)
    state.window.style.removeProperty(REASON_WINDOW_HEIGHT_PROPERTY)
    state.text.removeAttribute(REASON_TEXT_ATTR)
    state.text.style.removeProperty('transform')
  }

  /** Each tick remeasures growth and catches up by whole steps without passing the newest line. */
  function tick(row: Element, state: WindowState) {
    writeStep(row, state, readStep(row, state))
  }

  /** What a text measures now: its own height under the cap, and how far it can still rise there. */
  function measureOf(state: WindowState): Measure {
    const style = getComputedStyle(state.window)
    const capPx = Math.round(tokenNumber(style.getPropertyValue('--dsh-claude-reason-window-cap'), FALLBACKS.cap))
    const textHeight = state.text.offsetHeight
    const height = Math.min(textHeight, capPx)
    return {
      heightPx: `${Math.max(0, height)}px`,
      capped: height >= capPx,
      reachable: Math.max(0, textHeight - height),
    }
  }

  /** What one wait reads off the page, before it writes anything; null once the window is not this module's any more. */
  function readStep(row: Element, state: WindowState): Step | null {
    const live = row.isConnected && state.window.isConnected && state.text.isConnected
      && row.getAttribute(ROW_PHASE_ATTRIBUTE) === RUNNING_STATE
      && row.hasAttribute(EXPANDED_ATTRIBUTE)
      && !motionReduced()
      && readPrefs().reasoningDisplay === REASONING_DISPLAY_STEPPED
    // The host can rebuild the body under the same row (a session switch, a fresh
    // stream): the window follows what the row holds now.
    const current = live ? textOf(row) : null
    if (current === null || current !== state.text) return null
    const style = getComputedStyle(state.window)
    const lineHeight = lineHeightOf(state.text)
    const stepPx = Math.round(lineHeight * tokenNumber(style.getPropertyValue('--dsh-claude-reason-lines'), FALLBACKS.lines))
    const measure = measureOf(state)
    if (!measure.capped) return { heightPx: measure.heightPx, capped: false, offset: 0 }
    const steps = Math.max(1, Math.floor((measure.reachable - state.offset) / Math.max(1, stepPx)))
    return { heightPx: measure.heightPx, capped: true, offset: Math.min(state.offset + steps * stepPx, measure.reachable) }
  }

  /** Write a window's own height and the mark of its capped state; only what changes is written. */
  function writeHeight(window: HTMLElement, height: Height) {
    // The fold watches the row's attributes, and a redundant write each frame
    // would keep the frame scheduler awake.
    if (window.style.getPropertyValue(REASON_WINDOW_HEIGHT_PROPERTY) !== height.heightPx) window.style.setProperty(REASON_WINDOW_HEIGHT_PROPERTY, height.heightPx)
    if (height.capped !== window.hasAttribute(REASON_CAPPED_ATTR)) window.toggleAttribute(REASON_CAPPED_ATTR, height.capped)
  }

  /** Put the text where its rise asks for it, never past the newest line; only what changes is written. */
  function writeOffset(state: WindowState, offset: number) {
    if (offset === state.offset) return
    state.offset = offset
    if (offset === 0) state.text.style.removeProperty('transform')
    else state.text.style.transform = `translateY(${-offset}px)`
  }

  /** Write what one wait read and book the next one. */
  function writeStep(row: Element, state: WindowState, step: Step | null) {
    if (step === null) {
      // Not this module's window any more: the host's own body stands.
      if (windows.get(row) === state) clearWindow(row)
      return
    }
    writeHeight(state.window, step)
    writeOffset(state, step.offset)
    state.timer = window.setTimeout(() => tick(row, state), HOLD_MS)
  }

  /** Grow the window a row holds to what its text measures now; the step's own clock keeps the text where it stands. */
  function writeGrow(state: WindowState, grow: Measure) {
    writeHeight(state.window, grow)
    writeOffset(state, Math.min(state.offset, grow.reachable))
  }

  /** Batch layout reads before writes (D40). */
  function readRows() {
    cancelFrame = null
    queued = false
    const rows = [...pending]
    pending.clear()
    for (const row of rows) {
      if (!row.isConnected) continue
      const running = row.getAttribute(ROW_PHASE_ATTRIBUTE) === RUNNING_STATE
      const text = running && row.hasAttribute(EXPANDED_ATTRIBUTE) && !motionReduced()
        && readPrefs().reasoningDisplay === REASONING_DISPLAY_STEPPED ? textOf(row) : null
      const viewport = text === null ? null : windowOf(row, text)
      const held = windows.get(row)
      if (text === null || viewport === null) {
        if (held !== undefined) plans.push({ row, state: null, step: null, grow: null })
        continue
      }
      // The fold queues a row on every change the host streams into it: that
      // queue is the window's watch, so a text grown since the last step stands
      // in a window as tall as itself within the frame.
      if (held !== undefined && held.text === text && held.window === viewport) {
        plans.push({ row, state: held, step: null, grow: measureOf(held) })
        continue
      }
      const state: WindowState = { window: viewport, text, timer: 0, offset: 0 }
      plans.push({ row, state, step: readStep(row, state), grow: null })
    }
  }

  /** Give each row read this frame the window its phase asks for, grow the window it holds, or take it off. */
  function writeRows() {
    for (const { row, state, step, grow } of plans.splice(0)) {
      if (state === null) {
        if (windows.has(row)) clearWindow(row)
        continue
      }
      if (grow !== null) {
        writeGrow(state, grow)
        continue
      }
      if (windows.has(row)) clearWindow(row)
      windows.set(row, state)
      // The mark is what the stylesheet clips and what the fold's own readers
      // look for; the capped mark joins it from the first wait that reaches the cap.
      state.window.setAttribute(REASON_WINDOW_ATTR, '')
      state.text.setAttribute(REASON_TEXT_ATTR, '')
      writeStep(row, state, step)
    }
    // A row the host replaced takes no wait with it.
    for (const row of [...windows.keys()]) {
      if (row.isConnected) continue
      clearWindow(row)
    }
  }

  function queue(row: Element) {
    if (stopped) return
    pending.add(row)
    if (queued) return
    queued = true
    cancelFrame = requestFrame({ read: readRows, write: writeRows })
  }

  /** Re-read every thinking row after a preference or environment change. */
  function sync() {
    for (const row of thinkRows.all()) queue(row)
  }
  const offPrefs = subscribePrefs(sync)

  return {
    sync,
    queueRow: queue,
    stop() {
      // A row the frame was about to window would otherwise be given a window
      // and a repeating wait after the teardown, with nothing left to clear it.
      stopped = true
      if (cancelFrame !== null) cancelFrame()
      cancelFrame = null
      queued = false
      for (const row of [...windows.keys()]) clearWindow(row)
      pending.clear()
      plans.length = 0
      offPrefs()
      thinkRows.release()
    },
  }
}
