import { subscribeMutations } from './bus'
import { conversationSession, observeSession } from './host'
import { skin } from './skin'
import { CHAT_RUNNING_SELECTOR, COMPOSER_SELECTOR, CONVERSATION_SCROLL_SELECTOR, FOLLOW_THRESHOLD_PX, PROCESS_BODY_SELECTOR, SIDEBAR_SLOT_SELECTOR, STREAMING_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { SCROLL_KEYS, SUBMISSION_ROW_SELECTOR, conversationScroller, findFollowTailButton, isScrollbarStrip } from './chat-dom'
import { SCROLL_EASE_LEAD_PX, easeScroll, isScrollEasing, scrollEasePosition, scrollEnd, stopAllScrollEases, stopScrollEase } from './scroll-ease'

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
/** Scroll keys that move away from the conversation's tail; Shift+Space joins them. */
const UPWARD_SCROLL_KEYS = new Set(['ArrowUp', 'PageUp', 'Home'])
/** Subtrees whose mutations are streaming tokens or sidebar chrome, never a user submission row. */
const NON_SUBMISSION_SUBTREE = `${SIDEBAR_SLOT_SELECTOR}, ${STREAMING_SELECTOR}, ${CHAT_RUNNING_SELECTOR}`
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
/** The scroll range (scrollHeight - clientHeight) when readerPositions was last recorded, to tell a host growth pin from reader travel. */
const readerFloors = new WeakMap<Element, number>()
/** The held containers the reader has since moved toward the end of: his own way back to it. */
const heldTowardEnd = new WeakSet<Element>()
/** The conversation scrollers carrying the hold mark, so leaving the owner can take every one off again. */
const markedScrollers = new Set<Element>()
/** When the reader last made a moving intent, for movedSince. */
let lastMovingIntentAt = 0
/** The vertical reading the current touch drag last reported: touchstart's reading is its origin, and each touchmove's travel aims the hold. */
let touchContactY: number | null = null
/** The container whose scrollbar strip is currently pressed; direction follows actual scroll travel until release. */
let scrollbarDrag: Element | null = null

/** The contact's vertical reading, or null when the event carries none. */
function contactY(event: TouchEvent): number | null {
  const contact = event.changedTouches[0]
  return contact === undefined ? null : contact.clientY
}
/** Until this moment the stream slide stands down: the reader's own message just arrived. */
let submissionHoldUntil = 0
/** The conversation the owner last worked in, for the hold above; null before the first is claimed. */
/** How many features use the owner; its listeners live while one does. */
let members = 0
/** Bumped when the owner's listeners go: work begun by one installation ends with it. */
let ownerGeneration = 0
let stopSubmissionWatch: (() => void) | null = null
let stopSessionWatch: (() => void) | null = null

/**
 * Drop the containers the page took away. A detached container never sends the
 * scroll that ends its hold, so an entry left in `held` would keep the whole
 * transcript under it reachable: a session switch replaces the conversation
 * subtree, and the holds taken on the old one are finished there.
 */
function forgetDetached() {
  for (const container of [...held]) {
    if (container.isConnected) continue
    held.delete(container)
    readerPositions.delete(container)
    readerFloors.delete(container)
    heldTowardEnd.delete(container)
  }
  for (const scroller of [...markedScrollers]) {
    if (scroller.isConnected) continue
    scroller.removeAttribute(skin().readerHold)
    markedScrollers.delete(scroller)
  }
}

/** Publish the hold on the container's conversation scroller, where the waiting line's pin hangs (chat-wait.css); a flip there invalidates the conversation's subtree rather than the document (D9). A held container with no conversation scroller above it marks nothing. */
function syncHoldMark(container: Element) {
  forgetDetached()
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
function floorOf(container: Element) {
  return Math.max(0, container.scrollHeight - container.clientHeight)
}

function setHeld(container: Element, holding: boolean) {
  if (holding === held.has(container)) return
  if (holding) {
    held.add(container)
    readerPositions.set(container, container.scrollTop)
    readerFloors.set(container, floorOf(container))
  } else {
    held.delete(container)
    readerPositions.delete(container)
    readerFloors.delete(container)
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
/**
 * Whether a tail reading on the container came from the host pinning new growth
 * rather than the reader travelling to the end: the floor grew while the
 * reader's last recorded position still sat beyond the release band.
 */
function isHostGrowthPin(container: Element, floor: number, threshold: number) {
  if (scrollbarDrag === container || floor - container.scrollTop > 0.5) return false
  const prevTop = readerPositions.get(container)
  const prevFloor = readerFloors.get(container)
  return prevTop !== undefined
    && prevFloor !== undefined
    && floor > prevFloor + 0.5
    && prevFloor - prevTop > threshold
}

export function readerHolds(container: Element) {
  if (!held.has(container)) return false
  // Only a move toward the end can end a hold, so a hold without one is
  // answered without reading the position: every following source asks on
  // every frame it runs, and a reading taken after the host's writes is a
  // layout pass over the whole page (D9).
  if (!heldTowardEnd.has(container)) return true
  const threshold = container.matches(PROCESS_BODY_SELECTOR) ? PROCESS_RELEASE_THRESHOLD_PX : FOLLOW_THRESHOLD_PX
  const floor = floorOf(container)
  if (floor - container.scrollTop > threshold) return true
  if (isHostGrowthPin(container, floor, threshold)) {
    heldTowardEnd.delete(container)
    readerFloors.set(container, floor)
    return true
  }
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

/** Per session: the id last claimed; observeSession releases its holds on a switch (D91). */
let sessionId: string | null = null

/** Per-session holds, gestures and submission pauses end even while old DOM stays mounted (D91). */
function releaseSession() {
  ownerGeneration += 1
  submissionHoldUntil = 0
  touchContactY = null
  stopAllScrollEases()
  for (const container of held) {
    readerPositions.delete(container)
    readerFloors.delete(container)
    heldTowardEnd.delete(container)
  }
  held.clear()
  if (scrollbarDrag !== null) endScrollbarDrag()
  for (const scroller of markedScrollers) scroller.removeAttribute(skin().readerHold)
  markedScrollers.clear()
}

/**
 * Note which conversation the owner is working in, and drop what belonged to the previous one: the submission hold is armed by the rows a conversation renders, so left standing it would hold the stream slide down over the history the new conversation opens.
 */
function claimConversation() {
  const next = conversationSession()
  if (next === sessionId) return
  sessionId = next
  releaseSession()
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
  // Direction follows the gesture itself: wheel delta, scroll key polarity, or
  // actual scroll travel under a scrollbar drag. Upward keys, beforematch and
  // scrollbar presses start aimed away so the first scroll step never drops the hold.
  let towardEnd = true
  if (event instanceof WheelEvent) towardEnd = event.deltaY >= 0
  else if (event instanceof KeyboardEvent) towardEnd = !(UPWARD_SCROLL_KEYS.has(event.key) || (event.key === ' ' && event.shiftKey))
  else if (event.type === 'pointerdown' || event.type === 'beforematch') towardEnd = false

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
  const target = event.target
  const isScrollPointer = (container: Element) =>
    event.type !== 'pointerdown'
    || (event instanceof PointerEvent && (isScrollbarStrip(container, event, target) || event.button === 1))

  if (event.type !== 'touchmove') {
    const scroller = conversationScroller()
    claimConversation()
    if (scroller !== null && intentReaches(scroller, event) && isScrollPointer(scroller) && scroller.scrollHeight - scroller.clientHeight > 0) {
      if (event.type === 'pointerdown') beginScrollbarDrag(scroller)
      if (moving) {
        if (towardEnd) {
          heldTowardEnd.add(scroller)
          readerFloors.set(scroller, floorOf(scroller))
        } else {
          heldTowardEnd.delete(scroller)
        }
      }
      setHeld(scroller, true)
    }
  } else if (touchAim !== null) {
    const scroller = conversationScroller()
    claimConversation()
    if (scroller !== null && held.has(scroller)) {
      if (touchAim) heldTowardEnd.add(scroller)
      else heldTowardEnd.delete(scroller)
    }
  }
  if (event.type === 'beforematch') return
  if (!(target instanceof Element)) return
  const body = target.closest(PROCESS_BODY_SELECTOR)
  if (body === null) return
  if (!isScrollPointer(body)) return
  if (event.type === 'keydown' && event.defaultPrevented) return
  if (event.type === 'pointerdown') beginScrollbarDrag(body)
  if (moving) {
    if (towardEnd) {
      heldTowardEnd.add(body)
      readerFloors.set(body, floorOf(body))
    } else {
      heldTowardEnd.delete(body)
    }
  } else if (touchAim !== null && held.has(body)) {
    if (touchAim) heldTowardEnd.add(body)
    else heldTowardEnd.delete(body)
  }
  setHeld(body, true)
}

function endScrollbarDrag() {
  const dragged = scrollbarDrag
  scrollbarDrag = null
  document.removeEventListener('pointerup', endScrollbarDrag, true)
  document.removeEventListener('pointercancel', endScrollbarDrag, true)
  window.removeEventListener('blur', endScrollbarDrag)
  if (dragged !== null && held.has(dragged)) releaseAtTail(dragged)
}

function beginScrollbarDrag(container: Element) {
  scrollbarDrag = container
  document.addEventListener('pointerup', endScrollbarDrag, true)
  document.addEventListener('pointercancel', endScrollbarDrag, true)
  window.addEventListener('blur', endScrollbarDrag)
}

/** Release a held container as it comes back to its end, before growth can move the end away again, and hand a released conversation back to the host's follow. */
function noteScroll(event: Event) {
  const target = event.target
  if (!(target instanceof Element) || !held.has(target)) return
  const floor = floorOf(target)
  const prevTop = readerPositions.get(target)
  if (scrollbarDrag === target && prevTop !== undefined) {
    if (target.scrollTop > prevTop + 0.5) heldTowardEnd.add(target)
    else if (target.scrollTop < prevTop - 0.5) heldTowardEnd.delete(target)
  }
  const threshold = target.matches(PROCESS_BODY_SELECTOR) ? PROCESS_RELEASE_THRESHOLD_PX : FOLLOW_THRESHOLD_PX
  const hostGrowthPin = isHostGrowthPin(target, floor, threshold)
  if (floor - target.scrollTop > 0.5) {
    readerPositions.set(target, target.scrollTop)
    readerFloors.set(target, floor)
  }
  if (!hostGrowthPin) releaseAtTail(target)
}

function hasSubmissionNode(nodes: NodeList) {
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i]
    if (node instanceof Element && (node.matches(SUBMISSION_ROW_SELECTOR) || node.querySelector(SUBMISSION_ROW_SELECTOR) !== null)) {
      return true
    }
  }
  return false
}

function noteSubmission(records: MutationRecord[]) {
  for (let i = 0; i < records.length; i += 1) {
    const record = records[i]
    if (record.addedNodes.length === 0 && record.removedNodes.length === 0) continue
    if (record.target instanceof Element && record.target.closest(NON_SUBMISSION_SUBTREE) !== null) continue
    if (hasSubmissionNode(record.addedNodes) || hasSubmissionNode(record.removedNodes)) {
      submissionHoldUntil = performance.now() + SUBMISSION_HOLD_MS
      return
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
    sessionId = conversationSession()
    stopSessionWatch = observeSession(() => claimConversation())
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
    for (const type of INTENT_TYPES) document.removeEventListener(type, noteIntent, true)
    window.removeEventListener('scroll', noteScroll, true)
    if (stopSubmissionWatch !== null) stopSubmissionWatch()
    stopSubmissionWatch = null
    stopSessionWatch?.()
    stopSessionWatch = null
    releaseSession()
    sessionId = null
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
  const generation = ownerGeneration
  const stillWanted = () => generation === ownerGeneration && (options?.stillWanted?.() ?? true)
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
