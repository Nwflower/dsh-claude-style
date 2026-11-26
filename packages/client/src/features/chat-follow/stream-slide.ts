import { CHAT_RUNNING_SELECTOR, CONVERSATION_SCROLL_SELECTOR, DISCLOSURE_HEADER_SELECTOR, DISCLOSURE_ROW_SELECTOR, EXPANDED_ATTRIBUTE, FOLLOWING_TAIL_SELECTOR, PROCESS_BODY_SELECTOR, PROCESS_EXPANDED_MODE_ATTRIBUTE, SHIMMER_SELECTOR, STREAMING_SELECTOR, THINK_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeMarker, observeMatches, observeSize } from '@dsh-claude-style/engine/bus'
import { conversationColumn } from '@dsh-claude-style/engine/chat-dom'
import { readerScrollPosition, readerScrollRevision, SCROLL_EASE_LEAD_PX, writeScroll } from '@dsh-claude-style/engine/scroll-owner'
import { FOLLOW_HOLD_ATTR } from '../../constants'
import { motionReduced } from '../../core/prefs'
import { motionEase, motionEaseAt, motionMs } from '../../shared/motion'

/** Content is streaming: the host writes both marks, and only then is there a follow to lose. */
const FOLLOW_RUNNING_SELECTOR = STREAMING_SELECTOR + ', ' + SHIMMER_SELECTOR

/** The curve the stream's slide travels on; its own reading of it has to match (shared/motion.ts). */
const GLIDE_TOKEN = '--dsh-claude-ease-glide'

// ---------- the stream slide (D95) ----------
//
// While work is streaming and the reader is at the end, the host follows by
// writing the end outright the moment content grows, so the text above the
// last line would be pushed up in one frame on every burst. The host's write
// stands; in the same frame, before it paints, the column is put back down by
// the growth and slid to rest on the compositor. No position is written and
// no layout is asked for: the host's follow stays on through the stream.

/** The slide as the guard asks for it; every variable of the slide stays in this file's closure. */
export interface StreamSlide {
  /** Bring the size subscription onto the current column. */
  sync(): void
  /** End the running slide where it is, before its offset outlives the state it was measured in. */
  stop(): void
  /** Keep or drop the door's hold mark for the height change now in flight. */
  holdCheck(): void
  release(): void
}

/** The size reading's own block size. */
function blockSize(entry: ResizeObserverEntry) {
  const size = entry.borderBoxSize
  return size !== undefined && size.length > 0 ? size[0].blockSize : entry.contentRect.height
}

/**
 * Build the stream slide: the size subscription it reads growth from, the
 * animations it starts and ends, and the hold mark a door keeps on the column
 * while it rolls.
 *
 * @param options.foldBusy - whether a fold glide is animating a height right now.
 * @param options.submissionHeld - whether the reader's own message is still
 *     taking its place (see the composer's slide stand-down).
 * @param options.readerAway - whether the reader is holding the conversation
 *     right now; the guard asks the same question, so the answer is handed in.
 */
export function createStreamSlide(options: { foldBusy: () => boolean, submissionHeld: () => boolean, readerAway: () => boolean }): StreamSlide {
  const { foldBusy, submissionHeld, readerAway } = options
  /** The flow column the slide reads growth from. */
  let column: HTMLElement | null = null
  /** Stops the size subscription on `column`. */
  let stopSize: (() => void) | null = null
  /** Whether the size subscription's first report for the current column has been taken as its baseline. */
  let armed = false
  /** The column's height as the slide last saw it; the growth a frame is measured against. */
  let height = 0
  /** The scroller position after the previous resize batch; null until the first report. */
  let lastScrollTop: number | null = null
  /** The held position's revision at that batch: new travel alone may use the owner's absolute position. */
  let lastReaderRevision = 0
  /** When the last growth arrived, and the smoothed gap before it: the pace a slide is timed to (D95). */
  let grewAt = 0
  let grewEvery = 0
  /** The slide running now: the column's, the counter-slides on stuck chrome, the distance they started from, and their duration. */
  let glide: { column: Animation, counters: Animation[], from: number, duration: number } | null = null
  /** The column the hold mark (FOLLOW_HOLD_ATTR) is on, or null while no door holds it. */
  let heldColumn: HTMLElement | null = null

  /**
   * The live turn's own row and thinking rows, kept current by the bus (D40):
   * the stream slide counter-slides both the bottom waiting row and any top-stuck
   * expanded thinking header so neither jumps while the column glides (D95).
   */
  const runningRows = observeMatches<HTMLElement>(CHAT_RUNNING_SELECTOR)
  const thinkRows = observeMatches<HTMLElement>(THINK_ROW_SELECTOR)
  /**
   * Whether content is arriving right now: the mark the host writes while it
   * streams. It rides the newest block — the answer the flow is writing — so
   * the query starts from the end of the column; a mark standing anywhere else
   * is read off the bus's registry, which hears the attribute arrive, so the
   * transcript is never walked for it.
   */
  const runningMarks = observeMarker<HTMLElement>(FOLLOW_RUNNING_SELECTOR)
  const streaming = () => {
    const flow = conversationColumn()
    if (flow === null) return false
    let block = flow.lastElementChild
    for (let at = 0; at < 3 && block !== null; at += 1, block = block.previousElementSibling) {
      if (block.querySelector(FOLLOW_RUNNING_SELECTOR) !== null) return true
    }
    return runningMarks.all().some((mark) => flow.contains(mark))
  }

  /** Whether this growth is slid: the streaming mark is the gate. */
  const slideWanted = (flow: HTMLElement) => {
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
    return flow.closest(FOLLOWING_TAIL_SELECTOR) !== null
  }

  /** End the running slide where it is: the column and its counter-slid elements land at rest together. */
  const stopSlide = () => {
    if (glide === null) return
    glide.column.cancel()
    for (const counter of glide.counters) counter.cancel()
    glide = null
  }

  /** The distance the running slide still carries, off its own clock and curve: no style is read. */
  const slideCarried = () => {
    if (glide === null) return 0
    const startedAt = glide.column.startTime
    // An animation that has not begun — the frame it was made in has not
    // painted — still carries the whole distance; reading it as nothing would
    // drop that distance on the next restart.
    if (startedAt === null) return glide.from
    const linear = (Number(document.timeline.currentTime) - Number(startedAt)) / glide.duration
    if (!(linear > 0)) return glide.from
    if (linear >= 1) return 0
    // The curve the animation paints with, not the linear share of its
    // duration: with the two mixed up, every restart re-inflates the distance
    // the frame before it had already travelled (D95).
    return glide.from * (1 - motionEaseAt(GLIDE_TOKEN, linear))
  }

  /**
   * How long this slide may run (D95). A piece of an answer arriving at a
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

  /** Expanded thinking headers currently stuck against the outer scroller's top edge (D95). */
  const stuckThinkHeaders = (flow: HTMLElement, scroller: Element | null): HTMLElement[] => {
    if (scroller === null) return []
    const found: HTMLElement[] = []
    let scrollerTop: number | null = null
    const all = thinkRows.all()
    for (let i = all.length - 1; i >= 0; i -= 1) {
      const think = all[i]
      if (!think.hasAttribute(EXPANDED_ATTRIBUTE) || !flow.contains(think)) continue
      // Inside a capped process body, the whole body glides as one box with the column.
      const processBody = think.closest(PROCESS_BODY_SELECTOR)
      if (processBody !== null && processBody.closest(`[${PROCESS_EXPANDED_MODE_ATTRIBUTE}]`) === null) continue
      const header = think.querySelector<HTMLElement>(DISCLOSURE_HEADER_SELECTOR)
        ?? think.querySelector<HTMLElement>(DISCLOSURE_ROW_SELECTOR)
      if (header === null || getComputedStyle(header).position !== 'sticky') continue
      if (scrollerTop === null) scrollerTop = scroller.getBoundingClientRect().top
      const rowRect = think.getBoundingClientRect()
      const headerRect = header.getBoundingClientRect()
      if (rowRect.top < scrollerTop - 0.5
        && rowRect.bottom > scrollerTop + headerRect.height + 0.5
        && Math.abs(headerRect.top - scrollerTop) <= 2) {
        found.push(header)
      }
    }
    return found
  }

  /**
   * Put the column back down by this frame's growth and slide it to rest.
   *
   * One replace-mode animation at a time: an additive one stays off the
   * compositor (D95), so a new growth restarts from the distance still carried
   * — up to the longest stretch a slide carries, so a burst is glided as far as
   * that and no farther. Its length follows the pace the pieces arrive at, so
   * the distance carried never outgrows one piece. The live turn's row is pinned
   * to the scroller's bottom (chat-wait.css) and would ride the column's offset,
   * so it gets the same slide reversed, started in the same frame: the two
   * cancel and it stands.
   */
  const startSlide = (flow: HTMLElement, scroller: Element | null, grew: number) => {
    const from = Math.min(SCROLL_EASE_LEAD_PX, slideCarried() + grew)
    stopSlide()
    const countersToAnimate: HTMLElement[] = []
    const pinned = runningRows.all().find((row) => flow.contains(row)) ?? null
    if (pinned !== null) countersToAnimate.push(pinned)
    for (const header of stuckThinkHeaders(flow, scroller)) countersToAnimate.push(header)
    const duration = slideDuration()
    const timing = { duration, easing: motionEase(GLIDE_TOKEN) }
    const columnSlide = flow.animate([{ transform: `translateY(${from}px)` }, { transform: 'translateY(0px)' }], timing)
    const counterFrames = [{ transform: `translateY(${-from}px)` }, { transform: 'translateY(0px)' }]
    const counters = countersToAnimate.map((element) => element.animate(counterFrames, timing))
    const running = { column: columnSlide, counters, from, duration }
    columnSlide.onfinish = () => {
      if (glide === running) glide = null
    }
    glide = running
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
  const markHold = (flow: HTMLElement) => {
    if (heldColumn === flow) return
    releaseHold()
    flow.setAttribute(FOLLOW_HOLD_ATTR, '')
    heldColumn = flow
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
  const sync = () => {
    // The column is kept by packages/engine/src/chat-dom.ts: asking the document
    // for it on every frame of a stream forced a style pass over the whole page
    // (D9).
    const flow = conversationColumn()
    if (flow === column) return
    if (stopSize !== null) stopSize()
    stopSize = null
    stopSlide()
    column = flow
    armed = false
    height = 0
    lastScrollTop = null
    lastReaderRevision = 0
    // A new column is a new conversation: the pace the old one streamed at is
    // no reading of how fast this one's pieces arrive (D95).
    grewAt = 0
    grewEvery = 0
    if (flow === null) return
    stopSize = observeSize(flow, onResize, { afterHost: true })
  }

  /**
   * Keep the door's hold mark on the column while a door rolls: the door takes
   * the host's follow away until the fold hands it back (fold-glide-parts.ts),
   * and the tail is still followed, so the pin's mark stands through the door.
   */
  const holdCheck = () => {
    if (foldBusy() && !readerAway()) {
      sync()
      if (column !== null) markHold(column)
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
   * position the reader held moves one growth per burst. The slide is refused
   * while the reader holds, so this is the one writer left for it. A position
   * away from the end is the reader's own and stays where the reader put it.
   */
  const holdGrowth = (flow: HTMLElement, previousScrollTop: number | null, readerMoved: boolean) => {
    const scroller = flow.closest(CONVERSATION_SCROLL_SELECTOR)
    if (scroller === null || flow.closest(FOLLOWING_TAIL_SELECTOR) === null) return
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
  const onResize = (entries: ResizeObserverEntry[]) => {
    const flow = column
    let grew = 0
    for (const entry of entries) {
      if (flow === null || entry.target !== flow) continue
      const box = blockSize(entry)
      // The subscription's first report for a column is its height as mounted:
      // the baseline a later growth is measured against, never a growth itself.
      if (!armed) {
        armed = true
        height = box
        const scroller = flow.closest(CONVERSATION_SCROLL_SELECTOR)
        lastScrollTop = scroller?.scrollTop ?? 0
        lastReaderRevision = scroller === null ? 0 : readerScrollRevision(scroller)
        continue
      }
      const delta = box - height
      height = box
      // A structural shrink moves the host's pin by the height that left. An
      // offset from growth before it would add a second, downward move.
      if (delta < 0) stopSlide()
      // Any growth is slid, a burst included: startSlide's clamp bounds what a
      // glide carries, and a column the host replaced is no longer the one
      // watched here (sync re-subscribes when it changes).
      if (delta > 0) {
        grew = delta
        // A faster arrival bounds this slide at once; smoothing a shorter gap
        // would carry the old pause into the new stream and let offsets build
        // up. Slower arrivals still ease toward their own pace (D95).
        const now = performance.now()
        if (grewAt > 0) {
          const gap = now - grewAt
          grewEvery = grewEvery === 0 ? gap : Math.min(gap, grewEvery * 0.6 + gap * 0.4)
        }
        grewAt = now
      }
    }
    const scroller = flow?.closest(CONVERSATION_SCROLL_SELECTOR) ?? null
    const scrollTop = scroller?.scrollTop ?? null
    const previousScrollTop = lastScrollTop
    const revision = scroller === null ? 0 : readerScrollRevision(scroller)
    const readerMoved = revision !== lastReaderRevision
    // Sibling rows can change the pin by less or more than the column grew.
    // Compensate the host's actual position write, not only the column's delta.
    const moved = lastScrollTop === null || scrollTop === null ? 0 : scrollTop - lastScrollTop
    lastScrollTop = scrollTop
    lastReaderRevision = revision
    holdCheck()
    if (flow === null || grew === 0) return
    if (readerAway()) {
      holdGrowth(flow, previousScrollTop, readerMoved)
      if (scroller !== null) {
        lastScrollTop = scroller.scrollTop
        lastReaderRevision = readerScrollRevision(scroller)
      }
      return
    }
    if (!slideWanted(flow)) return
    if (moved < 0) stopSlide()
    if (moved > 0) startSlide(flow, scroller, moved)
  }

  return {
    sync,
    stop: stopSlide,
    holdCheck,
    release() {
      // The subscription and the hold mark go; a slide still running is
      // cancelled in this same pass, so no frame writes after the feature is off.
      if (stopSize !== null) stopSize()
      stopSize = null
      releaseHold()
      stopSlide()
      runningRows.release()
      thinkRows.release()
      runningMarks.release()
      column = null
    },
  }
}
