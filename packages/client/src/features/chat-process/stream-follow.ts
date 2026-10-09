import { observeSize } from '../../core/bus'
import { conversationColumn, conversationScroller } from '../../shared/chat-dom'
import { joinScrollOwner, takeBackHostPin } from '../../shared/scroll-owner'
import { CONVERSATION_SCROLL_SELECTOR, FOLLOWING_TAIL_ATTRIBUTE, FOLLOW_THRESHOLD_PX, STREAMING_SELECTOR } from '@dsh-claude-style/contracts/dom'

/**
 * The redraw tier's own tail follow (D56): dsh-better-display's reader walks the
 * scroller toward the end with an exponential approach, so streamed text is
 * followed smoothly instead of being pinned to the bottom one frame at a time.
 *
 * The enhanced tier keeps its own spring (shared/scroll-owner.ts, D41). This one
 * watches the column *after* the host's own observer has run — the host pins the
 * end inside its callback, and this takes that pin back before the frame paints,
 * then walks the distance over the frames in between. A reader who leaves the
 * end keeps his position; a reader at the end, or content growing above him,
 * keeps the walk.
 */

/** Weight of one frame in the exponential approach (the reference's 52 ms time constant). */
export const FOLLOW_TAU_MS = 52
/** Frames longer than this are clamped, so a stalled tab does not jump the whole distance. */
export const FOLLOW_MAX_FRAME_MS = 48

/**
 * One follow frame's new position: the gap closed by `1 − e^(−δ/52)`.
 *
 * @param top - where the scroller is now.
 * @param gap - how far the end is from there.
 * @param deltaMs - the wall-clock length of this frame.
 */
export function approach(top: number, gap: number, deltaMs: number): number {
  const delta = Math.min(FOLLOW_MAX_FRAME_MS, Math.max(1, deltaMs))
  return top + gap * (1 - Math.exp(-delta / FOLLOW_TAU_MS))
}

/** Whether the reader is reading the end of the conversation. */
function atTail(element: HTMLElement): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= FOLLOW_THRESHOLD_PX
}

/**
 * The tier's follow: one frame at a time, only while the reader has not taken
 * the scroller and the lane is not animating a layout (D56's layout events).
 */
export function startStreamFollow() {
  const leaveOwner = joinScrollOwner()
  let frame = 0
  let lastFrameAt = 0
  let layoutDepth = 0
  let lastWritten: number | null = null
  /**
   * The reader's intent to stay at the end, tracked separately from where the
   * position happens to be. Content growth moves the end away from a reader who
   * never moved — reading that as "he left the tail" is what stops a page from
   * following exactly when the newest text arrives (the reference carries the
   * same flag for the same reason).
   */
  let pinned = true
  /** The scroller's content height at the last frame, so growth is told from a scroll. */
  let lastHeight = 0

  const stop = () => {
    if (frame === 0) return
    cancelAnimationFrame(frame)
    frame = 0
    lastWritten = null
  }

  const tick = (now: number) => {
    frame = 0
    const element = conversationScroller()
    if (element === null) return
    if (layoutDepth > 0 || !pinned) return
    const gap = element.scrollHeight - element.clientHeight - element.scrollTop
    if (Math.abs(gap) < 1.5) {
      lastWritten = null
      return
    }
    const delta = now - lastFrameAt
    lastFrameAt = now
    element.scrollTop = approach(element.scrollTop, gap, delta)
    lastWritten = element.scrollTop
    frame = requestAnimationFrame(tick)
  }

  const arm = () => {
    if (frame !== 0 || !pinned) return
    if (conversationScroller() === null) return
    lastFrameAt = performance.now()
    frame = requestAnimationFrame(tick)
  }

  /**
   * A position nobody in this module wrote is the reader's own hand — unless the
   * content above him just grew, which moves the end away without him moving at
   * all.
   */
  const onScroll = (event: Event) => {
    const element = conversationScroller()
    if (element === null || event.target !== element) return
    if (lastWritten !== null && Math.abs(element.scrollTop - lastWritten) < 1) return
    const height = element.scrollHeight
    if (height > lastHeight + 1 && pinned) {
      lastHeight = height
      return
    }
    lastHeight = height
    pinned = atTail(element)
    if (!pinned) stop()
  }

  /**
   * The reader's own hand: a wheel, a touch or a key *inside the conversation*.
   * The reasoning viewports scroll themselves, so a gesture anywhere else on the
   * page — a thinking row's wheel, a keystroke in the composer — is not this
   * scroller's.
   */
  const onReaderIntent = (event: Event) => {
    const element = conversationScroller()
    if (element === null) return
    if (event.type === 'keydown') {
      const target = event.target
      if (target instanceof HTMLElement && target.closest('textarea,input,[contenteditable=true]') !== null) return
    } else if (!(event.target instanceof Node) || !element.contains(event.target)) return
    pinned = false
    stop()
  }
  const onLayoutStart = () => { layoutDepth += 1; stop() }
  const onLayoutEnd = () => {
    layoutDepth = Math.max(0, layoutDepth - 1)
    if (layoutDepth === 0) arm()
  }

  // The host pins the end inside its own observer callback; this subscription is
  // made after it, so the same frame's pin can be taken back before it paints.
  const stopSize = observeSize(conversationColumn() ?? document.body, () => {
    const element = conversationScroller()
    if (element === null) return
    const end = element.scrollHeight
    if (!pinned || layoutDepth > 0) {
      lastHeight = end
      return
    }
    const grew = Math.max(0, end - lastHeight)
    lastHeight = end
    if (grew > 0) {
      takeBackHostPin(element, end, grew)
      lastWritten = null
    }
    arm()
  }, { afterHost: true })

  window.addEventListener('scroll', onScroll, { capture: true, passive: true })
  document.addEventListener('wheel', onReaderIntent, { capture: true, passive: true })
  document.addEventListener('keydown', onReaderIntent, true)
  document.addEventListener('touchstart', onReaderIntent, { capture: true, passive: true })
  document.addEventListener('dsh-claude-layout-start', onLayoutStart, true)
  document.addEventListener('dsh-claude-layout-end', onLayoutEnd, true)

  return {
    /**
     * One pass: arm the walk while answer text is arriving or the host is
     * pinning. A reader who is at the end right now is following again — the
     * same reading the reference takes from a scroll that lands at the bottom.
     */
    sync() {
      const element = conversationScroller()
      if (element !== null) {
        lastHeight = element.scrollHeight
        if (atTail(element)) pinned = true
      }
      if (document.querySelector(STREAMING_SELECTOR) === null && document.querySelector(`[${FOLLOWING_TAIL_ATTRIBUTE}]`) === null) return
      arm()
    },
    /** Whether the walk is running right now; a case can watch it. */
    running: () => frame !== 0,
    stop() {
      stop()
      stopSize()
      window.removeEventListener('scroll', onScroll, { capture: true })
      document.removeEventListener('wheel', onReaderIntent, { capture: true })
      document.removeEventListener('keydown', onReaderIntent, true)
      document.removeEventListener('touchstart', onReaderIntent, { capture: true })
      document.removeEventListener('dsh-claude-layout-start', onLayoutStart, true)
      document.removeEventListener('dsh-claude-layout-end', onLayoutEnd, true)
      leaveOwner()
    },
  }
}

/** The scroller's position, for a case's reading. */
export function followPosition(): { top: number; gap: number } | null {
  const element = document.querySelector(CONVERSATION_SCROLL_SELECTOR)
  if (!(element instanceof HTMLElement)) return null
  return {
    top: Math.round(element.scrollTop),
    gap: Math.round(element.scrollHeight - element.clientHeight - element.scrollTop),
  }
}
