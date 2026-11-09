import { motionMs } from '../../shared/motion'

// The build reads these constants to write the step rules.
export { CHAT_REVEAL_COLOR_VAR, CHAT_REVEAL_HIGHLIGHT_PREFIX, CHAT_REVEAL_MIN_OPACITY, CHAT_REVEAL_STEPS } from '../../constants'
/** Changing this duration requires reviewing CHAT_REVEAL_STEPS (D9). */
export const CHAT_REVEAL_MS = motionMs('--dsh-claude-duration-reveal')
/** Stagger scales with the fade duration (D9). */
export const CHAT_REVEAL_STAGGER_DIVISOR = 50
/** Bounds keep the sweep visible without delaying trailing characters. */
export const CHAT_REVEAL_MIN_STAGGER_MS = 1
export const CHAT_REVEAL_MAX_STAGGER_MS = 8
/** Folding rewrites a still-streaming container; skip it until React's mutations settle. */
export const CHAT_REVEAL_FOLD_QUIET_MS = 400
/** Oversized batches are shown without reveal. */
export const CHAT_REVEAL_BURST_LIMIT = 10000
/** Bound all overlapping batches together, before allocating character segments. */
export const CHAT_REVEAL_ACTIVE_LIMIT = 2048
/** How many characters a container that just appeared may hold and still count as "the start of an answer". */
export const CHAT_REVEAL_FIRST_SIGHT_LIMIT = 200
/** A gap between frames longer than this means no frame was drawn in between (a hidden page, or a held-up main thread). */
export const CHAT_REVEAL_FRAME_GAP_MS = 40
/** A normal frame at 60 Hz; the compensation subtracts it from the blank so segments continue where they were. */
export const CHAT_REVEAL_NOMINAL_FRAME_MS = 16.7
/** A frame gap longer than this counts as slow: under 20 fps the fade's steps sit for tens of milliseconds each. */
export const CHAT_REVEAL_SLOW_FRAME_MS = 50
/** This many slow frames in a row before the engine gives way; one long task must not switch the fade off. */
export const CHAT_REVEAL_SLOW_FRAME_RUN = 4
/** A gap this long is a hidden page (rAF stopped), not a busy main thread. */
export const CHAT_REVEAL_HIDDEN_GAP_MS = 1000
/** How long after giving way new characters are let through at full strength. */
export const CHAT_REVEAL_YIELD_MS = 3000
/** The most characters the rewritten middle may hold and still be diffed; beyond it the whole block was rewritten. */
export const CHAT_REVEAL_REWRITE_DIFF_BUDGET = 4096
/** The most characters a diffed rewrite may add and still animate. */
export const CHAT_REVEAL_LOCAL_REWRITE_LIMIT = 64

/** One fading stretch of characters. */
export interface RevealRun {
  /** The streaming container the characters arrived in. */
  container: Element
  /** Offset into the container's joined text, and how many UTF-16 units. */
  start: number
  length: number
  bornAt: number
  delay: number
  /** The element whose colour was last published for this segment. */
  colorElement: HTMLElement | null
}

/** One text node's offset in the container's text, with the text it held when the scan read it. */
export interface RevealTextEntry {
  node: Text
  start: number
  data: string
}

/** A streaming container's text length and the nodes it is made of. */
export interface RevealSnapshot {
  length: number
  entries: RevealTextEntry[]
}

/** The empty engine state; the installer fills the history containers it found on the page. */
export function createRevealState(): RevealState {
  return {
    liveRuns: [],
    historyContainers: new WeakSet<Element>(),
    textSnapshots: new WeakMap<Element, RevealSnapshot>(),
    foldQuietUntil: new WeakMap<Element, number>(),
    liveContainers: [],
    lastFrameAt: 0,
    slowFrames: 0,
    yieldUntil: 0,
    cancelPaintFrame: null,
  }
}

/** Scan and paint modules share this object so scalar state writes remain visible to both. */
export interface RevealState {
  /** The segments still fading. */
  liveRuns: RevealRun[]
  /** Streaming containers already on the page when the engine installed: they are history and do not replay. */
  historyContainers: WeakSet<Element>
  /** Each streaming container's text snapshot, written by the scan and reused by the paint. */
  textSnapshots: WeakMap<Element, RevealSnapshot>
  /** Containers the reader just folded, quiet until this moment. */
  foldQuietUntil: WeakMap<Element, number>
  /** The streaming containers on the page at the last full scan; segments and snapshots of the ones gone are dropped. */
  liveContainers: Element[]
  /** The last paint frame's timestamp; 0 before the first. */
  lastFrameAt: number
  /** Slow frames in a row; at CHAT_REVEAL_SLOW_FRAME_RUN the engine gives way. */
  slowFrames: number
  /** New characters are not queued before this moment: the main thread is busy (see the painter's yield). */
  yieldUntil: number
  /** Cancels the queued paint frame; null when none. */
  cancelPaintFrame: (() => void) | null
}
