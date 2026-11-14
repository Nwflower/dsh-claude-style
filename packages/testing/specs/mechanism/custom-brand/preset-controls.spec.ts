/**
 * The appearance preset controls' surface contract (D92).
 *
 * @capability custom-brand
 * @features settings
 * @risk The preset toolbar loses its registered selectors, or the renderer stops writing the colour-scheme and logo properties the page and scenarios read.
 */
import { expect, test } from 'vitest'
import { surfaceProperty, surfaceSelector } from '../../fixtures/surface'
import { BRAND_PROPERTIES, SETTINGS_BRAND_LOCKUP_SHEET } from '@dsh-claude-style/client/pure'

test('every preset-control selector has a rule in the shipped stylesheet', () => {
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(SETTINGS_BRAND_LOCKUP_SHEET)
  for (const id of ['settings.brand-preset-select', 'settings.brand-preset-rename', 'settings.brand-error']) {
    const selector = surfaceSelector(id)
    expect([...sheet.cssRules].some(rule => rule.type === CSSRule.STYLE_RULE && (rule as CSSStyleRule).selectorText.includes(selector)), selector).toBe(true)
  }
})

test('the renderer keeps the registered colour and logo properties', () => {
  for (const id of ['brand.custom-accent', 'brand.custom-canvas-light', 'brand.custom-mark']) {
    expect(BRAND_PROPERTIES).toContain(surfaceProperty(id))
  }
})
