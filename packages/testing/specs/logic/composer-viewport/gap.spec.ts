/**
 * @capability composer-viewport
 * @features composer
 * @risk A mobile keyboard hides the composer, leaves an extra gap, or moves it during pinch zoom and on desktop.
 */
import { expect, test } from 'vitest'
import { composerSeatOffset, composerViewportGap } from '@dsh-claude-style/client/pure'

const keyboard = { layoutHeight: 800, height: 500, offsetTop: 0, scale: 1, narrow: true, previousGap: 0 }

test("the composer follows the visible viewport's bottom by the occluded height", () => {
  expect(composerViewportGap(keyboard)).toBe(300)
  expect(composerViewportGap({ ...keyboard, offsetTop: 40 })).toBe(260)
})

test('desktop, an unobstructed viewport and pinch zoom keep the composer bottom unchanged', () => {
  expect(composerViewportGap({ ...keyboard, height: 800 })).toBe(0)
  expect(composerViewportGap({ ...keyboard, narrow: false })).toBe(0)
  expect(composerViewportGap({ ...keyboard, scale: 1.5 })).toBe(0)
})

test('a scale that differs from 1 only by rounding still counts as an unzoomed page', () => {
  expect(composerViewportGap({ ...keyboard, scale: 1.0000001 })).toBe(300)
  expect(composerViewportGap({ ...keyboard, scale: 0.99999 })).toBe(300)
})

test("the browser's own toolbar moving is not taken for a keyboard", () => {
  expect(composerViewportGap({ ...keyboard, height: 740 })).toBe(0)
})

test('the seat is lifted only as far as its own lower edge needs to reach the visible bottom', () => {
  // iPhone home-screen app with the keyboard open: occlusion 333, visible bottom 464.
  const device = { occlusion: 333, viewportBottom: 464 }
  expect(composerSeatOffset({ ...device, seatBottom: 552, appliedOffset: 0 })).toBe(88)
  expect(composerSeatOffset({ ...device, seatBottom: 219, appliedOffset: 333 })).toBe(88)
  expect(composerSeatOffset({ ...device, seatBottom: 464, appliedOffset: 88 })).toBe(88)
  expect(composerSeatOffset({ ...device, seatBottom: 797, appliedOffset: 0 })).toBe(333)
})

test('a seat within two pixels of the visible bottom is not moved again and the occlusion caps the lift', () => {
  expect(composerSeatOffset({ occlusion: 333, viewportBottom: 464, seatBottom: 465, appliedOffset: 88 })).toBe(88)
  expect(composerSeatOffset({ occlusion: 100, viewportBottom: 464, seatBottom: 797, appliedOffset: 0 })).toBe(100)
  expect(composerSeatOffset({ occlusion: 0, viewportBottom: 800, seatBottom: 900, appliedOffset: 40 })).toBe(0)
})

test('a following composer stays with the keyboard until it is almost gone', () => {
  expect(composerViewportGap({ ...keyboard, height: 740, previousGap: 300 })).toBe(60)
  expect(composerViewportGap({ ...keyboard, height: 780, previousGap: 60 })).toBe(0)
})
