/**
 * How a streaming thought's viewport follows its text (D57), ported from
 * dsh-better-display's reasoning follow (MIT): two lines, then a hold, at
 * reading pace; never looping old text, never past the real end.
 */

/** The hold between two steps, in ms. */
export const REASON_HOLD = 840
/** One step's slide, in ms. */
export const REASON_STEP = 500
/** Lines one step covers at reading pace. */
export const REASON_LINES = 2
/** The most lines one catch-up step covers. */
export const REASON_MAX_LINES = 40
/** The hold between catch-up steps while the text is still well ahead. */
export const REASON_CHASE_HOLD = 40

/**
 * Where the next step lands. `backlogLines` is how far the newest text sits
 * below what is painted: a model writing faster than the reading pace would
 * leave the viewport crawling behind in fixed hops, so one step covers the
 * backlog, up to the ceiling; at or below the reading pace it stays two lines.
 */
export function reasoningTarget(top: number, contentHeight: number, viewportHeight: number, lineHeight: number, backlogLines = 0): number {
  const end = Math.max(0, contentHeight - viewportHeight)
  const current = Math.min(end, Math.max(0, top))
  const lines = Math.max(REASON_LINES, Math.min(REASON_MAX_LINES, Math.ceil(backlogLines)))
  return Math.min(end, current + Math.max(1, lineHeight) * lines)
}
