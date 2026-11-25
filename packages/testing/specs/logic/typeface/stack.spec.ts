/**
 * Custom font-family stacks for prose, interface and code roles: normalization
 * strips quotes and rejects injection characters, stacks deduplicate and cap,
 * reordering and toggling stay pure, and composed CSS stacks match tokens.json.
 *
 * @capability typeface
 * @features contracts, settings
 * @risk Hand-edited font names inject CSS syntax, reordering drops entries, or custom stacks drift from tokens.json fallbacks.
 */
import { expect, test } from 'vitest'
import { FONT_PRESET_BASE, FONT_STACK_MAX } from '@dsh-claude-style/contracts/typeface'
import {
  clampFontStack,
  collectSystemFamilies,
  composeCustomFontValue,
  formatFontFamily,
  formatFontFamilyList,
  normalizeFontFamily,
  reorderFontStack,
  toggleFontInStack,
} from '@dsh-claude-style/client/pure'
import { surfaceProperty } from '../../fixtures/surface'
import { typefaceTokens } from '../../fixtures/theme-tokens'

test('font family normalization trims whitespace, strips quotes, preserves Unicode and rejects CSS injection', () => {
  expect(normalizeFontFamily('  "LXGW   WenKai"  ')).toBe('LXGW WenKai')
  expect(normalizeFontFamily('苹方-简')).toBe('苹方-简')
  expect(normalizeFontFamily('Sans-Serif')).toBe('sans-serif')
  expect(normalizeFontFamily('Inter, Arial')).toBe('')
  expect(normalizeFontFamily('Inter; color: red')).toBe('')
  expect(normalizeFontFamily('url(evil)')).toBe('')
  expect(normalizeFontFamily('   ')).toBe('')
  expect(normalizeFontFamily('a'.repeat(65))).toBe('')
})

test('stack clamping deduplicates case-insensitively and enforces the stack cap', () => {
  expect(clampFontStack(['Inter', 'inter', 'Georgia', 'bad;font', ''])).toEqual(['Inter', 'Georgia'])
  const many = Array.from({ length: FONT_STACK_MAX + 4 }, (_, index) => `Font ${index}`)
  expect(clampFontStack(many)).toHaveLength(FONT_STACK_MAX)
})

test('CSS serialization leaves generic families unquoted and quotes named families', () => {
  expect(formatFontFamily('sans-serif')).toBe('sans-serif')
  expect(formatFontFamily('system-ui')).toBe('system-ui')
  expect(formatFontFamily('LXGW WenKai')).toBe("'LXGW WenKai'")
  expect(formatFontFamilyList(['LXGW WenKai', 'Georgia', 'serif'])).toBe("'LXGW WenKai', 'Georgia', serif")
})

test('toggling and reordering keep the ordered stack consistent', () => {
  expect(toggleFontInStack([], 'Inter')).toEqual(['Inter'])
  expect(toggleFontInStack(['Inter', 'Georgia'], 'inter')).toEqual(['Georgia'])
  expect(reorderFontStack(['A', 'B', 'C'], 2, 0)).toEqual(['C', 'A', 'B'])
  expect(reorderFontStack(['A', 'B', 'C'], 0, 2)).toEqual(['B', 'C', 'A'])
  expect(reorderFontStack(['A', 'B'], 0, 5)).toEqual(['A', 'B'])
})

test('composed custom font stacks prepend user order before preset fallbacks and return null when empty', () => {
  expect(composeCustomFontValue('prose', [], 'claude')).toBeNull()
  expect(composeCustomFontValue('prose', ['LXGW WenKai'], 'claude')).toBe(`'LXGW WenKai', ${FONT_PRESET_BASE.claude.prose}`)
  expect(composeCustomFontValue('code', ['Maple Mono'], 'system')).toBe(`'Maple Mono', ${FONT_PRESET_BASE.system.code}`)
  expect(composeCustomFontValue('ui', ['Inter'], 'host', "'Host Sans', sans-serif")).toBe("'Inter', 'Host Sans', sans-serif")
  expect(composeCustomFontValue('code', ['Fira Code'], 'host', '')).toBe("'Fira Code', ui-monospace, monospace")
})

test('preset base stacks stay identical to tokens.json declarations', () => {
  const byToken = new Map(typefaceTokens().map(item => [item.token, item]))
  const proseToken = surfaceProperty('skin.font-prose')
  const codeToken = surfaceProperty('skin.font-code')
  expect(FONT_PRESET_BASE.claude.prose).toBe(byToken.get(proseToken)?.claude)
  expect(FONT_PRESET_BASE.claude.ui).toBe(byToken.get('--dsw-font-family')?.claude)
  expect(FONT_PRESET_BASE.claude.code).toBe(byToken.get(codeToken)?.claude)
  expect(FONT_PRESET_BASE.system.prose).toBe(byToken.get(proseToken)?.system)
  expect(FONT_PRESET_BASE.system.ui).toBe(byToken.get('--dsw-font-family')?.system)
  expect(FONT_PRESET_BASE.system.code).toBe(byToken.get(codeToken)?.system)
})

test('local font collection deduplicates faces, drops invalid names and sorts consistently', () => {
  const families = collectSystemFamilies([
    { family: 'JetBrains Mono' },
    { family: 'jetbrains mono' },
    { family: 'Arial' },
    { family: 'bad;name' },
    { family: 42 },
  ])
  expect(families).toEqual(['Arial', 'JetBrains Mono'])
})
