/**
 * How the rows of a tool body's output arrive: a batch sweeps from its first
 * row two at a time, a long batch keeps one sweep inside the wait it may take,
 * and a single row standing alone arrives at once.
 *
 * @capability tool-lines
 * @features chat-tool-lines
 * @risk A body's output pops in whole, arrives slower than the reader can read it, or holds the next row of the conversation back for seconds after the output has stopped.
 */
import { expect, test } from 'vitest'
import fc from 'fast-check'
import { LINE_CHUNKED_ROWS, LINE_CHUNK_ROWS, LINE_ROWS_PER_BATCH, lineDelays } from '@dsh-claude-style/client/pure'

/** The times the feature's tokens carry: a chunk's wait, a row's step past forty rows, and the bound. */
const CHUNK = 140
const ROW = 12
const SETTLE = 3800

test('a lone row arrives at once and a chunk of two rows lands together', () => {
  expect(lineDelays(1, CHUNK, ROW, SETTLE)).toEqual([0])
  expect(lineDelays(LINE_CHUNK_ROWS, CHUNK, ROW, SETTLE)).toEqual([0, 0])
  expect(lineDelays(6, CHUNK, ROW, SETTLE)).toEqual([0, 0, CHUNK, CHUNK, CHUNK * 2, CHUNK * 2])
})

test('the chunked pace ends where the row pace starts, with no row waiting on a step of its own', () => {
  const chunked = lineDelays(LINE_CHUNKED_ROWS, CHUNK, ROW, SETTLE)
  const lastChunk = chunked[chunked.length - 1]
  expect(lastChunk).toBe((LINE_CHUNKED_ROWS / LINE_CHUNK_ROWS - 1) * CHUNK)
  const next = lineDelays(LINE_CHUNKED_ROWS + 1, CHUNK, ROW, SETTLE)
  expect(next[next.length - 1]).toBe(lastChunk + ROW)
  // Two rows of one chunk stand at one offset, and the pair after them at the chunk's wait.
  for (let index = 1; index < chunked.length; index += 1) {
    const step = chunked[index]! - chunked[index - 1]!
    expect(step === 0 || step === CHUNK).toBe(true)
  }
})

test('a batch too long for the bound is compressed into one sweep that still ends at the bound', () => {
  const delays = lineDelays(LINE_ROWS_PER_BATCH, CHUNK, ROW, SETTLE)
  expect(delays.length).toBe(LINE_ROWS_PER_BATCH)
  expect(delays[delays.length - 1]).toBe(SETTLE)
  // The sweep keeps its start: the first rows still stand at nothing, and the
  // offsets only ever grow, so no row arrives before one before it.
  expect(delays[0]).toBe(0)
  expect(delays[1]).toBe(0)
  for (let index = 1; index < delays.length; index += 1) expect(delays[index]!).toBeGreaterThanOrEqual(delays[index - 1]!)
  // Compressed, not clipped: the rows past the chunked ones still spread over the sweep.
  const spread = new Set(delays.slice(LINE_CHUNKED_ROWS)).size
  expect(spread).toBeGreaterThan(LINE_CHUNKED_ROWS)
})

test('every batch arrives within the bound, in order, and never past the rows one batch reveals', () => {
  fc.assert(fc.property(
    fc.integer({ min: 0, max: 2000 }),
    fc.integer({ min: 1, max: 400 }),
    fc.integer({ min: 1, max: 60 }),
    fc.integer({ min: 200, max: 5000 }),
    (count, chunk, row, settle) => {
      const delays = lineDelays(count, chunk, row, settle)
      expect(delays.length).toBe(Math.min(count, LINE_ROWS_PER_BATCH))
      for (let index = 0; index < delays.length; index += 1) {
        const delay = delays[index]!
        expect(Number.isInteger(delay)).toBe(true)
        expect(delay).toBeGreaterThanOrEqual(0)
        expect(delay).toBeLessThanOrEqual(settle)
        if (index > 0) expect(delay).toBeGreaterThanOrEqual(delays[index - 1]!)
      }
      if (delays.length > 0) expect(delays[0]).toBe(0)
    },
  ))
})
