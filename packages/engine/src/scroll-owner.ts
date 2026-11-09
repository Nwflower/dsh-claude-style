import { subscribeMutations } from './bus'
import { skin } from './skin'
import { COMPOSER_SELECTOR, CONVERSATION_SCROLL_SELECTOR, CONVERSATION_SESSION_ATTRIBUTE, CONVERSATION_SESSION_SELECTOR, FOLLOW_THRESHOLD_PX, PROCESS_BODY_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { SCROLL_KEYS, SUBMISSION_ROW_SELECTOR, conversationScroller, findFollowTailButton, isScrollbarStrip } from './chat-dom'
import { SCROLL_EASE_LEAD_PX, easeScroll, isScrollEasing, scrollEasePosition, scrollEnd, stopScrollEase } from './scroll-ease'

/**
 * The chat area's scroll positions have one writer (D40): features ask, this module decides on the spring of scroll-ease.ts. Sources rank jump > fold > reader > composer > follow > process; a request below the ease running is refused, and composer, follow and process are refused while the reader holds the container. The reader source is his own position held under a stream's growth.
 * While content streams nothing here writes: the host's follow pins the end, and the follow feature slides what the pin pushed up (D85). The reader's own wheel stays the browser's and is only recorded (noteIntent), so the following sources stand down; the scroller above a held container carries skin().readerHold for the waiting line's pin.
 */

export { SCROLL_EASE_LEAD_PX }

export type ScrollSource ='jump' | 'fold' | 'reader' | 'composer' | 'follow' | 'process'

/** Each source's rank; a higher rank's claim stands over a lower one's. */
const SCROLL_SOURCE_RANK: Record<ScrollSource, number> = {
  process: 1,
  follow: 2,
  composer: 3,
  reader: 4,
  fold: 5,
  jump: 6,
}
/** The sources that only follow the end: the reader holding a container stops them. */
const FOLLOWING_SOURCES = new Set<ScrollSource>(['composer', 'follow', 'process'])

/** How close to a process body's end the reader has to come for his hold on it to end. */
const PROCESS_RELEASE_THRESHOLD_PX = 4
/**
 * How long the stream slide stands down after a submission arrives: the host's jump to a message just sent is deliberate, and its echo row (SUBMISSION_ROW_SELECTOR, chat-dom.ts) is swapped for the real one about a second later, which moves the position again.
 */
const SUBMISSION_HOLD_MS = 1200
/** How many times a hand-back looks again; the host may turn its follow off a beat later. */
const FOLLOW_LOOK_ROUNDS = 5
/** The gap between two looks; five of them cover the host's 500 ms sampling window. */
const FOLLOW_LOOK_INTERVAL_MS = 100

/** The reader's intent events: a process body reads all but beforematch, and "moved since" reads only the four that move a position. */
const INTENT_TYPES = ['wheel', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'pointerdown', 'keydown', 'beforematch']
const MOVING_INTENT_TYPES = new Set(['wheel', 'touchstart', 'pointerdown', 'keydown'])
/** The two ends of a touch drag: the finger leaves the screen, and the drag's aim decides the hold. */
const TOUCH_END_TYPES = new Set(['touchend', 'touchcancel'])

/** Whether an event is the reader taking the scroll over: a pointer or key inside the composer is him typing, and of the keys only the ones that scroll the viewport count. */
function isReaderScrollIntent(event: Event) {
  const target = event.target
  if (target instanceof Element && target.closest(COMPOSER_SELECTOR) !== null) return false
  if (event.type !== 'keydown') return true
  return event instanceof KeyboardEvent && SCROLL_KEYS.has(event.key)
}

/** The source of the ease running on each container, stale once the spring has let go. A WeakMap because a spring that arrives on its own never asks again, and a Map would hold the container and its conversation subtree for the life of the page. */
const easeSources = new WeakMap<Element, ScrollSource>()
/** The containers the reader holds: an intent was seen there and he has not come back to the end. A Set, so leaving the owner can take every mark off again. */
const held = new Set<Element>()
/** The position the reader chose on each held container; host writes to the tail never replace it. */
const readerPositions = new WeakMap<Element, number>()
/** The held containers the reader has since moved toward the end of: his own way back to it. */
const heldTowardEnd = new WeakSet<Element>()
/** The conversation scrollers carrying the hold mark, so leaving the owner can take every one off again. */
const markedScrollers = new Set<Element>()
/** When the reader last made a moving intent, for movedSince. */
let lastMovingIntentAt = 0
/** The vertical reading the current touch drag last reported: touchstart's reading is its origin, and each touchmove's travel aims the hold. */
let touchContactY: number | null = null

/** The contact's vertical reading, or null when the event carries none. */
function contactY(event: TouchEvent): number | null {
  const contact = event.changedTouches[0]
  return contact === undefined ? null : contact.clientY
}
/** Until this moment the stream slide stands down: the reader's own message just arrived. */
let submissionHoldUntil = 0
/** The conversation the owner last worked in, for the hold above; null before the first is claimed. */
let claimedSession: string | null = null
/** How many features use the owner; its listeners live while one does. */
let members = 0
/** Bumped when the owner's listeners go: work begun by one installation ends with it. */
let ownerGeneration = 0
let stopSubmissionWatch: (() => void) | null = null

/** Publish the hold on the container's conversation scroller, where the waiting line's pin hangs (chat-wait.css); a flip there invalidates the conversation's subtree rather than the document (D9). A held container with no conversation scroller above it marks nothing. */
function syncHoldMark(container: Element) {
  const scroller = container.closest(CONVERSATION_SCROLL_SELECTOR)
  if (scroller === null) return
  let anyHeld = false
  for (const candidate of held) {
    if (candidate === scroller || scroller.contains(candidate)) {
      anyHeld = true
      break
    }
  }
  if (anyHeld) {
    scroller.setAttribute(skin().readerHold, '')
    markedScrollers.add(scroller)
    return
  }
  scroller.removeAttribute(skin().readerHold)
  markedScrollers.delete(scroller)
}

/** Put a container's hold down or take it up with the mark the page reads (the waiting line's pin, chat-wait.css); every change of `held` goes through here, so the two cannot disagree. */
function setHeld(container: Element, holding: boolean) {
  if (holding === held.has(container)) return
  if (holding) {
    held.add(container)
    readerPositions.set(container, container.scrollTop)
  } else {
    held.delete(container)
    readerPositions.delete(container)
    heldTowardEnd.delete(container)
  }
  syncHoldMark(container)
}

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
  claimConversation()
  const running = runningSource(container)
  if (running !== undefined && SCROLL_SOURCE_RANK[source] < SCROLL_SOURCE_RANK[running]) return false
  if (FOLLOWING_SOURCES.has(source) && readerHolds(container)) return false
  return true
}

/** The reader's chosen position, or null while that container is not held. */
export function readerScrollPosition(container: Element): number | null {
  return readerPositions.get(container) ?? null
}

/**
 * Whether the reader holds this container: he made an intent there and has not come back within its end's threshold since. A position at the end does not end the hold, because the host's follow keeps writing it there; only his own move toward the end does (heldTowardEnd).
 */
export function readerHolds(container: Element) {
  if (!held.has(container)) return false
  // Only a move toward the end can end a hold, so a hold without one is
  // answered without reading the position: every following source asks on
  // every frame it runs, and a reading taken after the host's writes is a
  // layout pass over the whole page (D9).
  if (!heldTowardEnd.has(container)) return true
  const threshold = container.matches(PROCESS_BODY_SELECTOR) ? PROCESS_RELEASE_THRESHOLD_PX : FOLLOW_THRESHOLD_PX
  if (container.scrollHeight - container.clientHeight - container.scrollTop > threshold) return true
  setHeld(container, false)
  return false
}

/** End the reader's hold on a container that no longer shows its own position (a folded body). */
export function releaseReader(container: Element) {
  setHeld(container, false)
}

/**
 * Settle a hold the reader's drag has carried back to the end, and hand the conversation's follow back with it: the end of a drag sends no scroll of its own, and the host's follow then comes back only from a scroll landing at the end or from its back-to-end button.
 */
function releaseAtTail(container: Element) {
  if (readerHolds(container)) return
  if (!container.matches(CONVERSATION_SCROLL_SELECTOR)) return
  // The walk in flight gives up where the reader takes the container again, and
  // where the owner has been left: a hand-back outlives the frame it began in.
  const generation = ownerGeneration
  handBackFollow('follow', { stillWanted: () => generation === ownerGeneration && !held.has(container) })
}

/**
 * Take the reader's hold on a container without an intent event: a jump to a turn he picked is him choosing where to read, so the following sources stand down until his move toward the end or a position already at the end ends it.
 * @param container - the container the reader is now reading.
 */
export function holdReader(container: Element) {
  heldTowardEnd.delete(container)
  setHeld(container, true)
}

/** Whether the reader made a moving intent anywhere after `since` (a performance.now() reading). */
export function readerMovedSince(since: number) {
  return lastMovingIntentAt > since
}

/** Whether the stream slide (features/chat-follow/chat-follow.ts) stands down for the reader's own message right now. */
export function submissionHolds() {
  return performance.now() < submissionHoldUntil
}

/**
 * The conversation's element as it was last seen, and the session it belonged
 * to; the element is read again once a session switch replaces it.
 */
let sessionElement: Element | null = null
let sessionId: string | null = null

/**
 * Note which conversation the owner is working in, and drop what belonged to the previous one: the submission hold is armed by the rows a conversation renders, so left standing it would hold the stream slide down over the history the new conversation opens.
 */
function claimConversation() {
  if (sessionElement === null || !sessionElement.isConnected) {
    sessionElement = conversationScroller()?.closest(CONVERSATION_SESSION_SELECTOR) ?? null
  }
  const next = sessionElement?.getAttribute(CONVERSATION_SESSION_ATTRIBUTE) ?? null
  if (next === sessionId) return
  sessionId = next
  submissionHoldUntil = 0
}

/**
 * Whether an intent is the reader's move in the conversation: inside its scroller, or a key pressed with nothing else focused. A press or wheel anywhere else moves something else, and taken as a hold it would stop the follow and leave every following source reading the position each frame.
 */
function intentReaches(scroller: Element, event: Event) {
  const target = event.target
  if (event.type === 'keydown') return target === document.body || target === document.documentElement || (target instanceof Node && scroller.contains(target))
  return target instanceof Node && scroller.contains(target)
}

function noteIntent(event: Event) {
  if (!isReaderScrollIntent(event)) return
  const moving = MOVING_INTENT_TYPES.has(event.type)
  if (moving) lastMovingIntentAt = performance.now()
  // The finger left the screen: the drag it ends is aimed already, so this
  // settles holds and takes no new one. Read before the branches below, which
  // would otherwise hold a reader who is leaving.
  if (TOUCH_END_TYPES.has(event.type)) {
    touchContactY = null
    for (const container of [...held]) releaseAtTail(container)
    return
  }
  // A wheel carries where the reader is going; the others read as his move
  // toward the end, since no follower sends them. A touchstart takes the hold
  // with no direction of its own — aimed at the end from the start, the hold
  // would end as soon as the stream's own pin left the position at the end —
  // and each touchmove aims it by the contact's vertical travel alone.
  let towardEnd = !(event instanceof WheelEvent) || event.deltaY >= 0
  let touchAim: boolean | null = null
  if (event instanceof TouchEvent) {
    const y = contactY(event)
    if (event.type === 'touchstart') {
      touchContactY = y
      towardEnd = false
    } else if (y !== null) {
      if (touchContactY !== null && y !== touchContactY) touchAim = y < touchContactY
      touchContactY = y
    }
  }
  if (event.type !== 'touchmove') {
    // The container is kept by packages/engine/src/chat-dom.ts: a trackpad sends
    // hundreds of these a second.
    const scroller = conversationScroller()
    claimConversation()
    // Only once the content has grown a scrollbar: before that there is nothing to hold.
    if (scroller !== null && intentReaches(scroller, event) && scroller.scrollHeight - scroller.clientHeight > 0) {
      if (moving && towardEnd) heldTowardEnd.add(scroller)
      setHeld(scroller, true)
    }
  } else if (touchAim !== null) {
    // The drag's travel aims the hold its touchstart took: up toward the end,
    // down away from it. A touchmove without a hold aims nothing, and a drag
    // that left the conversation aims no hold it does not own.
    const scroller = conversationScroller()
    claimConversation()
    if (scroller !== null && held.has(scroller)) {
      if (touchAim) heldTowardEnd.add(scroller)
      else heldTowardEnd.delete(scroller)
    }
  }
  if (event.type === 'beforematch') return
  const target = event.target
  if (!(target instanceof Element)) return
  const body = target.closest(PROCESS_BODY_SELECTOR)
  if (body === null) return
  // Only a press on a body's own scrollbar strip is kept; content reached
  // through a body is opening something. The event is addressed to the body
  // exactly when the pointer is on the bar, which is what the predicate is handed.
  if (event.type === 'pointerdown' && !(event instanceof PointerEvent && isScrollbarStrip(body, event, target))) return
  // A scroll key the host has already handled knows where it is going.
  if (event.type === 'keydown' && event.defaultPrevented) return
  if (moving && towardEnd) heldTowardEnd.add(body)
  else if (touchAim !== null && held.has(body)) {
    if (touchAim) heldTowardEnd.add(body)
    else heldTowardEnd.delete(body)
  }
  setHeld(body, true)
}

/** Release a held container as it comes back to its end, before growth can move the end away again, and hand a released conversation back to the host's follow. */
function noteScroll(event: Event) {
  const target = event.target
  if (!(target instanceof Element) || !held.has(target)) return
  // The host's follow writes the tail after growth. That position belongs to
  // the host; any other position is the reader's own latest reading place.
  if (target.scrollHeight - target.clientHeight - target.scrollTop > 0.5) readerPositions.set(target, target.scrollTop)
  releaseAtTail(target)
}

function noteSubmission(records: MutationRecord[]) {
  for (const record of records) {
    for (const node of [...record.addedNodes, ...record.removedNodes]) {
      if (node instanceof Element && (node.matches(SUBMISSION_ROW_SELECTOR) || node.querySelector(SUBMISSION_ROW_SELECTOR) !== null)) {
        submissionHoldUntil = performance.now() + SUBMISSION_HOLD_MS
        return
      }
    }
  }
}

/** Every observed change of the body: a submission's arrival. */
function noteBodyChanges(records: MutationRecord[]) {
  noteSubmission(records)
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
    stopSubmissionWatch = subscribeMutations(document.body, { childList: true, subtree: true }, noteBodyChanges)
  }
  let left = false
  return () => {
    if (left) return
    left = true
    members -= 1
    if (members > 0) return
    ownerGeneration += 1
    for (const type of INTENT_TYPES) document.removeEventListener(type, noteIntent, true)
    window.removeEventListener('scroll', noteScroll, true)
    if (stopSubmissionWatch !== null) stopSubmissionWatch()
    stopSubmissionWatch = null
    for (const scroller of markedScrollers) scroller.removeAttribute(skin().readerHold)
    markedScrollers.clear()
    for (const container of held) {
      heldTowardEnd.delete(container)
      readerPositions.delete(container)
    }
    held.clear()
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
 * @param lead - the longest stretch glided (packages/engine/src/scroll-ease.ts).
 * @returns whether the request was carried out.
 */
export function easeScrollFor(container: Element, source: ScrollSource, destination: (element: Element, end: number) => number, wanted: () => boolean, lead = SCROLL_EASE_LEAD_PX) {
  if (!claim(container, source)) return false
  if (skin().motionReduced()) {
    stopScrollEase(container)
    container.scrollTop = destination(container, scrollEnd(container))
    return true
  }
  const following = FOLLOWING_SOURCES.has(source)
  easeScroll(container, destination, () => wanted() && !(following && readerHolds(container)), lead)
  easeSources.set(container, source)
  return true
}

/** Walk a container's position to its end, wherever the end goes. */
export function easeScrollToEndFor(container: Element, source: ScrollSource, wanted: () => boolean) {
  return easeScrollFor(container, source, (_element, end) => end, wanted)
}

/** End the ease running on a container, when it serves `source` (or whichever source, without one). */
export function stopScrollFor(container: Element, source?: ScrollSource) {
  const running = runningSource(container)
  if (running === undefined) return
  if (source !== undefined && running !== source) return
  stopScrollEase(container)
  easeSources.delete(container)
}

/** The position the ease last wrote on a container, or null while none runs there. */
export function scrollPositionFor(container: Element) {
  return scrollEasePosition(container)
}

/**
 * Hand the conversation back to the host's own follow, lighting it up again when it is off. The host turns its follow off on any write inside its 500 ms sampling window and leaves one way back: the back-to-end button it renders only while off. The position is walked to the end first, so the host's onScroll sees the reader reach it; the button click covers the start of an execution, when there is no scrollbar and no scroll event. The looks in between cover the host turning its follow off a beat late.
 * @param source - follow for the follow's own hand-back, fold after a door.
 * @param options - stillWanted is asked before every look; onSettled runs once the round is over.
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
    // switch it off a beat later, and after that only the button brings it
    // back. The button stands on the page only while the follow is off, so
    // finding one is the reading.
    const button = findFollowTailButton()
    if (button !== null) {
      button.click()
      if (onSettled !== null) onSettled()
      return
    }
    window.setTimeout(look, FOLLOW_LOOK_INTERVAL_MS)
  }
  window.setTimeout(look, FOLLOW_LOOK_INTERVAL_MS)
}
