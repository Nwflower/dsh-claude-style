/**
 * How a tool body's output rows arrive: two rows at a time, a chunk's wait
 * between chunks, then a row at a time for a long body, and the whole batch
 * compressed to fit the wait a body may take.
 *
 * A batch is the rows that appeared together — one body mounting, or the lines a
 * running command appends in one frame. Its first row stands at nothing, so a
 * line streaming in on its own is drawn at once and a body that arrives whole
 * sweeps from its first row (tool-line-reveal.ts).
 */

/** The rows one chunk of a batch holds: two lines read as one arrival. */
export const LINE_CHUNK_ROWS = 2
/** How many rows the chunked pace covers before one row per step takes over. */
export const LINE_CHUNKED_ROWS = 40
/** The most rows one batch gives an arrival to; past it the rows are below what a body draws. */
export const LINE_ROWS_PER_BATCH = 400

/**
 * The arrival offset of each row of one batch.
 *
 * @param count - the rows the batch revealed.
 * @param chunkMs - the wait between two chunks.
 * @param rowMs - the wait between two rows once the chunked rows are spent.
 * @param settleMs - the longest a batch may take; a batch longer than this has
 *        every offset scaled down, so a long body keeps one sweep instead of
 *        piling its tail onto the bound.
 * @returns one offset per row, in milliseconds, ascending; the rows past
 *          LINE_ROWS_PER_BATCH are left out.
 */
export function lineDelays(count: number, chunkMs: number, rowMs: number, settleMs: number): number[] {
  const rows = Math.max(0, Math.min(count, LINE_ROWS_PER_BATCH))
  // The last chunked row's own offset: the row pace takes over from there, so
  // no row waits longer than the one before it plus one step.
  const chunked = (Math.ceil(LINE_CHUNKED_ROWS / LINE_CHUNK_ROWS) - 1) * chunkMs
  const raw: number[] = []
  for (let index = 0; index < rows; index += 1) {
    raw.push(index < LINE_CHUNKED_ROWS
      ? Math.floor(index / LINE_CHUNK_ROWS) * chunkMs
      : chunked + (index - LINE_CHUNKED_ROWS + 1) * rowMs)
  }
  const last = raw[rows - 1] ?? 0
  if (last <= settleMs) return raw
  const scale = settleMs / last
  return raw.map(delay => Math.round(delay * scale))
}
