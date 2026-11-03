/**
 * The background fill's opacity as the settings row and the stylesheet read
 * it: a stored percentage becomes the factor the canvas fills mix with, 100
 * keeps the canvas opaque, anything unreadable or past an end reads as the
 * nearer answer the row itself shows — a hand-edited value never draws a page
 * the field cannot name.
 *
 * @capability background-opacity
 * @features settings, contracts
 * @risk A stored opacity of 0 blacks the page out, a value past 100 reads as
 *   more opaque than the opaque canvas the slider cannot show, an empty or
 *   mistyped value turns the page translucent, or the field names a
 *   percentage the fills never applied.
 */
import { expect, test } from 'vitest'
import { BACKGROUND_OPACITY_MAX, BACKGROUND_OPACITY_MIN, clampPrefs } from '@dsh-claude-style/contracts/prefs'
import { backgroundOpacityOf, backgroundOpacityPercent } from '@dsh-claude-style/client/pure'

test('a stored percentage becomes the factor the canvas fills mix with', () => {
  expect(backgroundOpacityOf('100')).toBe(1)
  expect(backgroundOpacityOf('50')).toBe(0.5)
  expect(backgroundOpacityOf('0')).toBe(0)
})

test('an empty or unreadable value keeps the canvas opaque', () => {
  expect(backgroundOpacityOf('')).toBe(1)
  expect(backgroundOpacityOf('big')).toBe(1)
  expect(backgroundOpacityOf('half')).toBe(1)
})

test('a percentage past either end reads as the nearer end, which is the number the field shows', () => {
  expect(backgroundOpacityOf('400')).toBe(1)
  expect(backgroundOpacityPercent('400')).toBe(BACKGROUND_OPACITY_MAX)
  expect(backgroundOpacityOf('-40')).toBe(0)
  expect(backgroundOpacityPercent('-40')).toBe(BACKGROUND_OPACITY_MIN)
})

test('the number field stays inside the row it stands beside', () => {
  expect(backgroundOpacityPercent('100')).toBe(100)
  expect(backgroundOpacityPercent('')).toBe(100)
  expect(backgroundOpacityPercent('250')).toBe(100)
  expect(backgroundOpacityPercent('40')).toBe(40)
  expect(backgroundOpacityPercent('7')).toBe(7)
})

test('every percentage the slider offers reads back as itself', () => {
  for (let percent = BACKGROUND_OPACITY_MIN; percent <= BACKGROUND_OPACITY_MAX; percent += 1) {
    expect(backgroundOpacityPercent(String(percent))).toBe(percent)
    expect(backgroundOpacityOf(String(percent))).toBe(percent / 100)
  }
})

test('a value the clamps let through reaches the row the factor reads', () => {
  expect(clampPrefs({ backgroundOpacity: '55' }).backgroundOpacity).toBe('55')
  expect(backgroundOpacityPercent(clampPrefs({ backgroundOpacity: '55' }).backgroundOpacity)).toBe(55)
  expect(clampPrefs({ backgroundOpacity: 50 }).backgroundOpacity).toBe('100')
  expect(clampPrefs({ backgroundOpacity: '1000' }).backgroundOpacity).toBe('100')
})
