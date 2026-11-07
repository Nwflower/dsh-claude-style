/**
 * @capability composer-viewport
 * @features composer
 * @risk A mobile keyboard hides the composer, leaves an extra gap, or moves it during pinch zoom and on desktop.
 */
import { expect, test } from 'vitest'
import { composerViewportGap } from '@dsh-claude-style/client/pure'

test("the composer follows the visible viewport's bottom by the occluded height", () => {
  expect(composerViewportGap({ layoutHeight: 800, height: 500, offsetTop: 0, scale: 1, narrow: true })).toBe(300)
  expect(composerViewportGap({ layoutHeight: 800, height: 500, offsetTop: 40, scale: 1, narrow: true })).toBe(260)
})

test('desktop, an unobstructed viewport and pinch zoom keep the composer bottom unchanged', () => {
  expect(composerViewportGap({ layoutHeight: 800, height: 800, offsetTop: 0, scale: 1, narrow: true })).toBe(0)
  expect(composerViewportGap({ layoutHeight: 800, height: 500, offsetTop: 0, scale: 1, narrow: false })).toBe(0)
  expect(composerViewportGap({ layoutHeight: 800, height: 500, offsetTop: 0, scale: 1.5, narrow: true })).toBe(0)
})
