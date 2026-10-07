/**
 * The reveal engine's tuning table and the shapes its modules pass around:
 * the constants, one fading segment, one container's snapshot, and the state
 * the factory owns.
 */

export const CHAT_REVEAL_STEPS = 24
/** The faintest step: a fifth faint, which still reads as text arriving in both themes. */
export const CHAT_REVEAL_MIN_OPACITY = 0.2
/**
 * How long a character takes to become fully opaque. Not a preference: a longer
 * fade would spread the step rules into visible steps, a shorter one crosses
 * in a single frame. Moving it means moving the step count and its rules too.
 */
export const CHAT_REVEAL_MS = 120
/** The prefix of every highlight name this engine registers (reveal-rules.css carries the same names by hand). */
export const CHAT_REVEAL_HIGHLIGHT_PREFIX = 'dsh-claude-tok-'
/** The custom property an element publishes its own colour to; the step rules read it inside ::highlight(). */
export const CHAT_REVEAL_COLOR_VAR = '--dsh-claude-run-color'
/** The share of one fade a batch's stagger spreads over: proportional to the fade, so neither pace lets staggering take over. */
export const CHAT_REVEAL_STAGGER_DIVISOR = 50
/** The stagger step's bounds: smaller shows no sweep, larger makes the last characters late. */
export const CHAT_REVEAL_MIN_STAGGER_MS = 1
export const CHAT_REVEAL_MAX_STAGGER_MS = 8
/**
 * How long a container is left out of the reveal after a fold.
 *
 * A container carries data-streaming for the whole turn, including the answer
 * that arrives after the reasoning stops, so pressing a thinking or tool row
 * rewrites a container the scan is still reading. This is long enough to cover
 * React's re-render and the mutations it makes, and short enough that a stream
 * resuming right after the press still animates.
 */
export const CHAT_REVEAL_FOLD_QUIET_MS = 400
/**
 * The most characters one batch may hold.
 *
 * The segment count is the batch's character count and multiplies every frame
 * (one Range per segment): a measured fifteen thousand characters arriving at
 * once pushes a single frame to 700 ms, and the frame-gap compensation keeps
 * those segments alive so the page cannot catch up. Real streaming batches run
 * a median of a dozen characters, so this gate is never touched.
 */
export const CHAT_REVEAL_BURST_LIMIT = 10000
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

/** One text node's offset in the joined text the scan built for its container. */
export interface RevealTextEntry {
  node: Text
  start: number
}

/** A streaming container's joined text and the nodes it was joined from. */
export interface RevealSnapshot {
  text: string
  entries: RevealTextEntry[]
}

/**
 * Everything the engine factory owns. The paint loop and the scan are separate
 * modules and share it instead of closing over the factory's locals; a scalar
 * they write (lastFrameAt, slowFrames, yieldUntil, cancelPaintFrame) has to
 * come back through the same object.
 */
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
