/**
 * The page's own scale as the settings slider and the stylesheet read it: a
 * stored percentage becomes the factor the page is drawn at, an empty value is
 * the system's own size, anything unreadable is no scaling at all, and the
 * number field keeps to the slider's range.
 *
 * @capability page-zoom
 * @features settings
 * @risk A reader types 112 and the page jumps back to 100, a page with no zoom
 *   stored gets a factor of 0, or the field shows a percentage the stylesheet
 *   never draws.
 */
import { expect, test } from 'vitest'
import { pageZoomOf, pageZoomPercent, pageZoomText } from '@dsh-claude-style/client/pure'

test('a stored percentage becomes the factor the page is drawn at', () => {
  expect(pageZoomOf('125')).toBe(1.25)
  expect(pageZoomOf('80')).toBe(0.8)
  expect(pageZoomOf('112')).toBe(1.12)
})

test('an empty value is the system size, and an unreadable one scales nothing', () => {
  expect(pageZoomOf('')).toBe(1)
  expect(pageZoomOf('system')).toBe(1)
  expect(pageZoomOf('0')).toBe(1)
  expect(pageZoomOf('-40')).toBe(1)
  expect(pageZoomOf('big')).toBe(1)
})

test('a factor past the slider is no scaling rather than a page outside its bounds', () => {
  expect(pageZoomOf('400')).toBe(1)
  expect(pageZoomOf('20')).toBe(1)
})

test('the factor the stylesheet reads is written without a float tail', () => {
  expect(pageZoomText(1.12)).toBe('1.12')
  expect(pageZoomText(1.1)).toBe('1.1')
  expect(pageZoomText(2)).toBe('2')
  expect(pageZoomText(1)).toBe('1')
})

test('the number field stays inside the slider it stands beside', () => {
  expect(pageZoomPercent('100')).toBe(100)
  expect(pageZoomPercent('')).toBe(100)
  expect(pageZoomPercent('250')).toBe(200)
  expect(pageZoomPercent('40')).toBe(60)
  expect(pageZoomPercent('112')).toBe(112)
})
