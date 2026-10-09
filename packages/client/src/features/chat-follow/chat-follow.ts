import { CHAT_FOLLOW_ATTR, FOLLOW_HOLD_ATTR } from '../../constants'
import { observeSize, subscribeMutations } from '../../core/bus'
import { requestFrame } from '../../core/frame'
import { motionReduced } from '../../core/prefs'
import { createChatProcessFollow } from './process-follow'
import { CHAT_CALL_SELECTOR, COMPOSER_CARD_SELECTOR, COMPOSER_SELECTOR, CONVERSATION_SCROLL_SELECTOR, FLOW_BLOCK_SELECTOR, FOLLOWING_TAIL_ATTRIBUTE, ROW_PHASE_ATTRIBUTE, RUNNING_STATE, SHIMMER_SELECTOR, STREAMING_SELECTOR, THINK_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { conversationColumn, conversationScroller, findFollowTailButton } from '../../shared/chat-dom'
import { createStamp } from '../../shared/dom'
import { SCROLL_EASE_LEAD_PX, easeScrollToEndFor, handBackFollow, holdFollowButton, joinScrollOwner, readerHolds, releaseFollowButton, stopScrollFor, submissionHolds, takeBackHostPin } from '../../shared/scroll-owner'
import type { HostContext } from '../../core/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './chat-follow.manifest'

/*
 * Enhanced follow and the capped process group's follow, ported from
 * dsh-chat-ux. Both ride one preference, as they do upstream: they are the
 * two halves of the same hand-back.
 *
 * The guard that watches for the moments that lose the host's follow is
 * below; the hand-back itself and every position write are the scroll
 * owner's (shared/scroll-owner.ts, D41); the catch-up inside a capped body is
 * in process-follow.ts.
 */
/** One tool call's row, and one flow block, in one selector: a new node either way. */
export const FOLLOW_STRUCTURE_SELECTOR = FLOW_BLOCK_SELECTOR + ', ' + CHAT_CALL_SELECTOR
/** Content is streaming: the host writes both marks, and only then is there a follow to lose. */
export const FOLLOW_RUNNING_SELECTOR = STREAMING_SELECTOR + ', ' + SHIMMER_SELECTOR
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
/** The host's own back-to-end button, marked for the stylesheet that places it. */
export const FOLLOW_TAIL_ATTR = 'data-dsh-claude-follow-tail'
/** How far above the composer's top edge that button floats. */
export const FOLLOW_TAIL_AIR_PX = 12
/** The button's fixed placement, written as numbers because the column moves under it. */
const FOLLOW_TAIL_LEFT = '--dsh-claude-follow-tail-left'
const FOLLOW_TAIL_BOTTOM = '--dsh-claude-follow-tail-bottom'

/**
 * The conversation's own composer card: the lowest of the cards on the page,
 * which is the one the conversation is typed into rather than the hero's.
 */
function conversationComposerCard() {
  let found: HTMLElement | null = null
  let lowest = -Infinity
  for (const card of document.querySelectorAll<HTMLElement>(COMPOSER_CARD_SELECTOR)) {
    const box = card.getBoundingClientRect()
    if (box.width === 0 && box.height === 0) continue
    if (box.top > lowest) {
      lowest = box.top
      found = card
    }
  }
  return found
}

/**
 * The host's back-to-end button, centred over the composer.
 *
 * The button is the host's own and renders only while its follow is off; its
 * shipped place is the conversation column's right edge, which is where the
 * mascot stands on the card. The pass marks it and writes the two numbers its
 * stylesheet reads — the column's centre and the composer's top edge — because
 * the button is fixed and the column moves with the sidebars and the window.
 *
 * @param stamp - the mark to move onto the button, or off when it is not there.
 */
function placeFollowTail(stamp: ReturnType<typeof createStamp<HTMLElement>>) {
  const button = findFollowTailButton()
  const card = button === null ? null : conversationComposerCard()
  const scroller = button === null ? null : conversationScroller()
  if (button === null || card === null || scroller === null) {
    stamp.release()
    return
  }
  stamp.mark(button)
  const cardBox = card.getBoundingClientRect()
  const scrollBox = scroller.getBoundingClientRect()
  const left = `${Math.round(scrollBox.left + scrollBox.width / 2)}px`
  const bottom = `${Math.round(window.innerHeight - cardBox.top + FOLLOW_TAIL_AIR_PX)}px`
  if (button.style.getPropertyValue(FOLLOW_TAIL_LEFT) !== left) button.style.setProperty(FOLLOW_TAIL_LEFT, left)
  if (button.style.getPropertyValue(FOLLOW_TAIL_BOTTOM) !== bottom) button.style.setProperty(FOLLOW_TAIL_BOTTOM, bottom)
}

/**
 * Watch the whole page for the moments that lose the host's follow, and hand
 * the position back at each of them; while content streams, glide the
 * position instead of letting the host write the end in one frame. Every
 * write goes through the scroll owner (D41).
 *
 * @param foldBusy - whether a fold glide is animating a height right now.
 * @returns teardown: the subscriptions go away.
 */
export function createChatFollowGuard(foldBusy: () => boolean) {
  const leaveOwner = joinScrollOwner()
  /** When the last hand-back really landed, for the throttle. */
  let lastEnsureAt = 0
  /** When structure last changed, for the grace above. */
  let lastActivityAt = 0
  let scanQueued = false
  /** This batch of mutations held a structural moment / the follow being turned off. */
  let structureSeen = false
  let guardSeen = false

  /** Whether the reader is reading up there right now (the owner's hold on the conversation). */
  const readerAway = () => {
    const scroller = conversationScroller()
    return scroller !== null && readerHolds(scroller)
  }

  /** Whether work counts as in progress right now. */
  const running = () => document.querySelector(FOLLOW_RUNNING_SELECTOR) !== null
    || performance.now() - lastActivityAt <= FOLLOW_ACTIVITY_GRACE_MS

  // ---------- the stream glide ----------
  //
  // While work is streaming and the reader is at the end, the host follows by
  // writing the end outright the moment content grows — the position never
  // sat more than three pixels off the end, so the text above the last line
  // was pushed up in one frame on every burst. The glide takes that write back
  // before the frame paints and hands the distance to the spring, so the
  // position travels there instead.
  //
  // Every reading is an element read plus at most one style write, and all of
  // it is gated on work being in progress: with the stream idle this costs
  // one attribute read per mutation batch and nothing else.
  /** The scroller the glide last held; a session switch replaces the frame whole. */
  let glideScroller: HTMLElement | null = null
  /** The flow column the glide reads growth from. */
  let glideColumn: HTMLElement | null = null
  /** Stops the glide's size subscription on glideColumn (see glideSync). */
  let stopGlideSize: (() => void) | null = null
  /** The column's height as the glide last saw it; the growth a frame is measured against. */
  let glideHeight = 0
  /** Whether the glide is holding the position right now. */
  let glideHeld = false
  /** The column the hold mark (FOLLOW_HOLD_ATTR) is on, or null while the glide holds nothing. */
  let heldColumn: HTMLElement | null = null

  /**
   * Whether content is arriving right now: the mark the host writes while it
   * streams. It is looked for inside the message column rather than across the
   * document — the mark lives there, and a document query made after the host's
   * own write forces a style pass over the whole page (D9).
   */
  const streaming = () => {
    const column = conversationColumn()
    return column !== null && column.querySelector(FOLLOW_RUNNING_SELECTOR) !== null
  }

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
    if (submissionHolds()) return false
    if (!streaming()) return false
    if (readerAway()) return false
    if (foldBusy()) return false
    return true
  }

  /**
   * The test the spring asks every frame: the glide's own gates without the
   * "work in progress" one, because the trail left by the last token still
   * has to land after the stream has stopped. The reader's hold and his own
   * message are the owner's to ask.
   */
  const glideWanted = () => !motionReduced() && !foldBusy()

  /** Take the hold mark off the column carrying it. */
  const releaseHold = () => {
    if (heldColumn === null) return
    heldColumn.removeAttribute(FOLLOW_HOLD_ATTR)
    heldColumn = null
  }

  /**
   * Put the hold mark on the column the glide holds. Held short of the end,
   * the position reads to the host as a reader who left the tail, so the host
   * takes data-chat-following-tail away; the live status line's pin waits for
   * that attribute (features/turn-status/turn-status.css), and this mark keeps
   * the pin standing while the glide is the one moving the position.
   */
  const markHold = (column: HTMLElement) => {
    if (heldColumn === column) return
    releaseHold()
    column.setAttribute(FOLLOW_HOLD_ATTR, '')
    heldColumn = column
  }

  /**
   * Watch the flow column the glide reads growth from; a session switch
   * replaces it.
   *
   * The size subscription is made anew for every column, after the host's.
   * Resize observer callbacks run in the order the observers were made, and
   * the host makes the one it pins the end from when it mounts the column
   * (ChatViewport.attach): it watches the column, the scroller and the
   * composer seat. Subscribed `afterHost` once the column is there (D40), this
   * one runs after the pin in the same frame and takes it back before it
   * paints; one made at install would run first, and every pin would paint.
   * It watches the same three elements, so no resize the host pins on goes
   * unseen.
   */
  const glideSync = () => {
    // The column is kept by shared/chat-dom.ts: asking the document for it on
    // every frame of a stream forced a style pass over the whole page (D9).
    const column = conversationColumn()
    if (column === glideColumn) return
    if (stopGlideSize !== null) stopGlideSize()
    stopGlideSize = null
    glideColumn = column
    if (column === null) return
    // The subscription's first report is the column as it is now, which is no
    // growth.
    glideHeight = column.offsetHeight
    const watched: Element[] = [column]
    const scroller = column.closest(CONVERSATION_SCROLL_SELECTOR)
    if (scroller !== null) {
      watched.push(scroller)
      const composer = scroller.querySelector(COMPOSER_SELECTOR)
      if (composer !== null) watched.push(composer)
    }
    stopGlideSize = observeSize(watched, onGlideResize, { afterHost: true })
  }

  /**
   * Hold the position through one frame of streaming.
   *
   * This runs from the size subscription above, which the browser calls
   * after the host's own resize observer, so a pin written this frame is
   * still taken back before it paints: the distance it added stays with the
   * spring (takeBackHostPin).
   */
  const glideCheck = (grew?: number) => {
    if (!glidePinning()) {
      if (glideHeld) {
        glideHeld = false
        releaseFollowButton()
        releaseHold()
      }
      return
    }
    glideSync()
    const scroller = conversationScroller()
    if (scroller === null) return
    glideHeld = true
    glideScroller = scroller
    holdFollowButton()
    if (glideColumn !== null) markHold(glideColumn)
    // One reading of the end serves the pin and the question after it: reading
    // it again in the same frame paid another layout pass (D9).
    const end = scroller.scrollHeight - scroller.clientHeight
    const top = takeBackHostPin(scroller, end, grew)
    if (end - top > 0.5) easeScrollToEndFor(scroller, 'stream', glideWanted)
  }

  /**
   * The column's own box is what grows while text streams, and a resize is
   * the moment the host has just pinned the end: read the growth this frame
   * brought, then hold.
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
    if (foldBusy()) {
      const tries = typeof attempt === 'number' ? attempt : 0
      if (tries >= FOLLOW_FOLD_WAIT_ATTEMPTS) return
      window.setTimeout(() => ensure(tries + 1), FOLLOW_FOLD_WAIT_MS)
      return
    }
    const now = performance.now()
    if (now - lastEnsureAt < FOLLOW_MIN_INTERVAL_MS) return
    lastEnsureAt = now
    handBackFollow('follow', { stillWanted: () => !readerAway() })
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
    // The hand-back reads the position and writes it in one go: write phase (D40).
    requestFrame({
      write() {
        scanQueued = false
        settle()
      },
    })
  }

  /** Whether a newly added node holds a flow block or a tool call row. */
  const marksStructure = (node: Node) => {
    if (!(node instanceof Element)) return false
    return node.matches(FOLLOW_STRUCTURE_SELECTOR) || node.querySelector(FOLLOW_STRUCTURE_SELECTOR) !== null
  }

  const onRecords = (records: MutationRecord[]) => {
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
          && record.target.getAttribute(ROW_PHASE_ATTRIBUTE) !== RUNNING_STATE) {
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
    // which keeps the common idle case down to a boolean per batch. The
    // reader's own message stands the glide down (the owner's submission
    // hold, which hears the batch before this subscription does).
    const contentArrived = records.some(record => record.type === 'characterData' || record.addedNodes.length > 0 || record.removedNodes.length > 0)
    if (contentArrived) glideCheck()
  }

  const stopMutations = subscribeMutations(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributeFilter: [ROW_PHASE_ATTRIBUTE, FOLLOWING_TAIL_ATTRIBUTE],
    attributeOldValue: true,
  }, onRecords)

  return () => {
    stopMutations()
    if (stopGlideSize !== null) stopGlideSize()
    stopGlideSize = null
    releaseFollowButton()
    releaseHold()
    // The glide's own easing stops with the feature; a hand-back in flight
    // is the owner's to finish.
    if (glideScroller !== null) stopScrollFor(glideScroller, 'stream')
    glideScroller = null
    glideColumn = null
    leaveOwner()
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
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const foldBusy = () => ui.chatFold !== undefined && ui.chatFold !== null && ui.chatFold.isBusy()
  const stopGuard = createChatFollowGuard(foldBusy)
  const stopProcess = createChatProcessFollow()
  const tailStamp = createStamp<HTMLElement>(FOLLOW_TAIL_ATTR)
  document.body.setAttribute(CHAT_FOLLOW_ATTR, '')
  ui.chatFollow = {
    sync() {
      placeFollowTail(tailStamp)
    },
    /** A viewport or composer-card change moves the column: the button is placed again in the same frame. */
    reposition() {
      placeFollowTail(tailStamp)
    },
  }
  return () => {
    document.body.removeAttribute(CHAT_FOLLOW_ATTR)
    tailStamp.release()
    delete ui.chatFollow
    stopGuard()
    stopProcess()
  }
}
