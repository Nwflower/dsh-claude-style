/**
 * The cross lane's surface and geometry: the selector the specs reach it by names
 * the lane the loader builds, and the tangential offset keeps the three dots apart
 * as they brush past the centre.
 *
 * @capability waiting-line
 * @features chat-wait
 * @risk Dots meeting in one point at the centre read as a single blob, or the lane the specs name is not the lane the page draws.
 */
import { expect, test } from 'vitest'
import { surfaceSelector } from '../../fixtures/surface'

const CROSS_SELECTOR = surfaceSelector('chat-wait.lane-cross')

test('the cross lane surface names a lane of the waiting loader', () => {
  expect(CROSS_SELECTOR).toContain('chat-wait-lane')
  expect(CROSS_SELECTOR.split('.').length).toBe(3)
})

// The endpoints chat-wait.css declares for the three dots, relative to the box centre.
const START: [number, number][] = [[-5.8, -1.6], [4.29, -4.22], [1.51, 5.82]]
const END: [number, number][] = [[5.8, -1.6], [-1.51, 5.82], [-4.29, -4.22]]

test('each dot walks one straight line whose midpoint sits on the offset circle', () => {
  START.forEach((p, at) => {
    const q = END[at]
    const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
    // The midpoint is the foot of the perpendicular from the centre: |mid| = 1.6px.
    expect(Math.hypot(mid[0], mid[1])).toBeCloseTo(1.6, 1)
    // Start and end are equidistant from that foot, on opposite sides along the axis.
    const dStart = Math.hypot(p[0] - mid[0], p[1] - mid[1])
    const dEnd = Math.hypot(q[0] - mid[0], q[1] - mid[1])
    expect(dStart).toBeCloseTo(dEnd, 1)
    expect(dStart).toBeCloseTo(5.8, 1)
    // The walk direction is perpendicular to the offset (dot product zero).
    const walk = [q[0] - p[0], q[1] - p[1]]
    expect(walk[0] * mid[0] + walk[1] * mid[1]).toBeCloseTo(0, 0)
  })
})

test("at the centre the three dots stand a dot's width apart, never in one point", () => {
  const mid = START.map((p, at) => [(p[0] + END[at][0]) / 2, (p[1] + END[at][1]) / 2])
  const sides = [0, 1, 2].map((at) => Math.hypot(mid[at][0] - mid[(at + 1) % 3][0], mid[at][1] - mid[(at + 1) % 3][1]))
  // A 4px dot: the tight triangle's side is sqrt(3) * 1.6 ≈ 2.77px, under one diameter
  // but far above zero — the dots brush past, they do not merge.
  sides.forEach((side) => {
    expect(side).toBeGreaterThan(2.5)
    expect(side).toBeLessThan(4)
  })
})