/**
 * The multiplier a model's streaming estimate is written at: the inverse of the
 * median ratio its own settled steps have shown, held between 0.9 and 1.1.
 *
 * @capability context-stats
 * @features context-stats
 * @risk The figure stays at the fitted price for a route whose tokenizer prices text differently, so it overstates or understates every step of that model; a single large write or a three-token settlement swings the multiplier so the next answer is written far off.
 */
import { expect, test } from 'vitest'
import { estimateScale, recordSettlement, STREAM_UNDERESTIMATE } from '@dsh-claude-style/client/pure'

test('the streaming growth figure carries a separate intentional under-estimate (D103)', () => {
  // Below one so the live figure grows up toward the settlement, never overshoots it;
  // independent of the learned multiplier, which calibrates the unfactored estimate.
  expect(STREAM_UNDERESTIMATE).toBeGreaterThan(0)
  expect(STREAM_UNDERESTIMATE).toBeLessThan(1)
  expect(estimateScale([]) * STREAM_UNDERESTIMATE).toBeLessThan(1)
})

test('no settlement yet leaves the fitted estimate as it is', () => {
  expect(estimateScale([])).toBe(1)
})

test('a model that settles above the figure moves the multiplier down, no further than 0.9', () => {
  expect(estimateScale([2])).toBeCloseTo(0.9, 6)
  expect(estimateScale([1.05])).toBeCloseTo(1 / 1.05, 6)
})

test('a model that settles below the figure moves the multiplier up, no further than 1.1', () => {
  expect(estimateScale([0.5])).toBeCloseTo(1.1, 6)
  expect(estimateScale([0.95])).toBeCloseTo(1 / 0.95, 6)
})

test('the median holds the multiplier when one step settles far off', () => {
  const usual = [1, 1.05, 0.98, 1.02, 1.01]
  expect(estimateScale([...usual, 0.02])).toBeCloseTo(1 / 1.005, 6)
})

test('a settlement under forty tokens is no sample', () => {
  expect(recordSettlement([1], 900, 30)).toEqual([1])
  expect(recordSettlement([1], 0, 400)).toEqual([1])
  expect(recordSettlement([1], 120, 40).length).toBe(2)
})

test('a model reads its last twenty settlements', () => {
  let samples: readonly number[] = []
  for (let index = 0; index < 25; index++) samples = recordSettlement(samples, 200, 100)
  expect(samples.length).toBe(20)
  expect(samples.every((sample) => sample === 2)).toBe(true)
  expect(estimateScale(samples)).toBeCloseTo(0.9, 6)
})
