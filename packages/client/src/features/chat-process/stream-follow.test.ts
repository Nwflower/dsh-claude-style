import { expect, test } from 'vitest'
import { approach, FOLLOW_MAX_FRAME_MS, FOLLOW_TAU_MS } from './stream-follow'

test('a frame closes part of the gap and never steps past the end', () => {
  const closed = approach(0, 100, FOLLOW_TAU_MS)
  expect(closed).toBeGreaterThan(0)
  expect(closed).toBeLessThan(100)
  // The reference's constant: a frame of one time constant closes 1 − e^−1 of
  // the gap, and a longer one is clamped to the frame ceiling.
  expect(approach(0, 100, FOLLOW_TAU_MS)).toBeCloseTo(100 * (1 - Math.exp(-FOLLOW_MAX_FRAME_MS / FOLLOW_TAU_MS)), 5)
})

test('the walk converges: repeated frames arrive at the end', () => {
  let top = 0
  for (let frame = 0; frame < 60; frame += 1) top = approach(top, 400 - top, 16)
  expect(400 - top).toBeLessThan(1)
})

test('a longer frame moves further, and a stalled one is clamped', () => {
  const short = approach(0, 300, 1)
  const long = approach(0, 300, 40)
  const stalled = approach(0, 300, 5000)
  expect(long).toBeGreaterThan(short)
  expect(stalled).toBeCloseTo(approach(0, 300, FOLLOW_MAX_FRAME_MS), 5)
})

test('a zero frame interval still moves, so a fast tab is not stuck', () => {
  expect(approach(0, 50, 0)).toBeGreaterThan(0)
})
