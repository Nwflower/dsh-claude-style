import { CHAT_FOLLOW_ATTR, FOLLOW_HOLD_ATTR, READER_HOLD_ATTR } from '../../constants'
import { observeMatches, observeSize, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { motionReduced } from '../../core/prefs'
import { createChatProcessFollow } from './process-follow'
import { CHAT_CALL_SELECTOR, CHAT_RUNNING_SELECTOR, CONVERSATION_SCROLL_SELECTOR, FLOW_BLOCK_SELECTOR, FOLLOWING_TAIL_ATTRIBUTE, FOLLOWING_TAIL_SELECTOR, ROW_PHASE_ATTRIBUTE, RUNNING_STATE, SHIMMER_SELECTOR, STREAMING_SELECTOR, THINK_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { conversationColumn, conversationScroller, findFollowTailButton } from '@dsh-claude-style/engine/chat-dom'
import { createStamp } from '@dsh-claude-style/engine/dom'
import { motionEase, motionEaseAt, motionMs } from '../../shared/motion'
import { inPageBox, pageViewport } from '../../shared/page-zoom'
import { observeComposerCards } from '@dsh-claude-style/engine/host'
import { SCROLL_EASE_LEAD_PX, handBackFollow, joinScrollOwner, readerHolds, submissionHolds, writeScroll } from '@dsh-claude-style/engine/scroll-owner'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './chat-follow.manifest'

/*
 * Enhanced follow and the capped process group's follow, ported from
 * dsh-chat-ux. Both ride one preference, as they do upstream: they are the
 * two halves of the same hand-back.
 *
 * The guard that watches for the moments that lose the host's follow is
 * below; the hand-back itself and every position write are the scroll
 * owner's (packages/engine/src/scroll-owner.ts, D40); the catch-up inside a capped body is
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
/** The curve the stream's slide travels on; its own reading of it has to match (shared/motion.ts). */
const GLIDE_TOKEN = '--dsh-claude-ease-glide'

/**
 * The conversation's own composer card: the lowest of the cards on the page,
 * which is the one the conversation is typed into rather than the hero's.
 *
 * @param cards - the composer cards, kept current by the bus (D40).
 */
function conversationComposerCard(cards: readonly HTMLElement[]) {
  let found: HTMLElement | null = null
  let lowest = -Infinity
  for (const card of cards) {
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
function placeFollowTail(stamp: ReturnType<typeof createStamp<HTMLElement>>, cards: readonly HTMLElement[]) {
  const button = findFollowTailButton()
  const card = button === null ? null : conversationComposerCard(cards)
  const scroller = button === null ? null : conversationScroller()
  if (button === null || card === null || scroller === null) {
    stamp.release()
    return
  }
  stamp.mark(button)
  // The boxes are measured in the viewport's pixels and the two properties are
  // read in the page's own, which the reader's page zoom scales
  // (shared/page-zoom.ts).
  const cardBox = inPageBox(card.getBoundingClientRect())
  const scrollBox = inPageBox(scroller.getBoundingClientRect())
  const left = `${Math.round(scrollBox.left + scrollBox.width / 2)}px`
  const bottom = `${Math.round(pageViewport().height - cardBox.top + FOLLOW_TAIL_AIR_PX)}px`
  if (button.style.getPropertyValue(FOLLOW_TAIL_LEFT) !== left) button.style.setProperty(FOLLOW_TAIL_LEFT, left)
  if (button.style.getPropertyValue(FOLLOW_TAIL_BOTTOM) !== bottom) button.style.setProperty(FOLLOW_TAIL_BOTTOM, bottom)
}

/**
 * Watch the whole page for the moments that lose the host's follow, and hand
 * the position back at each of them; while content streams, slide what the
 * host's pin pushed up instead of letting it jump in one frame (D85). Every
 * position write goes through the scroll owner (D40).
 *
 * @param options.foldBusy - whether a fold glide is animating a height right now.
 * @param options.submissionHeld - whether the reader's own message is still
 *     taking its place (see the composer's slide stand-down).
 * @returns teardown: the subscriptions go away.
 */
export function createChatFollowGuard(options: { foldBusy: () => boolean, submissionHeld: () => boolean }) {
  const { foldBusy, submissionHeld } = options
  const leaveOwner = joinScrollOwner()
  /** When the last hand-back really landed, for the throttle. */
  let lastEnsureAt = 0
  /** When structure last changed, for the grace above. */
  let lastActivityAt = 0
  let scanQueued = false
  /** Set by the teardown: no pass is queued and no retry is waiting. */
  let stopped = false
  /** Cancels the frame a seen moment waits on. */
  let cancelScan: (() => void) | null = null
  /** The wait a fold glide put the hand-back on, so the teardown can drop it. */
  let foldWaitTimer: number | null = null
  /** This batch of mutations held a structural moment / the follow being turned off. */
  let structureSeen = false
  let guardSeen = false

  /** Whether the reader is reading up there right now (the owner's hold on the conversation). */
  const readerAway = () => {
    const scroller = conversationScroller()
    return scroller !== null && readerHolds(scroller)
  }

  /**
   * Whether work counts as in progress right now: the mark the host writes
   * while it streams, read inside the message column the way the slide reads it
   * (a document query made after the host's own write forces a style pass over
   * the whole page), or the reader's own activity inside the grace window.
   */
  const running = () => streaming() || performance.now() - lastActivityAt <= FOLLOW_ACTIVITY_GRACE_MS

  // ---------- the stream slide (D85) ----------
  //
  // While work is streaming and the reader is at the end, the host follows by
  // writing the end outright the moment content grows, so the text above the
  // last line would be pushed up in one frame on every burst. The host's write
  // stands; in the same frame, before it paints, the column is put back down by
  // the growth and slid to rest on the compositor. No position is written and
  // no layout is asked for: the host's follow stays on through the stream.
  /** The flow column the slide reads growth from. */
  let slideColumn: HTMLElement | null = null
  /** Stops the slide's size subscription on slideColumn (see slideSync). */
  let stopSlideSize: (() => void) | null = null
  /** The column's height as the slide last saw it; the growth a frame is measured against. */
  let slideHeight = 0
  /** The scroller's own height as its size subscription last reported it. */
  let scrollerHeight = 0
  /** The slide running now: the column's, the pinned row's counter-slide, the distance both started from, and the glide they run on. */
  let slide: { column: Animation, row: Animation | null, from: number, duration: number } | null = null
  /** The column the hold mark (FOLLOW_HOLD_ATTR) is on, or null while no door holds it. */
  let heldColumn: HTMLElement | null = null
  /** Whether the size subscription's first report for the current column has been taken as its baseline. */
  let slideArmed = false
  /** When the last growth arrived, and the smoothed gap before it: the pace a slide is timed to (D85). */
  let grewAt = 0
  let grewEvery = 0
  /**
   * The live turn's own row, kept current by the bus (D40): the stream slide
   * counter-slides it so it stands while the column glides. The host draws the
   * row at the flow's end and appends a hidden interaction surface after it, so
   * the column's last child is not the row itself and the bus's list is where
   * the row is read from.
   */
  const runningRows = observeMatches<HTMLElement>(CHAT_RUNNING_SELECTOR)

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
   * Whether this growth is slid. The gate is the streaming mark itself rather
   * than the guard's wider "work in progress" window: the structural moments
   * that window exists for are the hand-back's business.
   */
  const slideWanted = (column: HTMLElement) => {
    // The reader's animation choice means "no animation": nothing to slide.
    if (motionReduced()) return false
    // The reader's own message is taking its place: the host's jump to it
    // stands, and an entrance measured against the row's own box — the flight's
    // landing — would be moved by a slide's offset.
    if (submissionHeld()) return false
    if (!streaming()) return false
    if (readerAway()) return false
    if (foldBusy()) return false
    // The host's own mark that it follows the end, an attribute read: without
    // it this frame's growth was not pinned, and sliding would move content
    // that never went up.
    return column.closest(FOLLOWING_TAIL_SELECTOR) !== null
  }

  /** End the running slide where it is: the column and its pinned row land at rest together. */
  const stopSlide = () => {
    if (slide === null) return
    slide.column.cancel()
    if (slide.row !== null) slide.row.cancel()
    slide = null
  }

  /** The distance the running slide still carries, off its own clock and curve: no style is read. */
  const slideCarried = () => {
    if (slide === null) return 0
    const startedAt = slide.column.startTime
    // An animation that has not begun — the frame it was made in has not
    // painted — still carries the whole distance; reading it as nothing would
    // drop that distance on the next restart.
    if (startedAt === null) return slide.from
    const linear = (Number(document.timeline.currentTime) - Number(startedAt)) / slide.duration
    if (!(linear > 0)) return slide.from
    if (linear >= 1) return 0
    // The curve the animation paints with, not the linear share of its
    // duration: with the two mixed up, every restart re-inflates the distance
    // the frame before it had already travelled (D85).
    return slide.from * (1 - motionEaseAt(GLIDE_TOKEN, linear))
  }

  /**
   * How long this slide may run (D85). A piece of an answer arriving at a
   * provider's pace lands well inside the slide token, and a slide still moving
   * when the next piece lands starts its restart from a distance it had not paid
   * back yet: the column is drawn further below the tail with every piece until
   * it stands at the longest stretch a slide carries. The gap the last two
   * pieces kept is the time this one has before the next, so the slide is timed
   * to that; the token stays the ceiling for an answer slow enough for the
   * glide to settle between pieces.
   */
  const slideDuration = () => {
    const longest = motionMs('--dsh-claude-duration-slide')
    if (grewEvery === 0) return longest
    return Math.min(longest, Math.max(grewEvery, 1))
  }

  /**
   * Put the column back down by this frame's growth and slide it to rest.
   *
   * One replace-mode animation at a time: an additive one stays off the
   * compositor (D85), so a new growth restarts from the distance still carried
   * — up to the longest stretch a slide carries, so a burst is glided as far as
   * that and no farther. Its length follows the pace the pieces arrive at, so
   * the distance carried never outgrows one piece. The live turn's row is pinned
   * to the scroller's bottom (chat-wait.css) and would ride the column's offset,
   * so it gets the same slide reversed, started in the same frame: the two
   * cancel and it stands.
   */
  const startSlide = (column: HTMLElement, grew: number) => {
    const from = Math.min(SCROLL_EASE_LEAD_PX, slideCarried() + grew)
    stopSlide()
    const duration = slideDuration()
    const timing = { duration, easing: motionEase(GLIDE_TOKEN) }
    const columnSlide = column.animate([{ transform: `translateY(${from}px)` }, { transform: 'translateY(0px)' }], timing)
    // The live turn's row, from the bus's list and this column's own: the host's
    // trailing interaction surface stands after the row, so the column's last
    // child is not it.
    const pinned = runningRows.all().find((row) => column.contains(row)) ?? null
    const rowSlide = pinned === null ? null : pinned.animate([{ transform: `translateY(${-from}px)` }, { transform: 'translateY(0px)' }], timing)
    const running = { column: columnSlide, row: rowSlide, from, duration }
    columnSlide.onfinish = () => {
      if (slide === running) slide = null
    }
    slide = running
  }

  /** Take the hold mark off the column carrying it. */
  const releaseHold = () => {
    if (heldColumn === null) return
    heldColumn.removeAttribute(FOLLOW_HOLD_ATTR)
    heldColumn = null
  }

  /**
   * Put the hold mark on the column while a door rolls. A door's height change
   * reads to the host as a reader who left the tail, so the host takes
   * data-chat-following-tail away; the waiting line's pin waits for that
   * attribute (features/chat-wait/chat-wait.css), and this mark keeps the pin
   * standing until the fold hands the follow back (holdCheck).
   */
  const markHold = (column: HTMLElement) => {
    if (heldColumn === column) return
    releaseHold()
    column.setAttribute(FOLLOW_HOLD_ATTR, '')
    heldColumn = column
  }

  /**
   * Watch the flow column the slide reads growth from; a session switch
   * replaces it.
   *
   * The size subscription is made anew for every column, after the host's.
   * Resize observer callbacks run in the order the observers were made, and
   * the host makes the one it pins the end from when it mounts the column
   * (ChatViewport.attach). Subscribed `afterHost` once the column is there
   * (D40), this one runs after the pin in the same frame and puts the column
   * back down before it paints; one made at install would run first, and every
   * pin would paint. The scroller is watched too, for its own height.
   *
   * The column's height is not read here: this runs in the batch's own
   * callback, when the host has just mounted the whole tree, and an
   * `offsetHeight` read forces that dirty tree to lay out again (#196). The
   * subscription's first report is the baseline instead.
   */
  const slideSync = () => {
    // The column is kept by packages/engine/src/chat-dom.ts: asking the document
    // for it on every frame of a stream forced a style pass over the whole page
    // (D9).
    const column = conversationColumn()
    if (column === slideColumn) return
    if (stopSlideSize !== null) stopSlideSize()
    stopSlideSize = null
    stopSlide()
    slideColumn = column
    slideArmed = false
    slideHeight = 0
    scrollerHeight = 0
    // A new column is a new conversation: the pace the old one streamed at is
    // no reading of how fast this one's pieces arrive (D85).
    grewAt = 0
    grewEvery = 0
    if (column === null) return
    const scroller = column.closest(CONVERSATION_SCROLL_SELECTOR)
    stopSlideSize = observeSize(scroller === null ? [column] : [column, scroller], onSlideResize, { afterHost: true })
  }

  /**
   * Keep the door's hold mark on the column while a door rolls: the door takes
   * the host's follow away until the fold hands it back (fold-glide-parts.ts),
   * and the tail is still followed, so the pin's mark stands through the door.
   */
  const holdCheck = () => {
    if (foldBusy() && !readerAway()) {
      slideSync()
      if (slideColumn !== null) markHold(slideColumn)
      return
    }
    releaseHold()
  }

  /** The size reading's own block size. */
  const blockSize = (entry: ResizeObserverEntry) => {
    const size = entry.borderBoxSize
    return size !== undefined && size.length > 0 ? size[0].blockSize : entry.contentRect.height
  }

  /**
   * Put this frame's growth back under a reader who holds the conversation.
   *
   * The host's own follow pins the end on every growth while its mark stands,
   * and a finger pressed on the screen sends no scroll of its own: nothing puts
   * the host into its sampling window, so nothing stands its pin down, and the
   * position the reader held moves one growth per burst (#230). The slide is
   * refused while he holds, so this is the one writer left for it. A position
   * away from the end is the reader's own and stays where he put it.
   */
  const holdGrowth = (column: HTMLElement, grew: number) => {
    const scroller = column.closest(CONVERSATION_SCROLL_SELECTOR)
    if (scroller === null || column.closest(FOLLOWING_TAIL_SELECTOR) === null) return
    if (scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop > 0.5) return
    if (foldBusy()) return
    writeScroll(scroller, scroller.scrollTop - grew, 'reader')
  }

  /**
   * The column's own box is what grows while text streams, and a resize is the
   * moment the host has just pinned the end: read the growth this frame
   * brought and slide it, or give it back to a reader holding it.
   */
  const onSlideResize = (entries: ResizeObserverEntry[]) => {
    const column = slideColumn
    let grew = 0
    let before = slideHeight
    for (const entry of entries) {
      if (entry.target !== column) {
        scrollerHeight = blockSize(entry)
        continue
      }
      const box = blockSize(entry)
      // The subscription's first report for a column is its height as mounted:
      // the baseline a later growth is measured against, never a growth itself.
      if (!slideArmed) {
        slideArmed = true
        slideHeight = box
        before = box
        continue
      }
      before = slideHeight
      const delta = box - slideHeight
      slideHeight = box
      // Any growth is slid, a burst included: startSlide's clamp bounds what a
      // glide carries, and a column the host replaced is no longer the one
      // watched here (slideSync re-subscribes when it changes).
      if (delta > 0) {
        grew = delta
        // The pace the pieces arrive at, smoothed so one pause between two of
        // them does not time the next slide for the pause (D85). The first gap
        // of a stream is a reading of its own.
        const now = performance.now()
        if (grewAt > 0) {
          const gap = now - grewAt
          grewEvery = grewEvery === 0 ? gap : grewEvery * 0.6 + gap * 0.4
        }
        grewAt = now
      }
    }
    holdCheck()
    // Only a column that already overflowed had its end pinned by the whole
    // growth; a first screen filling up moves nothing above it.
    if (column === null || grew === 0 || before < scrollerHeight) return
    if (readerAway()) {
      holdGrowth(column, grew)
      return
    }
    if (slideWanted(column)) startSlide(column, grew)
  }

  /**
   * Hand this round's follow back. Three gates have to open: the position,
   * the reader's intent and a fold glide in flight.
   * @param attempt - how many times this round has been put off by a fold glide.
   */
  const ensure = (attempt?: number) => {
    if (stopped || readerAway()) return
    const scroller = conversationScroller()
    if (scroller === null) return
    // More than a screen off the end is the reader reading higher up, not a follow that fell one step behind.
    if (scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop > scroller.clientHeight) return
    // A fold glide is moving the height, and the position is its business until it lands.
    if (foldBusy()) {
      const tries = typeof attempt === 'number' ? attempt : 0
      if (tries >= FOLLOW_FOLD_WAIT_ATTEMPTS) return
      if (foldWaitTimer !== null) window.clearTimeout(foldWaitTimer)
      foldWaitTimer = window.setTimeout(() => {
        foldWaitTimer = null
        ensure(tries + 1)
      }, FOLLOW_FOLD_WAIT_MS)
      return
    }
    const now = performance.now()
    if (now - lastEnsureAt < FOLLOW_MIN_INTERVAL_MS) return
    lastEnsureAt = now
    // A hand-back in flight outlives the frame it began in, so it is told the
    // feature is gone rather than only that the reader is still up there.
    handBackFollow('follow', { stillWanted: () => !stopped && !readerAway() })
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
    if (scanQueued || stopped) return
    scanQueued = true
    // The hand-back reads the position and writes it in one go, in the scroll
    // phase, while the frame's reads have left the layout settled (D40).
    cancelScan = requestFrame({
      scroll() {
        cancelScan = null
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
        // The reader took the conversation over: a slide still carrying an
        // offset would leave what he scrolls to off its place.
        if (record.attributeName === READER_HOLD_ATTR) {
          if (record.target instanceof Element && record.target.hasAttribute(READER_HOLD_ATTR)) stopSlide()
          continue
        }
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
    // Content arriving is when a session switch shows up as a new column and a
    // door's hold mark is due: a character-data change, or a node added or
    // removed anywhere, is enough to ask. Attribute batches (a streaming mark
    // flipping) are skipped, which keeps the common idle case down to a
    // boolean per batch.
    const contentArrived = records.some(record => record.type === 'characterData' || record.addedNodes.length > 0 || record.removedNodes.length > 0)
    if (contentArrived) {
      slideSync()
      holdCheck()
    }
  }

  const stopMutations = subscribeMutations(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributeFilter: [ROW_PHASE_ATTRIBUTE, FOLLOWING_TAIL_ATTRIBUTE, READER_HOLD_ATTR],
    attributeOldValue: true,
  }, onRecords)

  return () => {
    // First: a queued pass or a waiting retry would otherwise hand the position
    // back after the feature is off, pressing the host's own back-to-end button.
    stopped = true
    if (cancelScan !== null) cancelScan()
    cancelScan = null
    scanQueued = false
    if (foldWaitTimer !== null) window.clearTimeout(foldWaitTimer)
    foldWaitTimer = null
    stopMutations()
    if (stopSlideSize !== null) stopSlideSize()
    stopSlideSize = null
    stopSlide()
    releaseHold()
    runningRows.release()
    slideColumn = null
    leaveOwner()
  }
}

/**
 * Install both halves of the follow behaviour and mark the page for its
 * stylesheet (the capped body's vertical-only scroll). The entry installs this
 * only while the preference is on and dsh-chat-ux, which drives the same
 * moments and writes the same scroll positions, is off the page (the
 * manifest); this teardown hands the chat area back whole.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const stopGuard = createChatFollowGuard({
    foldBusy: () => ui.chatFold !== undefined && ui.chatFold !== null && ui.chatFold.isBusy(),
    /**
     * Whether the reader's own message is still taking its place. The send
     * feature owns that moment — its flight and the row growing where it lands
     * both read the row's own box, which a slide's offset would move — and the
     * engine's window is the answer for a page where it is not installed: its
     * chunk has not arrived, its switch is off, or another plugin owns the
     * entrance.
     */
    submissionHeld: () => (ui.chatSend === undefined ? submissionHolds() : ui.chatSend.isEntering()),
  })
  const stopProcess = createChatProcessFollow()
  const tailStamp = createStamp<HTMLElement>(FOLLOW_TAIL_ATTR)
  const cards = observeComposerCards()
  document.body.setAttribute(CHAT_FOLLOW_ATTR, '')
  ui.chatFollow = {
    sync() {
      placeFollowTail(tailStamp, cards.all())
    },
    /** A viewport or composer-card change moves the column: the button is placed again in the same frame. */
    reposition() {
      placeFollowTail(tailStamp, cards.all())
    },
  }
  return () => {
    document.body.removeAttribute(CHAT_FOLLOW_ATTR)
    tailStamp.release()
    cards.release()
    delete ui.chatFollow
    stopGuard()
    stopProcess()
  }
}
