import { expect, test } from 'vitest'
import { birthTimes, WORD_MOTION } from './stream-reveal'

test('a lone arrival keeps the reading rhythm: one gap after the last birth', () => {
  const [only] = birthTimes(1, 1000, 2000)
  expect(only).toBe(2000)
  const [next] = birthTimes(1, 2000, 2010)
  expect(next).toBe(2000 + WORD_MOTION.gap)
})

test('a batch is compressed into one window, whatever its size', () => {
  const few = birthTimes(5, 0, 1000)
  const many = birthTimes(60, 0, 1000)
  // Every birth of a batch lands inside the window, however many arrived.
  for (const born of many) expect(born).toBeLessThanOrEqual(1000 + WORD_MOTION.batchMs)
  expect(few[0]).toBe(1000)
  expect(many.at(-1)).toBe(1000 + WORD_MOTION.batchMs)
  // A bigger batch is spread more tightly, never more loosely.
  const gapOf = (times: number[]) => times[1]! - times[0]!
  expect(gapOf(many)).toBeLessThanOrEqual(gapOf(few))
  expect(gapOf(many)).toBeGreaterThanOrEqual(WORD_MOTION.minGap)
})

test('births never run ahead of the clock by more than one window', () => {
  const times = birthTimes(12, 0, 5000)
  expect(Math.max(...times)).toBeLessThanOrEqual(5000 + WORD_MOTION.batchMs)
  expect(times[0]).toBe(5000)
  // In order, and each one behind the cap.
  expect([...times].sort((a, b) => a - b)).toEqual(times)
})

test('the first arrival of a session is born now, and its batch follows the cadence', () => {
  expect(birthTimes(1, -Infinity, 900)).toEqual([900])
  expect(birthTimes(3, -Infinity, 900)).toEqual([900, 930, 960])
})
