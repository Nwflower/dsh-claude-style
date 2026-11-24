/**
 * Narrow frame fallbacks belong to desktop shells. A mobile adapter can place
 * the conversation in the grid's first track, which these desktop tracks must
 * leave under the adapter's control.
 *
 * @capability page-scale
 * @features shared
 * @risk A narrow touch viewport inherits the desktop drawer's zero-pixel or rail's 56-pixel first track and the conversation loses its width.
 */
import { expect, test } from 'vitest'
import { PAGE_SCALE_SHEET } from '@dsh-claude-style/client/mechanisms'

test('every narrow-frame fallback is gated to a hover-capable fine pointer', () => {
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(PAGE_SCALE_SHEET)
  const media = [...sheet.cssRules].find(rule => rule.type === CSSRule.MEDIA_RULE) as CSSMediaRule
  expect(media).toBeDefined()
  expect(media.conditionText).toBe('(hover: hover) and (pointer: fine)')
  expect(media.cssRules).toHaveLength(5)
  for (const rule of media.cssRules) {
    expect(rule.type).toBe(CSSRule.STYLE_RULE)
    expect((rule as CSSStyleRule).style.getPropertyValue('grid-template-columns')).not.toBe('')
  }
  const topStyleRules = [...sheet.cssRules].filter((rule): rule is CSSStyleRule => rule.type === CSSRule.STYLE_RULE)
  for (const rule of topStyleRules) {
    expect(rule.style.getPropertyValue('grid-template-columns')).toBe('')
    expect(rule.selectorText).not.toContain('layout-frame')
  }
})
