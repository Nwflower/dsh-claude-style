/**
 * The brand set controls' surface contract (D92).
 *
 * @capability custom-brand
 * @features settings
 * @risk The brand cards or the brand editor lose their registered selectors, or the renderer stops writing the colour-scheme and logo properties the page and scenarios read.
 */
import { expect, test } from 'vitest'
import { surfaceProperty, surfaceSelector } from '../../fixtures/surface'
import { BRAND_PROPERTIES } from '@dsh-claude-style/client/pure'
import { BRAND_CARDS_SHEET, SETTINGS_BRAND_LOCKUP_SHEET } from '@dsh-claude-style/client/mechanisms'

test('every brand-control selector has a rule in the shipped stylesheets', () => {
  const sheets = [SETTINGS_BRAND_LOCKUP_SHEET, BRAND_CARDS_SHEET].map((text) => {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(text)
    return sheet
  })
  for (const id of ['settings.brand-card', 'settings.brand-editor', 'settings.brand-error']) {
    const selector = surfaceSelector(id)
    expect(sheets.some(sheet => [...sheet.cssRules].some(rule => rule.type === CSSRule.STYLE_RULE && (rule as CSSStyleRule).selectorText.includes(selector))), selector).toBe(true)
  }
})

test('the renderer keeps the registered colour and logo properties', () => {
  for (const id of ['brand.custom-accent', 'brand.custom-canvas-light', 'brand.custom-mark']) {
    expect(BRAND_PROPERTIES).toContain(surfaceProperty(id))
  }
})
