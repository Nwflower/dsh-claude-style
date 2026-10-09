/**
 * When each newly rendered word fades in (D57), after dsh-better-display's word
 * timeline (MIT). It runs on the text the host's Markdown renderer put on the
 * page, in document order: words get births in the order they appear, so a
 * later word can never show before an earlier one.
 */

/** The fade of one word; the numbers follow the reference's streaming-text recipe. */
export const WORD_MOTION = {
  duration: 350,
  gap: 60,
  /** The shortest gap between two words once a batch is compressed. */
  minGap: 3,
  /** One batch's words land inside this window, however many arrive. */
  batchMs: 90,
} as const

const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' })

/** A run of rendered text that fades from `born` (null: whitespace before the first word, never faded). */
export interface FadingRun {
  start: number
  end: number
  born: number | null
}

/** The length of the common prefix of two strings. */
function commonPrefix(left: string, right: string): number {
  const length = Math.min(left.length, right.length)
  let index = 0
  while (index < length && left.charCodeAt(index) === right.charCodeAt(index)) index += 1
  return index
}

export class WordTimeline {
  private text: string | null = null
  /** Text below this offset was on the page before the fade began, or changed where the reader had read: it never fades. */
  private floor = 0
  private lastBirth = Number.NEGATIVE_INFINITY
  private runs: FadingRun[] = []

  /**
   * Take the rendered text as it stands now. The first reading is history. A
   * later reading keeps the births up to the first changed character and gives
   * births to everything after it; a change before the floor (a reflow of text
   * already read) restarts nothing and moves the floor to the new end.
   */
  update(text: string, enabled: boolean, now: number) {
    if (text === this.text) return
    if (!enabled || this.text === null) {
      this.reset(text)
      return
    }
    const kept = commonPrefix(this.text, text)
    if (kept < this.floor) {
      this.reset(text)
      return
    }
    this.runs = this.runs.filter(run => run.start < kept)
    const last = this.runs.at(-1)
    if (last !== undefined && last.end > kept) last.end = kept
    this.allocate(text.slice(kept), kept, now)
    this.text = text
  }

  private reset(text: string) {
    this.text = text
    this.floor = text.length
    this.runs = []
    this.lastBirth = Number.NEGATIVE_INFINITY
  }

  /**
   * Births for new text. The gap follows the batch: a fixed per-word gap would
   * cap the fade near 16 words a second however fast the model writes, so many
   * words compress into one short window, and the clock never runs more than
   * one window past the newest text.
   */
  private allocate(added: string, from: number, now: number) {
    let arriving = 0
    for (const part of segmenter.segment(added)) if (part.segment.trim() !== '') arriving += 1
    const gap = arriving > 1 ? Math.max(WORD_MOTION.minGap, Math.min(WORD_MOTION.gap, WORD_MOTION.batchMs / arriving)) : WORD_MOTION.gap
    for (const part of segmenter.segment(added)) {
      let born = Number.isFinite(this.lastBirth) ? this.lastBirth : null
      if (part.segment.trim() !== '') {
        born = Math.min(now + WORD_MOTION.batchMs, Math.max(now, this.lastBirth + gap))
        this.lastBirth = born
      }
      const start = from + part.index
      const end = start + part.segment.length
      // Whitespace shares the word before it, so runs stay few.
      const previous = this.runs.at(-1)
      if (previous !== undefined && previous.born === born && previous.end === start) previous.end = end
      else this.runs.push({ start, end, born })
    }
  }

  /**
   * The runs still fading (or not yet born) at `now`. Finished runs are dropped
   * and the text before the first one still fading counts as read from then on.
   */
  fading(now: number): readonly FadingRun[] {
    this.runs = this.runs.filter(run => run.born !== null && now < run.born + WORD_MOTION.duration)
    this.floor = Math.max(this.floor, this.runs[0]?.start ?? this.text?.length ?? 0)
    return this.runs
  }
}

/** How far into its fade a run is at `now`, from 0 (not yet born) to 1 (done). */
export function fadeProgress(born: number, now: number): number {
  return Math.min(1, Math.max(0, (now - born) / WORD_MOTION.duration))
}
