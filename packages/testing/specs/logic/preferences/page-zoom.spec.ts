/**
 * The page's scale (settings › General) as a stored percentage: which value the
 * row shows, which factor the mirror writes, and what an earlier fixed preset
 * reads as after the upgrade (packages/contracts/src/prefs.ts, shared/page-zoom.ts).
 *
 * @capability preferences
 * @features core, contracts
 * @risk A reader who picked a fixed preset lands at another page size after upgrading, a hand-edited percentage outside 60–200 draws a page the row cannot show or change again, or a factor written back carries a float tail.
 */
import { expect, test } from 'vitest'
import { PAGE_ZOOM_MAX, PAGE_ZOOM_MIN, clampPrefs } from '@dsh-claude-style/contracts/prefs'
import { pageZoomOf, pageZoomPercent, pageZoomText } from '@dsh-claude-style/client/pure'

test('an earlier fixed preset reads as the percentage it drew', () => {
  const migrated = { '0.8': '80', '1': '100', '1.25': '125', '1.5': '150' }
  for (const [was, now] of Object.entries(migrated)) {
    expect(clampPrefs({ pageZoom: was }).pageZoom).toBe(now)
    expect(pageZoomOf(now)).toBe(Number(now) / 100)
  }
  // "Following the system" keeps its own value: the row still offers it, and it
  // draws the page at the size the host and the system give it.
  expect(clampPrefs({ pageZoom: 'system' }).pageZoom).toBe('system')
  expect(pageZoomOf('system')).toBe(1)
  expect(pageZoomPercent('system')).toBe(100)
})

test('a stored value of another kind reads as the default, and an unreadable one draws nothing', () => {
  expect(clampPrefs({ pageZoom: 112 }).pageZoom).toBe('100')
  expect(clampPrefs({ pageZoom: {} }).pageZoom).toBe('100')
  for (const unreadable of ['', 'abc', '  ', 'system']) expect(pageZoomOf(unreadable)).toBe(1)
})

test('a percentage outside the row range reads as the nearer end, so the page and the box agree', () => {
  expect(pageZoomOf('35')).toBe(PAGE_ZOOM_MIN / 100)
  expect(pageZoomPercent('35')).toBe(PAGE_ZOOM_MIN)
  expect(pageZoomOf('250')).toBe(PAGE_ZOOM_MAX / 100)
  expect(pageZoomPercent('250')).toBe(PAGE_ZOOM_MAX)
})

test('every percentage the row offers reads back as itself, and its factor without a float tail', () => {
  for (let percent = PAGE_ZOOM_MIN; percent <= PAGE_ZOOM_MAX; percent += 1) {
    expect(pageZoomPercent(String(percent))).toBe(percent)
    expect(pageZoomOf(String(percent))).toBe(percent / 100)
    expect(pageZoomText(pageZoomOf(String(percent)))).toBe(String(Math.round(percent) / 100))
  }
})
