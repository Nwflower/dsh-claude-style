/**
 * @capability composer-viewport
 * @features composer
 * @risk A mobile keyboard hides the composer, leaves an extra gap, or moves it during pinch zoom and on desktop.
 */
import { expect, test } from 'vitest'
import { composerViewportGap } from '@dsh-claude-style/client/pure'

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

test('a following composer stays with the keyboard until it is almost gone', () => {
  expect(composerViewportGap({ ...keyboard, height: 740, previousGap: 300 })).toBe(60)
  expect(composerViewportGap({ ...keyboard, height: 780, previousGap: 60 })).toBe(0)
})
