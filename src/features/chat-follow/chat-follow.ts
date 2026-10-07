import { CHAT_FOLLOW_ATTR, STREAM_GLIDE_ATTR } from '../../constants'
import { motionReduced } from '../../core/prefs'
import { conversationScroller, ensureFollowTail, findFollowTailButton, isAtBottom } from './chat-tail'
import { createChatProcessFollow } from './process-follow'
import { isReaderScrollIntent } from './reader-intent'
import { CHAT_CALL_SELECTOR, CHAT_FLOW_SELECTOR, COMPOSER_SELECTOR, CONVERSATION_SCROLL_SELECTOR, FLOW_BLOCK_SELECTOR, FOLLOWING_TAIL_ATTRIBUTE, FOLLOWING_TAIL_SELECTOR, RUNNING_STATE, SHIMMER_SELECTOR, STREAMING_SELECTOR, SUBMISSION_ECHO_SELECTOR, THINK_ROW_SELECTOR } from '../../shared/chat-dom'
import { SCROLL_EASE_LEAD_PX, easeScrollToEnd, scrollEasePosition, stopScrollEase } from '../../shared/scroll-ease'
import type { HostContext } from '../../core/host'
import type { Ui } from '../../core/scheduler'

/**
 * Enhanced follow and the capped process group's follow, ported from
 * dsh-chat-ux. Both ride one preference, as they do upstream: they are the
 * two halves of the same hand-back.
 *
 * The moments that lose the host's follow, the guard that watches for them,
 * and the hand-back itself are in follow-guard.js and chat-tail.ts; the
 * catch-up inside a capped body is in process-follow.ts.
 *
 * @param ctx - client context.
 * @param ui - shared handle table; a fold glide running elsewhere
 *     (src/features/chat-fold/) owns the position until it lands, so the
 *     hand-back waits it out when that feature is installed.
 * @returns teardown.
 */
/** One tool call's row, and one flow block, in one selector: a new node either way. */
export const FOLLOW_STRUCTURE_SELECTOR = FLOW_BLOCK_SELECTOR + ', ' + CHAT_CALL_SELECTOR
/** Content is streaming: the host writes both marks, and only then is there a follow to lose. */
export const FOLLOW_RUNNING_SELECTOR = STREAMING_SELECTOR + ', ' + SHIMMER_SELECTOR
/** The intent events the guard reads; the same family as the host's own reading intents. */
export const FOLLOW_INTENT_TYPES = ['wheel', 'touchstart', 'pointerdown', 'keydown', 'beforematch']
/** Two hand-backs never land closer than this, so a run of tool calls cannot pin the position. */
export const FOLLOW_MIN_INTERVAL_MS = 200
/**
 * A structural change this recent still counts as work in progress. The
 * guard watches data-chat-following-tail going away, and it also goes away
 * on a session switch or a restored reading position — moments with no
 * streaming content and no fresh structure. The grace lets a freshly
 * inserted tool row count as work in progress too.
 */
export const FOLLOW_ACTIVITY_GRACE_MS = 2000
/** A fold glide in flight is waited out; after this many waits the round is dropped. */
export const FOLLOW_FOLD_WAIT_MS = 150
export const FOLLOW_FOLD_WAIT_ATTEMPTS = 4
/**
 * How far the position has to move past the glide's own last reading before
 * it counts as the host pinning it rather than the spring taking its own
 * step (both happen inside one frame; see the glide below).
 */
export const GLIDE_PIN_TOLERANCE_PX = 1
/**
 * The two arrivals that are the reader's own submission rather than content
 * streaming in: his own message row, and the echo the host mounts in its
 * place before the real row takes over.
 */
export const GLIDE_SUBMIT_SELECTOR = '[data-chat-flow-kind="user"], ' + SUBMISSION_ECHO_SELECTOR
/**
 * How long the glide stands down after one of them arrives.
 *
 * The host's own jump to a freshly sent message is deliberate and is not the
 * glide's to take back — the reader has to see the message he just sent —
 * and the echo is swapped for the real row about a second later, which moves
 * the position again. The stand-down covers both.
 */
export const GLIDE_SUBMIT_HOLD_MS = 1200

/**
 * Watch the whole page for the moments that lose the host's follow, and hand
 * the position back at each of them.
 *
 * @param foldBusy - whether a fold glide is animating a height right now.
 * @returns teardown: the observer and the intent listeners go away.
 */
export function createChatFollowGuard(foldBusy: () => boolean) {
  /** Whether the reader has taken the scroll over and not come back to the end. */
  let readerTookOver = false
  /**
   * The scroller read last time. A session switch replaces the whole frame,
   * so it is checked before every use.
   */
  let scrollerCache: HTMLElement | null = null
  /** When the last hand-back really landed, for the throttle. */
  let lastEnsureAt = 0
  /** When structure last changed, for the grace above. */
  let lastActivityAt = 0
  let scanQueued = false
  /** This batch of mutations held a structural moment / the follow being turned off. */
  let structureSeen = false
  let guardSeen = false

  /**
   * Whether the reader is reading up there right now.
   *
   * He sets it once, and the position clears it: back within the line means
   * he is done (or pressed the host's own button). That needs no "no
   * movement for this long" timer, which would drag him back while he
   * reads slowly.
   */
  const readerAway = () => {
    if (!readerTookOver) return false
    const scroller = conversationScroller()
    // Without a scroller, assume he is still up there and leave this round alone.
    if (scroller === null) return true
    if (!isAtBottom(scroller)) return true
    readerTookOver = false
    return false
  }

  /** Whether work counts as in progress right now. */
  const running = () => document.querySelector(FOLLOW_RUNNING_SELECTOR) !== null
    || performance.now() - lastActivityAt <= FOLLOW_ACTIVITY_GRACE_MS

  // ---------- the stream glide ----------
  //
  // While work is streaming and the reader is at the end, the host follows by
  // writing the end outright the moment content grows — measured on this
  // build: the position never sat more than three pixels off the end, so the
  // text above the last line was pushed up in one frame on every burst. The
  // glide takes that write back before the frame paints and hands the
  // distance to the spring (shared/scroll-ease.ts, the same walk the catch-up and
  // the hand-back use), so the position travels there instead.
  //
  // Every reading is an element read plus at most one style write, and all of
  // it is gated on work being in progress: with the stream idle this costs
  // one attribute read per mutation batch and nothing else.
  /** Where the glide last saw the position, and on which scroller; the reading a pin is measured against. */
  let glideSeen: { element: HTMLElement, top: number } | null = null
  /** The scroller glideSeen belongs to. A session switch replaces the frame whole. */
  let glideScroller: HTMLElement | null = null
  /** The flow column the glide's resize observer watches. */
  let glideColumn: HTMLElement | null = null
  /** The resize observer made for glideColumn (see glideSync). */
  let glideResize: ResizeObserver | null = null
  /** The column's height as the glide last saw it; the growth a frame is measured against. */
  let glideHeight = 0
  /** The host's own button while the glide keeps it out of sight. */
  let glideButton: HTMLElement | null = null
  /** Whether the glide is holding the position right now. */
  let glideHeld = false
  /** Until this moment the glide stands down: a message the reader sent just arrived. */
  let glideHoldUntil = 0

  /** Whether content is arriving right now: the mark the host writes while it streams. */
  const streaming = () => document.querySelector(FOLLOW_RUNNING_SELECTOR) !== null

  /**
   * Whether the glide owns the position right now.
   *
   * The gate is the streaming mark itself rather than the guard's wider
   * "work in progress" window: the structural moments that window exists for
   * are the hand-back's business, and the glide must not shadow them.
   */
  const glidePinning = () => {
    // The reader's animation choice means "no animation": nothing to walk.
    if (motionReduced()) return false
    // The reader's own message has just arrived: the host's jump to it stands.
    if (performance.now() < glideHoldUntil) return false
    if (!streaming()) return false
    if (readerAway()) return false
    if (typeof foldBusy === 'function' && foldBusy()) return false
    return true
  }

  /**
   * The test the spring asks every frame: the glide's own gates without the
   * "work in progress" one, because the trail left by the last token still
   * has to land after the stream has stopped.
   */
  const glideWanted = () => !motionReduced() && !readerAway()
    && performance.now() >= glideHoldUntil
    && !(typeof foldBusy === 'function' && foldBusy())

  /** Let the host's button show again. */
  const unhideGlideButton = () => {
    if (glideButton === null) return
    glideButton.removeAttribute(STREAM_GLIDE_ATTR)
    glideButton = null
  }

  /**
   * Keep the host's own button out of sight while the glide follows.
   *
   * A position held off the end reads to the host as a reader who left the
   * end, so its settlement turns the follow off and it renders that button
   * although the glide is following. The mark is this skin's own and the
   * stylesheet hides the button; the host's state is untouched, and the mark
   * goes away the moment the glide lets go.
   */
  const hideGlideButton = () => {
    if (document.querySelector(FOLLOWING_TAIL_SELECTOR) !== null) {
      unhideGlideButton()
      return
    }
    const button = findFollowTailButton()
    if (button === glideButton) return
    unhideGlideButton()
    if (button !== null) {
      button.setAttribute(STREAM_GLIDE_ATTR, '')
      glideButton = button
    }
  }

  /**
   * Watch the flow column the glide reads growth from; a session switch
   * replaces it.
   *
   * The observer is made anew for every column. Resize observer callbacks
   * run in the order the observers were made, and the host makes the one it
   * pins the end from when it mounts the column (ChatViewport.attach): it
   * watches the column, the scroller and the composer seat. Made after it,
   * this one runs after the pin in the same frame and takes it back before
   * it paints; one made at install runs first, and every pin paints. It
   * watches the same three elements, so no resize the host pins on goes
   * unseen.
   */
  const glideSync = () => {
    const column = document.querySelector<HTMLElement>(CHAT_FLOW_SELECTOR)
    if (column === glideColumn) return
    glideResize?.disconnect()
    glideResize = null
    glideColumn = column
    if (column === null) return
    glideResize = new ResizeObserver(onGlideResize)
    // The observer's first report is the column as it is now, which is no
    // growth.
    glideHeight = column.offsetHeight
    glideResize.observe(column)
    const scroller = column.closest(CONVERSATION_SCROLL_SELECTOR)
    if (scroller === null) return
    glideResize.observe(scroller)
    const composer = scroller.querySelector(COMPOSER_SELECTOR)
    if (composer !== null) glideResize.observe(composer)
  }

  /**
   * Hold the position through one frame of streaming.
   *
   * This runs from the resize observer below, which the browser calls after
   * the host's own (see glideSync), so a pin written this frame is still
   * taken back before it paints: the distance it added stays with the
   * spring. The reference is
   * the spring's own last write while it is easing, and the last position
   * the glide saw otherwise. Only a move *down* is undone — an upward one is
   * the reader, or the host going somewhere else, and neither is the glide's
   * to take back.
   */
  const glideCheck = (grew?: number) => {
    if (!glidePinning()) {
      if (glideHeld) {
        glideHeld = false
        unhideGlideButton()
      }
      return
    }
    glideSync()
    const scroller = conversationScroller()
    if (scroller === null) return
    glideHeld = true
    glideScroller = scroller
    hideGlideButton()
    const end = scroller.scrollHeight - scroller.clientHeight
    // The frame's own step first: a position the spring has just written is
    // one this frame is allowed to be at, so it can never read as an undone
    // pin. Failing that, the position this scroller was last seen at — read
    // before this frame's own callbacks, so it is where the frame started,
    // which is what a pin written during the frame has to be measured
    // against. Failing that too (a scroller that has never scrolled), the end
    // this frame started at: this frame's end less the growth the column
    // reported.
    let expected = scrollEasePosition(scroller)
    if (expected === null && glideSeen !== null && glideSeen.element === scroller) expected = glideSeen.top
    if (expected === null && typeof grew === 'number' && grew > 0) expected = Math.max(0, end - grew)
    if (expected !== null && scroller.scrollTop - expected > GLIDE_PIN_TOLERANCE_PX) {
      scroller.scrollTop = expected
    }
    if (end - scroller.scrollTop > 0.5) easeScrollToEnd(scroller, glideWanted)
  }

  /**
   * Track the position a pin is measured against.
   *
   * Scroll events are fired before a frame's own callbacks, so this carries
   * the position the frame started at — which is exactly what a pin written
   * during that frame has to be measured against.
   */
  const noteGlideScroll = (event: Event) => {
    const target = event.target
    if (target instanceof HTMLElement && target.matches(CONVERSATION_SCROLL_SELECTOR)) {
      // Kept with its element: a session switch replaces the scroller, and
      // the old reading must not be measured against the new one.
      glideSeen = { element: target, top: target.scrollTop }
    }
  }

  /**
   * The column's own box is what grows while text streams, and a resize is
   * reported after the host's callback in the same step, so the growth read
   * here is the distance the host's pin added this frame. Growth that leaves
   * the column's box alone (a text node only) still arrives through the page
   * observer below, where the spring's own last write is the reference. The
   * scroller and the composer seat carry no growth to read; the host pins on
   * them too, and that pin is taken back the same way.
   */
  const onGlideResize = (entries: ResizeObserverEntry[]) => {
    let grew = 0
    for (const entry of entries) {
      if (entry.target !== glideColumn) continue
      const size = entry.borderBoxSize
      const box = size !== undefined && size.length > 0 ? size[0].blockSize : entry.contentRect.height
      const delta = box - glideHeight
      glideHeight = box
      // A growth wider than the longest stretch the ease glides is a replaced
      // column, not a burst, and is no reading to measure against.
      if (delta > 0 && delta <= SCROLL_EASE_LEAD_PX) grew = delta
    }
    glideCheck(grew)
  }

  /**
   * Hand this round's follow back. Three gates have to open: the position,
   * the reader's intent and a fold glide in flight.
   * @param attempt - how many times this round has been put off by a fold glide.
   */
  const ensure = (attempt?: number) => {
    if (readerAway()) return
    const scroller = conversationScroller()
    if (scroller === null) return
    // While the glide holds the position the follow is its own business: the
    // host has turned its follow off over the glide's writes, and its button
    // is kept out of sight — clicking it would drop the glide for exactly the
    // instant jump this feature exists to avoid. The landing itself lights
    // the host's follow back up (its own onScroll reads a position at the end
    // as the reader arriving there).
    if (glidePinning()) return
    // More than a screen off the end is the reader reading higher up, not a follow that fell one step behind.
    if (scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop > scroller.clientHeight) return
    // A fold glide is moving the height, and the position is its business until it lands.
    if (typeof foldBusy === 'function' && foldBusy()) {
      const tries = typeof attempt === 'number' ? attempt : 0
      if (tries >= FOLLOW_FOLD_WAIT_ATTEMPTS) return
      window.setTimeout(() => ensure(tries + 1), FOLLOW_FOLD_WAIT_MS)
      return
    }
    const now = performance.now()
    if (now - lastEnsureAt < FOLLOW_MIN_INTERVAL_MS) return
    lastEnsureAt = now
    ensureFollowTail({ stillWanted: () => !readerAway() })
  }

  /** A batch of mutations is settled: decide whether to act. */
  const settle = () => {
    const structure = structureSeen
    const guarded = guardSeen
    structureSeen = false
    guardSeen = false
    // The guard side needs the extra "work in progress" test: the attribute
    // going away can also be a session switch or history being restored.
    if (!structure && !(guarded && running())) return
    ensure(0)
  }

  const queue = () => {
    if (scanQueued) return
    scanQueued = true
    requestAnimationFrame(() => {
      scanQueued = false
      settle()
    })
  }

  /** Whether a newly added node holds a flow block or a tool call row. */
  const marksStructure = (node: Node) => {
    if (!(node instanceof Element)) return false
    return node.matches(FOLLOW_STRUCTURE_SELECTOR) || node.querySelector(FOLLOW_STRUCTURE_SELECTOR) !== null
  }

  /**
   * Whether a node, or the subtree it brings, is a message the reader has
   * just sent — his own row, or the echo the host mounts in its place.
   */
  const arrivesFromComposer = (node: Node) => node instanceof Element
    && (node.matches(GLIDE_SUBMIT_SELECTOR) || node.querySelector(GLIDE_SUBMIT_SELECTOR) !== null)

  /**
   * Note that the reader took the scroll over.
   *
   * Only once the content has really grown a scrollbar: before that there
   * is nothing to scroll, and setting the flag would make the guard wait a
   * round for nothing. What counts as his intent is isReaderScrollIntent's
   * call: inside the composer and keys that cannot scroll do not count.
   */
  const noteReaderIntent = (event: Event) => {
    // Once taken over there is nothing to judge: this function only sets the
    // flag, and the dozens of events behind one gesture cannot change it.
    if (readerTookOver) return
    if (!isReaderScrollIntent(event)) return
    // The container is cached: a trackpad sends hundreds of these a second,
    // and each read is a document query plus two geometry values landing
    // exactly while the reader scrolls and new content dirties the layout.
    if (scrollerCache === null || !scrollerCache.isConnected) scrollerCache = conversationScroller()
    const scroller = scrollerCache
    if (scroller === null || scroller.scrollHeight - scroller.clientHeight <= 0) return
    readerTookOver = true
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') {
        // The follow went from present to absent: the host just turned it off.
        if (record.attributeName === FOLLOWING_TAIL_ATTRIBUTE) {
          if (record.target instanceof Element && !record.target.hasAttribute(FOLLOWING_TAIL_ATTRIBUTE)) guardSeen = true
          continue
        }
        // A thinking row leaving "running": the boundary of that piece of work.
        if (record.oldValue === RUNNING_STATE
          && record.target instanceof Element
          && record.target.matches(THINK_ROW_SELECTOR)
          && record.target.getAttribute('data-state') !== RUNNING_STATE) {
          lastActivityAt = performance.now()
          structureSeen = true
        }
        continue
      }
      for (const node of record.addedNodes) {
        if (!marksStructure(node)) continue
        lastActivityAt = performance.now()
        structureSeen = true
      }
    }
    if (structureSeen || guardSeen) queue()
    // Text arriving is the glide's own signal and carries no structure: a
    // character-data change, or a node added or removed anywhere, is enough
    // to ask. Attribute batches (a streaming mark flipping) are skipped,
    // which keeps the common idle case down to a boolean per batch. A node
    // that is the reader's own message is not streaming content: it stands
    // the glide down instead of feeding it (GLIDE_SUBMIT_HOLD_MS).
    let contentArrived = false
    for (const record of records) {
      if (record.type === 'characterData') {
        contentArrived = true
        continue
      }
      for (const node of record.addedNodes) {
        if (arrivesFromComposer(node)) glideHoldUntil = performance.now() + GLIDE_SUBMIT_HOLD_MS
        contentArrived = true
      }
      for (const node of record.removedNodes) {
        if (arrivesFromComposer(node)) glideHoldUntil = performance.now() + GLIDE_SUBMIT_HOLD_MS
        contentArrived = true
      }
    }
    if (contentArrived) glideCheck()
  })

  for (const type of FOLLOW_INTENT_TYPES) {
    document.addEventListener(type, noteReaderIntent, { capture: true, passive: true })
  }
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['data-state', FOLLOWING_TAIL_ATTRIBUTE],
    attributeOldValue: true,
  })
  // The reading a pin is measured against; scroll events are fired before
  // the frame's own callbacks, so this always carries the position the frame
  // started at (see noteGlideScroll).
  window.addEventListener('scroll', noteGlideScroll, { capture: true, passive: true })

  return () => {
    observer.disconnect()
    for (const type of FOLLOW_INTENT_TYPES) document.removeEventListener(type, noteReaderIntent, true)
    window.removeEventListener('scroll', noteGlideScroll, true)
    glideResize?.disconnect()
    glideResize = null
    unhideGlideButton()
    // The glide's own easing stops with the feature; a hand-back in flight
    // elsewhere on the page is not this teardown's business.
    if (glideScroller !== null) stopScrollEase(glideScroller)
    glideScroller = null
    glideColumn = null
  }
}

/**
 * Install both halves of the follow behaviour and mark the page for its
 * stylesheet (the capped body's vertical-only scroll). The entry installs this
 * only while the preference is on and dsh-chat-ux, which drives the same
 * moments and writes the same scroll positions, is off the page (the
 * manifest); this teardown hands the chat area back whole.
 *
 * @param ctx - client context.
 * @param ui - shared handle table.
 * @returns teardown.
 */
export function install(ctx: HostContext, ui: Ui) {
  const foldBusy = () => ui.chatFold !== undefined && ui.chatFold !== null && ui.chatFold.isBusy()
  const stopGuard = createChatFollowGuard(foldBusy)
  const stopProcess = createChatProcessFollow()
  document.body.setAttribute(CHAT_FOLLOW_ATTR, '')
  return () => {
    document.body.removeAttribute(CHAT_FOLLOW_ATTR)
    stopGuard()
    stopProcess()
  }
}
