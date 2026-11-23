/**
 * Context meter ring geometry and colour-ramp stop parsing: the arc dash array
 * matches occupancy monotonically, and ramp modes resolve between 2 and 5
 * ascending stops.
 *
 * @capability context-meter
 * @features context-stats
 * @risk The meter arc shows a different share from the number beside it, or malformed ramp strings bypass the 2–5 stop bounds and break colour evaluation.
 */
import { expect, test } from 'vitest'
import fc from 'fast-check'
import { ringDash } from '@dsh-claude-style/client/pure'
import {
  CONTEXT_RAMP_CLASSIC,
  CONTEXT_RAMP_CLASSIC_STOPS,
  CONTEXT_RAMP_DEFAULT_DARK,
  CONTEXT_RAMP_DEFAULT_LIGHT,
  normalizeContextRamp,
  parseContextRamp,
  resolveContextRampStops,
  serializeContextRamp,
} from '@dsh-claude-style/contracts/context-ramp'

const CIRCUMFERENCE = 2 * Math.PI * 5.5

function dashOf(percent: number | null) {
  const [taken, whole] = ringDash(percent).split(' ').map(Number)
  if (whole === undefined || Number.isNaN(taken) || Number.isNaN(whole)) throw new Error(`not a dash array: ${ringDash(percent)}`)
  return { taken, whole }
}

test('the arc covers the reading, and the whole ring is the rest', () => {
  for (const percent of [0, 10, 35, 65, 90, 100]) {
    const { taken, whole } = dashOf(percent)
    expect(whole).toBeCloseTo(CIRCUMFERENCE, 2)
    expect(taken / whole).toBeCloseTo(percent / 100, 2)
  }
  expect(dashOf(null).taken).toBe(0)
})

test('a fuller context never draws a shorter arc', () => {
  fc.assert(fc.property(fc.double({ min: 0, max: 100, noNaN: true }), fc.double({ min: 0, max: 100, noNaN: true }), (a, b) => {
    const [low, high] = a <= b ? [a, b] : [b, a]
    expect(dashOf(high).taken).toBeGreaterThanOrEqual(dashOf(low).taken)
  }))
})

test('ramp parsing sorts 2–5 stops ascending and rejects out-of-range inputs', () => {
  expect(parseContextRamp('80:#DD3344, 30:#22AA66')).toEqual([
    { at: 30, color: '#22aa66' },
    { at: 80, color: '#dd3344' },
  ])
  expect(normalizeContextRamp(CONTEXT_RAMP_CLASSIC)).toBe(CONTEXT_RAMP_CLASSIC)
  expect(parseContextRamp('')).toBeNull()
  expect(parseContextRamp('50:#22aa66')).toBeNull()
  expect(parseContextRamp('10:#111111,20:#222222,30:#333333,40:#444444,50:#555555,60:#666666')).toBeNull()
  expect(parseContextRamp('120:#22aa66,50:#dd3344')).toBeNull()
  expect(serializeContextRamp([{ at: 90, color: '#AA1122' }, { at: 20, color: '#11AA55' }])).toBe('20:#11aa55,90:#aa1122')
})

test('ramp mode resolution selects default, classic, or custom stops with appearance fallback', () => {
  expect(resolveContextRampStops('default', '20:#11aa55,80:#aa1122', true)).toEqual(CONTEXT_RAMP_DEFAULT_DARK)
  expect(resolveContextRampStops('default', '', false)).toEqual(CONTEXT_RAMP_DEFAULT_LIGHT)
  expect(resolveContextRampStops('classic', '', false)).toEqual(CONTEXT_RAMP_CLASSIC_STOPS)
  expect(resolveContextRampStops('custom', '25:#11aa55,85:#aa1122', true)).toEqual([
    { at: 25, color: '#11aa55' },
    { at: 85, color: '#aa1122' },
  ])
  expect(resolveContextRampStops('custom', '', true)).toEqual(CONTEXT_RAMP_DEFAULT_DARK)
})
