/**
 * Whether a process row that has just taken its place plays an entrance.
 *
 * A row is output only while it is the turn under way writing it. Rows the page
 * mounts for any other reason are the conversation as it was saved: the ones
 * standing when the feature installs, the ones a session switch mounts, and an
 * older page of the transcript loading above the reader (row-enter.ts).
 */

/** What one row's arrival is read from. */
export interface RowArrival {
  /** The feature is taking the rows on the page as history: at install, and in the frame a session switch lands in (D91). */
  baselining: boolean
  /** A turn is under way in the row's own conversation. */
  live: boolean
  /** The turn the row belongs to; null when the host names none. */
  turn: number | null
  /** The newest turn among the rows that had already arrived; null before any. */
  newestTurn: number | null
}

/**
 * @returns true when the row is the live turn's own output arriving. A row of a
 *          turn older than one already seen is an earlier page of the
 *          transcript, whatever the session is doing below it.
 */
export function rowPlays(arrival: RowArrival): boolean {
  if (arrival.baselining || !arrival.live) return false
  if (arrival.turn === null || arrival.newestTurn === null) return true
  return arrival.turn >= arrival.newestTurn
}

/** The turn a row's attribute names, or null when it names none. */
export function rowTurn(value: string | null): number | null {
  if (value === null || value === '') return null
  const turn = Number(value)
  return Number.isFinite(turn) ? turn : null
}
