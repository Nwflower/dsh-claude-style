/**
 * The page's own scale as the settings slider and the stylesheet read it: a
 * stored percentage becomes the factor the page is drawn at, an empty value is
 * the system's own size, anything unreadable is no scaling at all, and the
 * number field shows the same percentage the page is drawn at — a value just
 * past the slider closes onto the nearer end rather than drawing one size while
 * the field names another.
 *
 * @capability page-zoom
 * @features settings, contracts
 * @risk A reader types 112 and the page jumps back to 100, a page with no zoom
 *   stored gets a factor of 0, a hand-edited percentage draws a page size its
 *   own field cannot show, or an earlier preset lands at another size after the
 *   upgrade.
 */
import { expect, test } from 'vitest'
import { PAGE_ZOOM_MAX, PAGE_ZOOM_MIN, clampPrefs } from '@dsh-claude-style/contracts/prefs'
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

test('a percentage past the slider draws at the nearer end, which is the number the field shows', () => {
  expect(pageZoomOf('400')).toBe(PAGE_ZOOM_MAX / 100)
  expect(pageZoomPercent('400')).toBe(PAGE_ZOOM_MAX)
  expect(pageZoomOf('20')).toBe(PAGE_ZOOM_MIN / 100)
  expect(pageZoomPercent('20')).toBe(PAGE_ZOOM_MIN)
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

test('every percentage the slider offers reads back as itself', () => {
  for (let percent = PAGE_ZOOM_MIN; percent <= PAGE_ZOOM_MAX; percent += 1) {
    expect(pageZoomPercent(String(percent))).toBe(percent)
    expect(pageZoomText(pageZoomOf(String(percent)))).toBe(String(percent / 100))
  }
})

test('an earlier preset lands on the percentage it drew', () => {
  const migrated = { system: '', '0.8': '80', '1': '100', '1.25': '125', '1.5': '150' }
  for (const [was, now] of Object.entries(migrated)) {
    expect(clampPrefs({ pageZoom: was }).pageZoom).toBe(now)
    expect(pageZoomPercent(now)).toBe(now === '' ? 100 : Number(now))
  }
  expect(clampPrefs({ pageZoom: 112 }).pageZoom).toBe('100')
})
