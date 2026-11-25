import { CHAT_RUNNING_SELECTOR, DISCLOSURE_HEADER_SELECTOR, DISCLOSURE_ROW_SELECTOR, EXPANDED_ATTRIBUTE, FOLLOWING_TAIL_SELECTOR, PROCESS_BODY_SELECTOR, PROCESS_EXPANDED_MODE_ATTRIBUTE, SHIMMER_SELECTOR, STREAMING_SELECTOR, THINK_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeMarker, observeMatches } from '@dsh-claude-style/engine/bus'
import { conversationColumn } from '@dsh-claude-style/engine/chat-dom'
import { SCROLL_EASE_LEAD_PX } from '@dsh-claude-style/engine/scroll-owner'
import { motionReduced } from '../../core/prefs'
import { motionEase, motionEaseAt, motionMs } from '../../shared/motion'
import { createSlideSync } from './slide-sync'

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

/**
 * The slide's own state. The sync in slide-sync.ts reads and writes it, so the
 * two files meet through one object rather than a second closure of variables.
 */
export interface SlideState {
  /** The flow column the slide reads growth from. */
  slideColumn: HTMLElement | null
  /** Stops the slide's size subscription on slideColumn (see slide-sync.ts). */
  stopSlideSize: (() => void) | null
  /** The column's height as the slide last saw it; the growth a frame is measured against. */
  slideHeight: number
  /** The scroller position after the previous resize batch; null until the first report. */
  slideScrollTop: number | null
  /** The held position's revision at that batch: new travel alone may use the owner's absolute position. */
  slideReaderRevision: number
  /** The slide running now: the column's, the counter-slides on stuck chrome, the distance they started from, and their duration. */
  slide: { column: Animation, counters: Animation[], from: number, duration: number } | null
  /** The column the hold mark (FOLLOW_HOLD_ATTR) is on, or null while no door holds it. */
  heldColumn: HTMLElement | null
  /** Whether the size subscription's first report for the current column has been taken as its baseline. */
  slideArmed: boolean
  /** When the last growth arrived, and the smoothed gap before it: the pace a slide is timed to (D95). */
  grewAt: number
  grewEvery: number
}

/** What slide-sync.ts drives: the state and the animations it starts, ends and measures. */
export interface SlideMotion {
  state: SlideState
  stopSlide(): void
  slideWanted(column: HTMLElement): boolean
  blockSize(entry: ResizeObserverEntry): number
  startSlide(column: HTMLElement, scroller: Element | null, grew: number): void
}

/** The slide as the guard side asks for it: no variable of the slide is readable or writable from outside this file. */
export interface StreamSlide {
  /** Bring the size subscription onto the current column. */
  sync(): void
  /** End the running slide where it is, before its offset outlives the state it was measured in. */
  stop(): void
  /** Keep or drop the door's hold mark for the height change now in flight. */
  holdCheck(): void
  release(): void
}

/**
 * Build the stream slide and the sync under it, behind one seam.
 *
 * Every piece of slide state stays in this closure, so the guard never holds a
 * variable that slide-sync.ts also writes.
 *
 * @param options.foldBusy - whether a fold glide is animating a height right now.
 * @param options.submissionHeld - whether the reader's own message is still
 *     taking its place (see the composer's slide stand-down).
 * @param options.readerAway - whether the reader is holding the conversation
 *     right now; the guard asks the same question, so the answer is handed in.
 */
export function createStreamSlide(options: { foldBusy: () => boolean, submissionHeld: () => boolean, readerAway: () => boolean }) {
  const { foldBusy, submissionHeld, readerAway } = options
  const state: SlideState = {
    slideColumn: null,
    stopSlideSize: null,
    slideHeight: 0,
    slideScrollTop: null,
    slideReaderRevision: 0,
    slide: null,
    heldColumn: null,
    slideArmed: false,
    grewAt: 0,
    grewEvery: 0,
  }
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
    const column = conversationColumn()
    if (column === null) return false
    let block = column.lastElementChild
    for (let at = 0; at < 3 && block !== null; at += 1, block = block.previousElementSibling) {
      if (block.querySelector(FOLLOW_RUNNING_SELECTOR) !== null) return true
    }
    return runningMarks.all().some((mark) => column.contains(mark))
  }

  /** Whether this growth is slid: the streaming mark is the gate. */
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

  /** End the running slide where it is: the column and its counter-slid elements land at rest together. */
  const stopSlide = () => {
    if (state.slide === null) return
    state.slide.column.cancel()
    for (const counter of state.slide.counters) counter.cancel()
    state.slide = null
  }

  /** The distance the running slide still carries, off its own clock and curve: no style is read. */
  const slideCarried = () => {
    if (state.slide === null) return 0
    const startedAt = state.slide.column.startTime
    // An animation that has not begun — the frame it was made in has not
    // painted — still carries the whole distance; reading it as nothing would
    // drop that distance on the next restart.
    if (startedAt === null) return state.slide.from
    const linear = (Number(document.timeline.currentTime) - Number(startedAt)) / state.slide.duration
    if (!(linear > 0)) return state.slide.from
    if (linear >= 1) return 0
    // The curve the animation paints with, not the linear share of its
    // duration: with the two mixed up, every restart re-inflates the distance
    // the frame before it had already travelled (D95).
    return state.slide.from * (1 - motionEaseAt(GLIDE_TOKEN, linear))
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
    if (state.grewEvery === 0) return longest
    return Math.min(longest, Math.max(state.grewEvery, 1))
  }

  /** Expanded thinking headers currently stuck against the outer scroller's top edge (D95). */
  const stuckThinkHeaders = (column: HTMLElement, scroller: Element | null): HTMLElement[] => {
    if (scroller === null) return []
    const found: HTMLElement[] = []
    let scrollerTop: number | null = null
    const all = thinkRows.all()
    for (let i = all.length - 1; i >= 0; i -= 1) {
      const think = all[i]
      if (!think.hasAttribute(EXPANDED_ATTRIBUTE) || !column.contains(think)) continue
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
  const startSlide = (column: HTMLElement, scroller: Element | null, grew: number) => {
    const from = Math.min(SCROLL_EASE_LEAD_PX, slideCarried() + grew)
    stopSlide()
    const countersToAnimate: HTMLElement[] = []
    const pinned = runningRows.all().find((row) => column.contains(row)) ?? null
    if (pinned !== null) countersToAnimate.push(pinned)
    for (const header of stuckThinkHeaders(column, scroller)) countersToAnimate.push(header)
    const duration = slideDuration()
    const timing = { duration, easing: motionEase(GLIDE_TOKEN) }
    const columnSlide = column.animate([{ transform: `translateY(${from}px)` }, { transform: 'translateY(0px)' }], timing)
    const counterFrames = [{ transform: `translateY(${-from}px)` }, { transform: 'translateY(0px)' }]
    const counters = countersToAnimate.map((element) => element.animate(counterFrames, timing))
    const running = { column: columnSlide, counters, from, duration }
    columnSlide.onfinish = () => {
      if (state.slide === running) state.slide = null
    }
    state.slide = running
  }

  /** The size reading's own block size. */
  const blockSize = (entry: ResizeObserverEntry) => {
    const size = entry.borderBoxSize
    return size !== undefined && size.length > 0 ? size[0].blockSize : entry.contentRect.height
  }

  const sync = createSlideSync({ state, stopSlide, slideWanted, blockSize, startSlide }, { foldBusy, readerAway })

  const slide: StreamSlide = {
    sync: sync.sync,
    stop: stopSlide,
    holdCheck: sync.holdCheck,
    release() {
      // The subscription and the hold mark go with the sync; a slide still
      // running is cancelled in this same pass, so no frame writes after the
      // feature is off.
      sync.release()
      stopSlide()
      runningRows.release()
      thinkRows.release()
      runningMarks.release()
      state.slideColumn = null
    },
  }
  return slide
}
