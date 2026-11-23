/**
 * Cache-hit ramp placement and polar OKLCH context-occupancy ramp evaluation,
 * including contrast-legible text ink on light and dark canvases.
 *
 * @capability context-stats
 * @features context-stats
 * @risk Cache-hit or context figures paint in an unreadable or discontinuous colour, or bright yellow custom stops disappear on a light canvas.
 */
import { expect, test } from 'vitest'
import fc from 'fast-check'
import {
  CACHE_HIT_STOPS,
  RAMP_SPAN_HIGH,
  RAMP_SPAN_LOW,
  contextRampGradientCss,
  contrastRatio,
  evaluateContextRamp,
  interpolateOklchHex,
  rampPosition,
  readableContextInk,
} from '@dsh-claude-style/client/pure'

test('cache-hit readings saturate below the first stop and at or past the last stop', () => {
  expect(rampPosition(89.9, CACHE_HIT_STOPS)).toEqual({ span: RAMP_SPAN_LOW, mix: '0%' })
  expect(rampPosition(92, CACHE_HIT_STOPS)).toEqual({ span: '1', mix: '0%' })
  expect(rampPosition(91, CACHE_HIT_STOPS)).toEqual({ span: '0', mix: '50%' })
  expect(rampPosition(99, CACHE_HIT_STOPS)).toEqual({ span: RAMP_SPAN_HIGH, mix: '0%' })
  expect(rampPosition(100, CACHE_HIT_STOPS)).toEqual({ span: RAMP_SPAN_HIGH, mix: '0%' })
})

function along(position: ReturnType<typeof rampPosition>, stops: readonly number[]) {
  if (position.span === RAMP_SPAN_LOW) return -1
  if (position.span === RAMP_SPAN_HIGH) return stops.length
  return Number(position.span) + parseFloat(position.mix) / 100
}

test('a higher cache-hit reading never stands earlier on the band, and every mix is valid CSS', () => {
  fc.assert(fc.property(fc.double({ min: 0, max: 100, noNaN: true }), fc.double({ min: 0, max: 100, noNaN: true }), (a, b) => {
    const [low, high] = a <= b ? [a, b] : [b, a]
    expect(along(rampPosition(high, CACHE_HIT_STOPS), CACHE_HIT_STOPS)).toBeGreaterThanOrEqual(along(rampPosition(low, CACHE_HIT_STOPS), CACHE_HIT_STOPS))
    const { mix } = rampPosition(high, CACHE_HIT_STOPS)
    expect(CSS.supports('color', `color-mix(in srgb, red ${mix}, blue)`)).toBe(true)
  }))
})

test('context ramp evaluates default, classic and custom OKLCH stops and guarantees >= 3.5:1 ink contrast', () => {
  expect(interpolateOklchHex('#257de0', '#dc3c3d', 0)).toBe('#257de0')
  expect(interpolateOklchHex('#257de0', '#dc3c3d', 1)).toBe('#dc3c3d')
  const lowDark = evaluateContextRamp(20, 'default', '', true)
  const highDark = evaluateContextRamp(92, 'default', '', true)
  expect(lowDark.span).toBe(RAMP_SPAN_LOW)
  expect(highDark.span).toBe(RAMP_SPAN_HIGH)
  expect(lowDark.graphic).toBe('#6faf73')
  expect(highDark.graphic).toBe('#d5746a')

  const classicLightYellow = evaluateContextRamp(78, 'classic', '', false)
  expect(classicLightYellow.graphic).toBe('#fbb315')
  expect(contrastRatio(classicLightYellow.ink, '#faf9f5')).toBeGreaterThanOrEqual(3.5)

  const darkBlue = readableContextInk('#0c1b33', true)
  expect(contrastRatio(darkBlue, '#191919')).toBeGreaterThanOrEqual(3.5)

  const gradient = contextRampGradientCss([
    { at: 30, color: '#22aa66' },
    { at: 85, color: '#dd3344' },
  ])
  expect(CSS.supports('background-image', gradient)).toBe(true)
})
