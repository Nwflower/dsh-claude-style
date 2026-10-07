import { STREAM_GLIDE_ATTR } from '../constants'
import { subscribeMutations } from '../core/bus'
import { motionReduced } from '../core/prefs'
import { CONVERSATION_SCROLL_SELECTOR, FOLLOWING_TAIL_SELECTOR, FOLLOW_THRESHOLD_PX, PROCESS_BODY_SELECTOR, SUBMISSION_ECHO_SELECTOR } from '../contracts/dom'
import { conversationScroller, findFollowTailButton } from './chat-dom'
import { isReaderScrollIntent } from './reader-intent'
import { SCROLL_EASE_LEAD_PX, easeScroll, isScrollEasing, scrollEasePosition, scrollEnd, stopScrollEase } from './scroll-ease'

/**
 * The chat area's scroll positions have one writer (D41): the conversation's
 * scroller and every capped process body are written here and nowhere else.
 * Features ask; this module decides, on the spring of shared/scroll-ease.ts.
 *
 * The sources, from the strongest claim to the weakest:
 *
 *   jump      the conversation navigator walking to a turn the reader picked
 *   fold      a fold's own position work: putting the position back after
 *             the skin's press on a group header, and handing the follow
 *             back once a door has rolled
 *   composer  keeping a reader at the end while the composer card changes height
 *   follow    the follow's hand-back at a structural moment
 *   stream    the stream glide: taking the host's pin back and walking the
 *             distance while content streams
 *   process   a capped process body's catch-up
 *
 * The rules, per container:
 *   - a request whose source ranks below the ease running there is refused;
 *     an equal or higher one is carried out, and a write ends a running ease
 *     that ranks below it;
 *   - follow, stream and process requests are refused while the reader holds
 *     the container (readerHolds), and their eases end the moment he does;
 *   - stream requests are refused, and their eases end, for a while after
 *     the reader's own message arrives: the host's jump to it stands;
 *   - while the reader's animation choice means "no animation", an ease is
 *     its destination written at once.
 *
 * The host's side of the follow is handed over here too: the pin a frame of
 * streaming writes is taken back (takeBackHostPin), the host's follow is lit
 * back up through its own button (handBackFollow), and that button is kept
 * out of sight while the stream glide follows (holdFollowButton).
 */

export { SCROLL_EASE_LEAD_PX }

export type ScrollSource ='jump' | 'fold' | 'composer' | 'follow' | 'stream' | 'process'

/** Each source's rank; a higher rank's claim stands over a lower one's. */
export const SCROLL_SOURCE_RANK: Record<ScrollSource, number> = {
  process: 1,
  stream: 2,
  follow: 2,
  composer: 3,
  fold: 4,
  jump: 5,
}
/** The sources that only follow the end: the reader holding a container stops them. */
const FOLLOWING_SOURCES = new Set<ScrollSource>(['follow', 'stream', 'process'])

/** How close to a process body's end the reader has to come for his hold on it to end. */
export const PROCESS_RELEASE_THRESHOLD_PX = 4
/**
 * The two arrivals that are the reader's own submission rather than content
 * streaming in: his own message row, and the echo the host mounts in its
 * place before the real row takes over.
 */
export const SUBMISSION_SELECTOR = '[data-chat-flow-kind="user"], ' + SUBMISSION_ECHO_SELECTOR
/**
 * How long the stream glide stands down after one of them arrives. The
 * host's own jump to a freshly sent message is deliberate — the reader has to
 * see the message he just sent — and the echo is swapped for the real row
 * about a second later, which moves the position again. The stand-down
 * covers both.
 */
export const SUBMISSION_HOLD_MS = 1200
/**
 * How far the position has to move past the stream's own last reading before
 * it counts as the host pinning it rather than the spring taking its own
 * step (both happen inside one frame).
 */
export const HOST_PIN_TOLERANCE_PX = 1
/** How many times a hand-back looks again; the host may turn its follow off a beat later. */
export const FOLLOW_LOOK_ROUNDS = 5
/** The gap between two looks; five of them cover the host's 500 ms sampling window. */
export const FOLLOW_LOOK_INTERVAL_MS = 100
/** How long the looks after a hand-back take. */
export const FOLLOW_LOOK_TOTAL_MS = FOLLOW_LOOK_ROUNDS * FOLLOW_LOOK_INTERVAL_MS

/**
 * The reader's intent events. The conversation reads all but touchmove (a
 * touch drag starts with touchstart); a process body reads all but
 * beforematch (in-page find has nothing to do with a body); "moved since"
 * reads the four that really move a position.
 */
const INTENT_TYPES = ['wheel', 'touchstart', 'touchmove', 'pointerdown', 'keydown', 'beforematch']
const MOVING_INTENT_TYPES = new Set(['wheel', 'touchstart', 'pointerdown', 'keydown'])

/** The source of the ease running on each container; stale once the spring has let go of it. */
const easeSources = new Map<Element, ScrollSource>()
/** The containers the reader holds: an intent was seen there and he has not come back to the end. */
const held = new WeakSet<Element>()
/** When the reader last made a moving intent, for movedSince. */
let lastMovingIntentAt = 0
/** Until this moment the stream glide stands down: the reader's own message just arrived. */
let submissionHoldUntil = 0
/** The conversation's position as the frame started, from its scroll events; the reading a host pin is measured against. */
let seen: { element: Element, top: number } | null = null
/** The host's back-to-end button while it is kept out of sight. */
let heldButton: HTMLElement | null = null
/** The conversation scroller read last; a session switch replaces it, so it is checked before every use. */
let scrollerCache: HTMLElement | null = null
/** How many features use the owner; its listeners live while one does. */
let members = 0
let stopSubmissionWatch: (() => void) | null = null

/** The ease running on a container now, and the source it serves. */
function runningSource(container: Element) {
  if (!isScrollEasing(container)) {
    easeSources.delete(container)
    return undefined
  }
  return easeSources.get(container)
}

/** Whether `source` may move `container` now. */
function claim(container: Element, source: ScrollSource) {
  const running = runningSource(container)
  if (running !== undefined && SCROLL_SOURCE_RANK[source] < SCROLL_SOURCE_RANK[running]) return false
  if (FOLLOWING_SOURCES.has(source) && readerHolds(container)) return false
  if (source === 'stream' && submissionHolds()) return false
  return true
}

/**
 * Whether the reader holds this container: he made an intent there and has
 * not come back within its end's threshold since. Coming back ends the hold
 * here, without a "no movement for this long" timer that would drag a slow
 * reader back.
 */
export function readerHolds(container: Element) {
  if (!held.has(container)) return false
  const threshold = container.matches(PROCESS_BODY_SELECTOR) ? PROCESS_RELEASE_THRESHOLD_PX : FOLLOW_THRESHOLD_PX
  if (container.scrollHeight - container.clientHeight - container.scrollTop > threshold) return true
  held.delete(container)
  return false
}

/** End the reader's hold on a container that no longer shows its own position (a folded body). */
export function releaseReader(container: Element) {
  held.delete(container)
}

/** Whether the reader made a moving intent anywhere after `since` (a performance.now() reading). */
export function readerMovedSince(since: number) {
  return lastMovingIntentAt > since
}

/** Whether the stream glide stands down for the reader's own message right now. */
export function submissionHolds() {
  return performance.now() < submissionHoldUntil
}

function noteIntent(event: Event) {
  if (!isReaderScrollIntent(event)) return
  if (MOVING_INTENT_TYPES.has(event.type)) lastMovingIntentAt = performance.now()
  if (event.type !== 'touchmove') {
    // The container is cached: a trackpad sends hundreds of these a second.
    if (scrollerCache === null || !scrollerCache.isConnected) scrollerCache = conversationScroller()
    const scroller = scrollerCache
    // Only once the content has grown a scrollbar: before that there is nothing to hold.
    if (scroller !== null && scroller.scrollHeight - scroller.clientHeight > 0) held.add(scroller)
  }
  if (event.type === 'beforematch') return
  const target = event.target
  if (!(target instanceof Element)) return
  const body = target.closest(PROCESS_BODY_SELECTOR)
  if (body === null) return
  // A pointer on the body's content is opening a row; the scrollbar is the body's own strip.
  if (event.type === 'pointerdown' && target !== body) return
  // A scroll key the host has already handled knows where it is going.
  if (event.type === 'keydown' && event.defaultPrevented) return
  held.add(body)
}

/**
 * Track the conversation's position as each frame starts: scroll events are
 * fired before the frame's own callbacks, so this is what a pin written
 * during the frame is measured against. A held container that has come back
 * to its end is released here, before content growing under it can move the
 * end away again.
 */
function noteScroll(event: Event) {
  const target = event.target
  if (target instanceof Element && held.has(target)) readerHolds(target)
  if (target instanceof HTMLElement && target.matches(CONVERSATION_SCROLL_SELECTOR)) {
    // Kept with its element: a session switch replaces the scroller.
    seen = { element: target, top: target.scrollTop }
  }
}

function noteSubmission(records: MutationRecord[]) {
  for (const record of records) {
    for (const node of [...record.addedNodes, ...record.removedNodes]) {
      if (node instanceof Element && (node.matches(SUBMISSION_SELECTOR) || node.querySelector(SUBMISSION_SELECTOR) !== null)) {
        submissionHoldUntil = performance.now() + SUBMISSION_HOLD_MS
        return
      }
    }
  }
}

/**
 * Use the owner while a feature is installed: its intent, scroll and
 * submission watches live while any feature does.
 * @returns leave.
 */
export function joinScrollOwner() {
  members += 1
  if (members === 1) {
    for (const type of INTENT_TYPES) document.addEventListener(type, noteIntent, { capture: true, passive: true })
    window.addEventListener('scroll', noteScroll, { capture: true, passive: true })
    stopSubmissionWatch = subscribeMutations(document.body, { childList: true, subtree: true }, noteSubmission)
  }
  let left = false
  return () => {
    if (left) return
    left = true
    members -= 1
    if (members > 0) return
    for (const type of INTENT_TYPES) document.removeEventListener(type, noteIntent, true)
    window.removeEventListener('scroll', noteScroll, true)
    if (stopSubmissionWatch !== null) stopSubmissionWatch()
    stopSubmissionWatch = null
    releaseFollowButton()
    scrollerCache = null
    seen = null
  }
}

/**
 * Put a container's position down now.
 * @returns whether the write was carried out.
 */
export function writeScroll(container: Element, value: number, source: ScrollSource) {
  if (!claim(container, source)) return false
  const running = runningSource(container)
  if (running !== undefined && SCROLL_SOURCE_RANK[running] < SCROLL_SOURCE_RANK[source]) stopScrollEase(container)
  container.scrollTop = value
  return true
}

/**
 * Walk a container's position toward a destination on the spring, replacing
 * the ease running there.
 * @param destination - asked every frame: the position wanted now.
 * @param wanted - asked every frame; false ends the ease where it is.
 * @param lead - the longest stretch glided (shared/scroll-ease.ts).
 * @returns whether the request was carried out.
 */
export function easeScrollFor(container: Element, source: ScrollSource, destination: (element: Element) => number, wanted: () => boolean, lead = SCROLL_EASE_LEAD_PX) {
  if (!claim(container, source)) return false
  if (motionReduced()) {
    stopScrollEase(container)
    container.scrollTop = destination(container)
    return true
  }
  const following = FOLLOWING_SOURCES.has(source)
  easeScroll(container, destination, () => wanted()
    && !(following && readerHolds(container))
    && !(source === 'stream' && submissionHolds()), lead)
  easeSources.set(container, source)
  return true
}

/** Walk a container's position to its end, wherever the end goes. */
export function easeScrollToEndFor(container: Element, source: ScrollSource, wanted: () => boolean) {
  return easeScrollFor(container, source, scrollEnd, wanted)
}

/** End the ease running on a container, when it serves `source` (or whichever source, without one). */
export function stopScrollFor(container: Element, source?: ScrollSource) {
  const running = runningSource(container)
  if (running === undefined) return
  if (source !== undefined && running !== source) return
  stopScrollEase(container)
  easeSources.delete(container)
}

/** Whether an ease is running on a container now. */
export function isScrollMoving(container: Element) {
  return runningSource(container) !== undefined
}

/** The position the ease last wrote on a container, or null while none runs there. */
export function scrollPositionFor(container: Element) {
  return scrollEasePosition(container)
}

/**
 * Take back the end the host wrote this frame while content streams, and
 * leave the distance to the stream glide.
 *
 * The reference a pin is measured against: the spring's own last write while
 * it eases (a position it has just written is one this frame may be at),
 * else the position this scroller was at as the frame started, else the end
 * the frame started at — this frame's end less the column's reported growth.
 * Only a move down is taken back: an upward one is the reader, or the host
 * going somewhere else.
 * @param grew - how far the message column grew this frame, when it did.
 */
export function takeBackHostPin(scroller: HTMLElement, grew?: number) {
  const end = scroller.scrollHeight - scroller.clientHeight
  let expected = scrollEasePosition(scroller)
  if (expected === null && seen !== null && seen.element === scroller) expected = seen.top
  if (expected === null && typeof grew === 'number' && grew > 0) expected = Math.max(0, end - grew)
  if (expected !== null && scroller.scrollTop - expected > HOST_PIN_TOLERANCE_PX) writeScroll(scroller, expected, 'stream')
}

/**
 * Keep the host's own back-to-end button out of sight while the stream glide
 * follows. A position held off the end reads to the host as a reader who left
 * it, so its settlement turns the follow off and renders the button although
 * the glide is following. The mark is this skin's own and the stylesheet hides
 * the button; the host's state is untouched.
 */
export function holdFollowButton() {
  if (document.querySelector(FOLLOWING_TAIL_SELECTOR) !== null) {
    releaseFollowButton()
    return
  }
  const button = findFollowTailButton()
  if (button === heldButton) return
  releaseFollowButton()
  if (button !== null) {
    button.setAttribute(STREAM_GLIDE_ATTR, '')
    heldButton = button
  }
}

/** Let the host's button show again. */
export function releaseFollowButton() {
  if (heldButton === null) return
  heldButton.removeAttribute(STREAM_GLIDE_ATTR)
  heldButton = null
}

/**
 * Hand the conversation back to the host's own follow, lighting it up again
 * when it has been switched off.
 *
 * The host's follow is switched off by a scroll that looks like the reader
 * moving and does not reach the end: that scroll enters its 500 ms sampling
 * window, in which a resize follows nothing, and the settlement compares
 * position rather than intent — so the host's own focus(), a browser clamp
 * and any programmatic write all read as the reader having moved. The host
 * leaves one way back in: the back-to-end button it renders only while the
 * follow is off, whose click clears the window, lights the follow up and
 * reaches the end. Both ways are used, in this order:
 *
 *   walk    the position is walked to the end, so the text above the last
 *           line is pushed up smoothly. Any displacement makes the host's
 *           onScroll take the "reader reached the end" branch, which lights
 *           the follow up and clears the window.
 *   click   no displacement means no scroll event: the start of an execution,
 *           before the content has a scrollbar. Only the button works there.
 *
 * The looks in between are needed: the host often turns the follow off a
 * beat late, once its sampling window settles.
 *
 * @param source - follow for the follow's own hand-back, fold after a door.
 * @param options - stillWanted is asked before every look (the reader can
 *     take over in between); onSettled runs once the round is over.
 */
export function handBackFollow(source: ScrollSource, options?: { stillWanted?: () => boolean, onSettled?: () => void }) {
  const stillWanted = options?.stillWanted ?? (() => true)
  const onSettled = options?.onSettled ?? null
  const scroller = conversationScroller()
  if (scroller === null) {
    if (onSettled !== null) onSettled()
    return
  }
  if (scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop > 0.5) easeScrollToEndFor(scroller, source, stillWanted)
  let rounds = 0
  const look = () => {
    if (!stillWanted() || rounds >= FOLLOW_LOOK_ROUNDS) {
      if (onSettled !== null) onSettled()
      return
    }
    rounds += 1
    // The walk first, the button after it: clicking mid-walk would drop the
    // eased position for the host's own instant jump.
    if (isScrollEasing(scroller)) {
      window.setTimeout(look, FOLLOW_LOOK_INTERVAL_MS)
      return
    }
    // A pinned position does not mean the follow is back: the settlement may
    // switch it off a beat later, and after that only the button brings it back.
    if (document.querySelector(FOLLOWING_TAIL_SELECTOR) === null) {
      const button = findFollowTailButton()
      if (button !== null) {
        button.click()
        if (onSettled !== null) onSettled()
        return
      }
    }
    window.setTimeout(look, FOLLOW_LOOK_INTERVAL_MS)
  }
  window.setTimeout(look, FOLLOW_LOOK_INTERVAL_MS)
}
