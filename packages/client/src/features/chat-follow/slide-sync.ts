import { CONVERSATION_SCROLL_SELECTOR, FOLLOWING_TAIL_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeSize } from '@dsh-claude-style/engine/bus'
import { conversationColumn } from '@dsh-claude-style/engine/chat-dom'
import { readerScrollPosition, readerScrollRevision, writeScroll } from '@dsh-claude-style/engine/scroll-owner'
import { FOLLOW_HOLD_ATTR } from '../../constants'
import type { SlideMotion } from './slide-motion'

/**
 * The size subscription the slide reads growth from and the hold mark a door
 * keeps on the column while it rolls.
 *
 * The column is re-subscribed after the host's own observer for every column
 * it mounts; the hold mark stands in for the follow the door takes away until
 * the fold hands it back (features/chat-fold/fold-glide-parts.ts).
 *
 * @param motion - the slide's state and the animations this file starts and ends.
 * @param options.foldBusy - whether a fold glide is animating a height right now.
 * @param options.readerAway - whether the reader is holding the conversation right now.
 */
export function createSlideSync(motion: SlideMotion, options: { foldBusy: () => boolean, readerAway: () => boolean }) {
  const { state } = motion
  const { foldBusy, readerAway } = options

  /** Take the hold mark off the column carrying it. */
  const releaseHold = () => {
    if (state.heldColumn === null) return
    state.heldColumn.removeAttribute(FOLLOW_HOLD_ATTR)
    state.heldColumn = null
  }

  /**
   * Put the hold mark on the column while a door rolls. A door's height change
   * reads to the host as a reader who left the tail, so the host takes
   * data-chat-following-tail away; the waiting line's pin waits for that
   * attribute (features/chat-wait/chat-wait.css), and this mark keeps the pin
   * standing until the fold hands the follow back (holdCheck).
   */
  const markHold = (column: HTMLElement) => {
    if (state.heldColumn === column) return
    releaseHold()
    column.setAttribute(FOLLOW_HOLD_ATTR, '')
    state.heldColumn = column
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
   * pin would paint.
   *
   * The column's height is not read here: this runs in the batch's own
   * callback, when the host has just mounted the whole tree, and an
   * `offsetHeight` read forces that dirty tree to lay out again. The
   * subscription's first report is the baseline instead.
   */
  const slideSync = () => {
    // The column is kept by packages/engine/src/chat-dom.ts: asking the document
    // for it on every frame of a stream forced a style pass over the whole page
    // (D9).
    const column = conversationColumn()
    if (column === state.slideColumn) return
    if (state.stopSlideSize !== null) state.stopSlideSize()
    state.stopSlideSize = null
    motion.stopSlide()
    state.slideColumn = column
    state.slideArmed = false
    state.slideHeight = 0
    state.slideScrollTop = null
    state.slideReaderRevision = 0
    // A new column is a new conversation: the pace the old one streamed at is
    // no reading of how fast this one's pieces arrive (D95).
    state.grewAt = 0
    state.grewEvery = 0
    if (column === null) return
    state.stopSlideSize = observeSize(column, onSlideResize, { afterHost: true })
  }

  /**
   * Keep the door's hold mark on the column while a door rolls: the door takes
   * the host's follow away until the fold hands it back (fold-glide-parts.ts),
   * and the tail is still followed, so the pin's mark stands through the door.
   */
  const holdCheck = () => {
    if (foldBusy() && !readerAway()) {
      slideSync()
      if (state.slideColumn !== null) markHold(state.slideColumn)
      return
    }
    releaseHold()
  }

  /**
   * Put this frame's growth back under a reader who holds the conversation.
   *
   * The host's own follow pins the end on every growth while its mark stands,
   * and a finger pressed on the screen sends no scroll of its own: nothing puts
   * the host into its sampling window, so nothing stands its pin down, and the
   * position the reader held moves one growth per burst. The slide is
   * refused while he holds, so this is the one writer left for it. A position
   * away from the end is the reader's own and stays where he put it.
   */
  const holdGrowth = (column: HTMLElement, previousScrollTop: number | null, readerMoved: boolean) => {
    const scroller = column.closest(CONVERSATION_SCROLL_SELECTOR)
    if (scroller === null || column.closest(FOLLOWING_TAIL_SELECTOR) === null) return
    if (scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop > 0.5) return
    if (foldBusy()) return
    // New travel since the previous growth belongs to the reader and is kept.
    // Otherwise restore the position the previous growth actually ended at:
    // an older absolute record could belong to another layout epoch.
    const position = readerMoved ? readerScrollPosition(scroller) : previousScrollTop
    if (position === null) return
    writeScroll(scroller, position, 'reader')
  }

  /**
   * The column's own box is what grows while text streams, and a resize is the
   * moment the host has just pinned the end: read the growth this frame
   * brought and slide it, or give it back to a reader holding it.
   */
  const onSlideResize = (entries: ResizeObserverEntry[]) => {
    const column = state.slideColumn
    let grew = 0
    for (const entry of entries) {
      if (column === null || entry.target !== column) continue
      const box = motion.blockSize(entry)
      // The subscription's first report for a column is its height as mounted:
      // the baseline a later growth is measured against, never a growth itself.
      if (!state.slideArmed) {
        state.slideArmed = true
        state.slideHeight = box
        const scroller = column.closest(CONVERSATION_SCROLL_SELECTOR)
        state.slideScrollTop = scroller?.scrollTop ?? 0
        state.slideReaderRevision = scroller === null ? 0 : readerScrollRevision(scroller)
        continue
      }
      const delta = box - state.slideHeight
      state.slideHeight = box
      // A structural shrink moves the host's pin by the height that left. An
      // offset from growth before it would add a second, downward move.
      if (delta < 0) motion.stopSlide()
      // Any growth is slid, a burst included: startSlide's clamp bounds what a
      // glide carries, and a column the host replaced is no longer the one
      // watched here (slideSync re-subscribes when it changes).
      if (delta > 0) {
        grew = delta
        // A faster arrival bounds this slide at once; smoothing a shorter gap
        // would carry the old pause into the new stream and let offsets build
        // up. Slower arrivals still ease toward their own pace (D95).
        const now = performance.now()
        if (state.grewAt > 0) {
          const gap = now - state.grewAt
          state.grewEvery = state.grewEvery === 0 ? gap : Math.min(gap, state.grewEvery * 0.6 + gap * 0.4)
        }
        state.grewAt = now
      }
    }
    const scroller = column?.closest(CONVERSATION_SCROLL_SELECTOR) ?? null
    const scrollTop = scroller?.scrollTop ?? null
    const previousScrollTop = state.slideScrollTop
    const revision = scroller === null ? 0 : readerScrollRevision(scroller)
    const readerMoved = revision !== state.slideReaderRevision
    // Sibling rows can change the pin by less or more than the column grew.
    // Compensate the host's actual position write, not only the column's delta.
    const moved = state.slideScrollTop === null || scrollTop === null ? 0 : scrollTop - state.slideScrollTop
    state.slideScrollTop = scrollTop
    state.slideReaderRevision = revision
    holdCheck()
    if (column === null || grew === 0) return
    if (readerAway()) {
      holdGrowth(column, previousScrollTop, readerMoved)
      if (scroller !== null) {
        state.slideScrollTop = scroller.scrollTop
        state.slideReaderRevision = readerScrollRevision(scroller)
      }
      return
    }
    if (!motion.slideWanted(column)) return
    if (moved < 0) motion.stopSlide()
    if (moved > 0) motion.startSlide(column, scroller, moved)
  }

  return {
    sync: slideSync,
    holdCheck,
    /** The subscription and the hold mark go away; a slide still running is the motion's to cancel. */
    release() {
      if (state.stopSlideSize !== null) state.stopSlideSize()
      state.stopSlideSize = null
      releaseHold()
    },
  }
}
