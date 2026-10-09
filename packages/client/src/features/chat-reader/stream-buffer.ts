/**
 * How much of a streaming text is shown (D57), ported from dsh-better-display's
 * stream buffer (MIT). Presentation only: the session's string stays the truth.
 *
 * The reveal runs at the rate the source is producing (feed-forward) plus a
 * proportional term that drains whatever backlog jitter left. A proportional
 * term alone drains one window per window, so the view would trail live output
 * by a whole window forever; the feed-forward term is what lets the pace follow
 * the model.
 */
export const STREAM_TIMING = {
  catchUpMs: 520,
  maxQueuedMs: 600,
  finishMs: 96,
  revealMs: 350,
  minimumRate: 260,
  /** Weight of the newest arrival in the smoothed source rate. */
  rateWeight: 0.35,
  /** A longer gap is a pause between runs, not a slow model: the estimate stands. */
  rateGapMs: 250,
} as const

/** A backlog this long is flushed at once: typing it out would only delay the reader. */
const FLUSH_BACKLOG = 8192

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/** The index of the first value at or after `target` in an ascending list. */
function atOrAfter(values: readonly number[], target: number): number {
  let low = 0
  let high = values.length - 1
  while (low < high) {
    const middle = (low + high) >>> 1
    if (values[middle]! < target) low = middle + 1
    else high = middle
  }
  return low
}

export class StreamBuffer {
  target: string
  visible: string
  /** Moves whenever the text changed other than by appending. */
  revision = 0
  /** Grapheme starts of the target, so a reveal never splits a cluster. */
  private boundaries = [0]
  private arrivals: { end: number, at: number }[] = []
  private lastAt: number | null = null
  private credit = 0
  private finishAt: number | null = null
  private rateEwma = 0
  private lastArrival: number | null = null

  constructor(initial = '') {
    this.target = initial
    this.visible = initial
    this.segment(0)
  }

  get pending(): boolean {
    return this.visible.length < this.target.length
  }

  private segment(from: number) {
    this.boundaries.length = atOrAfter(this.boundaries, from)
    for (const part of graphemes.segment(this.target.slice(from))) this.boundaries.push(from + part.index)
    if (this.boundaries.at(-1) !== this.target.length) this.boundaries.push(this.target.length)
  }

  /**
   * Take the source as it stands. Anything other than an append (a correction,
   * a cancellation) and an `immediate` update (reduced motion, a hidden view, a
   * selection) shows everything at once, never replaying.
   */
  update(text: string, now: number, options: { immediate?: boolean, finished?: boolean } = {}) {
    if (options.immediate === true || !text.startsWith(this.target)) {
      if (text !== this.target) this.revision += 1
      this.target = text
      this.flush()
      this.boundaries = [0]
      this.segment(0)
      return
    }
    if (text !== this.target) {
      const wasPending = this.pending
      const from = this.boundaries.at(-2) ?? 0
      this.observe(text.length - this.target.length, now)
      this.target = text
      // The last cluster is segmented again: an emoji or a combining sequence can span two chunks.
      this.segment(from)
      this.arrivals.push({ end: text.length, at: now })
      if (!wasPending) {
        this.lastAt = now
        this.credit = 0
      }
    }
    if (options.finished === true && this.finishAt === null) this.finishAt = now + STREAM_TIMING.finishMs
    if (options.finished !== true) this.finishAt = null
    if (this.target.length - this.visible.length > FLUSH_BACKLOG) {
      this.revision += 1
      this.flush()
    }
  }

  /** The smoothed source rate, so one jittery chunk cannot set the pace. */
  private observe(grew: number, now: number) {
    const previous = this.lastArrival
    this.lastArrival = now
    if (previous === null || grew <= 0) return
    const elapsed = now - previous
    if (elapsed <= 0 || elapsed > STREAM_TIMING.rateGapMs) return
    const sample = grew * 1000 / elapsed
    this.rateEwma = this.rateEwma === 0 ? sample : this.rateEwma * (1 - STREAM_TIMING.rateWeight) + sample * STREAM_TIMING.rateWeight
  }

  flush() {
    this.visible = this.target
    this.arrivals = []
    this.credit = 0
    this.lastAt = null
    this.lastArrival = null
    this.finishAt = null
  }

  /** Show more for this frame; returns whether anything changed. */
  advance(now: number): boolean {
    if (!this.pending) return false
    const before = this.visible.length
    const index = atOrAfter(this.boundaries, before)
    const remaining = this.boundaries.length - index - 1
    const delta = Math.max(0, now - (this.lastAt ?? now))
    this.lastAt = now
    const windowMs = this.finishAt === null ? STREAM_TIMING.catchUpMs : Math.max(16, Math.min(STREAM_TIMING.catchUpMs, this.finishAt - now))
    const rate = Math.max(STREAM_TIMING.minimumRate, this.rateEwma + remaining * 1000 / windowMs)
    this.credit += rate * delta / 1000
    const count = Math.floor(this.credit)
    this.credit -= count
    let end = this.boundaries[Math.min(this.boundaries.length - 1, index + count)]!
    // No received batch waits longer than the queue ceiling.
    for (const item of this.arrivals) {
      if (now - item.at < STREAM_TIMING.maxQueuedMs) break
      end = Math.max(end, this.boundaries[atOrAfter(this.boundaries, item.end)]!)
    }
    if (this.finishAt !== null && now >= this.finishAt) end = this.target.length
    // Half of a surrogate pair is never shown while the source can still grow.
    if (end > 0 && /[\uD800-\uDBFF]/.test(this.target[end - 1]!) && this.finishAt === null) end -= 1
    end = Math.max(before, end)
    this.visible = this.target.slice(0, end)
    this.arrivals = this.arrivals.filter(item => item.end > end)
    if (!this.pending) {
      this.credit = 0
      this.lastAt = null
    }
    return end !== before
  }
}
