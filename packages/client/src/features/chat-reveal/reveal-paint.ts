import { requestFrame } from '../../core/frame'
import {
  CHAT_REVEAL_FRAME_GAP_MS,
  CHAT_REVEAL_HIDDEN_GAP_MS,
  CHAT_REVEAL_MS,
  CHAT_REVEAL_NOMINAL_FRAME_MS,
  CHAT_REVEAL_SLOW_FRAME_MS,
  CHAT_REVEAL_SLOW_FRAME_RUN,
  CHAT_REVEAL_STEPS,
  CHAT_REVEAL_YIELD_MS,
} from './reveal-params'
import type { RevealState } from './reveal-params'

/** What the paint loop needs from the rest of the engine: the step table and the colour publisher. */
interface RevealPaintHooks {
  clearHighlights: () => void
  showStep: (step: number, ranges: StaticRange[]) => void
  publishRunColor: (element: HTMLElement | null) => void
}

/**
 * The frame loop, with the engine's timestamps in `state`.
 *
 * @param state - the engine's state; this module owns the frame timestamps in it.
 * @param hooks - the step table and the colour publisher.
 * @returns paint.
 */
export function createRevealPainter(state: RevealState, hooks: RevealPaintHooks) {
  const { clearHighlights, publishRunColor, showStep } = hooks

  /**
   * The main thread is full: the segments in hand are settled, and new
   * characters arrive at full strength for a while.
   *
   * The fade would not paint smoothly anyway — every step would sit for tens
   * of milliseconds — and its per-frame work is stacked on top of whatever is
   * already slow. Giving way is better: the text still arrives, it just skips
   * the fade.
   */
  const revealYield = () => {
    state.yieldUntil = performance.now() + CHAT_REVEAL_YIELD_MS
    state.slowFrames = 0
    state.lastFrameAt = 0
    state.liveRuns.length = 0
    clearHighlights()
  }

  /** Queue the next paint frame. */
  const scheduleFrame = () => {
    state.cancelPaintFrame = requestFrame({
      write(now) {
        paint(now, true)
      },
    })
  }

  /**
   * Repaint every live segment at its age's step, then queue the next frame.
   * @param now - this frame's timestamp.
   * @param fromFrame - called by a paint frame rather than by the synchronous
   *     repaint a scan does: only these gaps say whether the main thread is busy.
   */
  const paint = (now: number, fromFrame: boolean) => {
    state.cancelPaintFrame = null
    if (state.liveRuns.length === 0) {
      clearHighlights()
      return
    }
    // No frame was drawn in a long gap — a hidden page stops rAF, and a busy
    // main thread skips frames while performance.now() keeps running. The
    // undrawn stretch is subtracted from every segment's age so they continue
    // their own fade after the page comes back, rather than all expiring in
    // one frame.
    const previousFrameAt = state.lastFrameAt
    state.lastFrameAt = now
    const gap = previousFrameAt === 0 ? 0 : now - previousFrameAt
    // Several slow frames in a row are a full main thread, not one long task:
    // give way. A multi-second blank is a hidden page — nobody is watching,
    // which is not being busy.
    if (fromFrame && gap > CHAT_REVEAL_SLOW_FRAME_MS && gap < CHAT_REVEAL_HIDDEN_GAP_MS) state.slowFrames += 1
    else if (fromFrame && gap > 0) state.slowFrames = 0
    if (state.slowFrames >= CHAT_REVEAL_SLOW_FRAME_RUN) {
      revealYield()
      return
    }
    if (gap > CHAT_REVEAL_FRAME_GAP_MS) {
      const unspent = gap - CHAT_REVEAL_NOMINAL_FRAME_MS
      for (const run of state.liveRuns) {
        // Segments born in the blank count as born now, or they would wait
        // that same blank out before starting to fade.
        run.bornAt = run.bornAt <= previousFrameAt ? run.bornAt + unspent : now
      }
    }
    /** The segment each step has already drawn this frame; a following segment that touches it is merged in. */
    const drawn: ({ node: Text, start: number, end: number } | null)[] = new Array(CHAT_REVEAL_STEPS).fill(null)
    const buckets: { node: Text, start: number, end: number }[][] = []
    for (let step = 0; step < CHAT_REVEAL_STEPS; step += 1) buckets.push([])
    /** Live segments are compacted in place: splice would move every later element, and a batch of thousands is quadratic. */
    let kept = 0
    for (let index = 0; index < state.liveRuns.length; index += 1) {
      const run = state.liveRuns[index]
      if (run === undefined) continue
      const age = now - run.bornAt - run.delay
      // Done: it is as solid as the text around it and needs no highlight.
      if (age >= CHAT_REVEAL_MS) continue
      state.liveRuns[kept] = run
      kept += 1
      // The scans that queued these segments built the snapshots on their
      // way, and every mutation after that goes through a fresh scan before
      // this frame, so the cache holds what is on screen. Walking the
      // container again here would put an O(whole message) TreeWalker into
      // every frame.
      const snapshot = state.textSnapshots.get(run.container)
      if (snapshot === undefined) continue

      // The first text node that can hold this segment, found by binary
      // search over the snapshot: character-by-character segments mean many
      // lookups a frame, and scanning from the message's start is too slow.
      const end = run.start + run.length
      let low = 0
      let high = snapshot.entries.length - 1
      let firstIndex = -1
      while (low <= high) {
        const middle = (low + high) >> 1
        const entry = snapshot.entries[middle]
        if (entry === undefined) break
        if (entry.start + entry.node.data.length <= run.start) {
          low = middle + 1
          continue
        }
        firstIndex = middle
        high = middle - 1
      }
      // The segment is no longer in the DOM.
      const firstEntry = snapshot.entries[firstIndex]
      if (firstEntry === undefined) continue
      if (firstEntry.start >= end) continue
      const start = Math.max(0, run.start - firstEntry.start)
      let lastNode = firstEntry.node
      let lastEnd = Math.min(firstEntry.node.data.length, end - firstEntry.start)
      for (let next = firstIndex + 1; next < snapshot.entries.length; next += 1) {
        const entry = snapshot.entries[next]
        if (entry === undefined) break
        if (entry.start >= end) break
        lastNode = entry.node
        lastEnd = Math.min(entry.node.data.length, end - entry.start)
      }
      // The element comes from the text node the segment is in, not from the
      // one the scan saw. The markdown layer rebuilds nodes while a message
      // streams (re-parsing **bold, folding a row); once the element a segment
      // lived in is replaced, the colour written on the old one paints nothing
      // and the new one falls back to the page's default — a flash of body
      // colour instead of a fade.
      //
      // But the colour is read only when the element really changed:
      // publishRunColor's first step is getComputedStyle, a forced style
      // resolution, and a few hundred segments a frame each reading it would
      // drag the page's whole style recalc into rAF. The frames where nothing
      // changed (nearly all of them) need one comparison.
      const element = firstEntry.node.parentElement
      if (element !== run.colorElement) {
        publishRunColor(element)
        run.colorElement = element
      }

      // The step: 0 is faintest, the last is the element's own colour; the
      // mapping is linear in time, so the colour settles at a constant rate.
      const step = age <= 0 ? 0 : Math.floor((age / CHAT_REVEAL_MS) * CHAT_REVEAL_STEPS)
      const bucket = buckets[step]
      if (bucket === undefined) continue
      // Adjacent characters in one text node at one step are the same stretch
      // of text this frame, so one segment holds them: the segment count drops
      // from characters to stretches.
      const previous = drawn[step] ?? null
      if (previous !== null && lastNode === firstEntry.node && previous.node === firstEntry.node && previous.end === start) {
        previous.end = lastEnd
        continue
      }
      const segment = { node: firstEntry.node, start, end: lastEnd }
      drawn[step] = segment
      bucket.push(segment)
    }
    state.liveRuns.length = kept
    for (let step = 0; step < CHAT_REVEAL_STEPS; step += 1) {
      const list = buckets[step] ?? []
      // A StaticRange does not track DOM changes, and every frame builds them
      // from the fresh snapshot, so tracking is not needed; a live Range would
      // have the page fix its boundaries on every DOM change until collected.
      const ranges = list.map(segment => new StaticRange({
        startContainer: segment.node,
        startOffset: segment.start,
        endContainer: segment.node,
        endOffset: segment.end,
      }))
      showStep(step, ranges)
    }
    if (state.liveRuns.length > 0) scheduleFrame()
    else clearHighlights()
  }

  return paint
}
