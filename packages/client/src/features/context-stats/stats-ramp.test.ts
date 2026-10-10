import { expect, test } from 'vitest'
import { CACHE_HIT_STOPS, CONTEXT_STOPS, RAMP_SPAN_HIGH, RAMP_SPAN_LOW, rampPosition } from './stats-ramp'

/**
 * The colour band a reading falls in (D27): the segment and the position inside
 * it are what the browser mixes the colour from, so the boundary behaviour is
 * what a test can hold — a reading on a stop belongs to that stop, and the two
 * ends saturate instead of running off the band.
 */

test('a reading below the first stop saturates at the low end', () => {
  expect(rampPosition(89.9, CACHE_HIT_STOPS)).toEqual({ span: RAMP_SPAN_LOW, mix: '0%' })
  expect(rampPosition(0, CONTEXT_STOPS)).toEqual({ span: RAMP_SPAN_LOW, mix: '0%' })
})

test('a reading on a stop belongs to the segment that stop opens', () => {
  // 92 is the second stop: inside the segment that runs from orange to yellow.
  expect(rampPosition(92, CACHE_HIT_STOPS)).toEqual({ span: '1', mix: '0%' })
  // 20 is the first stop: the segment that runs from green to light green.
  expect(rampPosition(20, CONTEXT_STOPS)).toEqual({ span: '0', mix: '0%' })
})

test('a reading inside a segment lands part way along it, to a tenth of a percent', () => {
  // Halfway from 90 to 92.
  expect(rampPosition(91, CACHE_HIT_STOPS)).toEqual({ span: '0', mix: '50%' })
  // Three quarters of the way from 36 to 40.
  expect(rampPosition(39, CONTEXT_STOPS)).toEqual({ span: '4', mix: '75%' })
  // A reading that does not divide evenly keeps one decimal.
  expect(rampPosition(37, CONTEXT_STOPS)).toEqual({ span: '4', mix: '25%' })
})

test('a reading at or past the last stop saturates at the high end', () => {
  expect(rampPosition(99, CACHE_HIT_STOPS)).toEqual({ span: RAMP_SPAN_HIGH, mix: '0%' })
  expect(rampPosition(100, CACHE_HIT_STOPS)).toEqual({ span: RAMP_SPAN_HIGH, mix: '0%' })
  expect(rampPosition(40, CONTEXT_STOPS)).toEqual({ span: RAMP_SPAN_HIGH, mix: '0%' })
})
