/**
 * @capability interface-font-size
 * @features settings, core
 * @risk Ordinary interface text ignores the reader's chosen size, or a hand-edited setting draws it outside the usable range.
 */
import { expect, test } from 'vitest'
import { interfaceFontSizeOf, interfaceFontSizePercent } from '@dsh-claude-style/client/pure'

test('the interface font scale reads percentages independently of page zoom', () => {
  expect(interfaceFontSizeOf('100')).toBe(1)
  expect(interfaceFontSizeOf('125')).toBe(1.25)
  expect(interfaceFontSizePercent('125')).toBe(125)
})

test('invalid and out-of-range interface font values land on a usable bound', () => {
  expect(interfaceFontSizeOf('')).toBe(1)
  expect(interfaceFontSizeOf('abc')).toBe(1)
  expect(interfaceFontSizeOf('0')).toBe(1)
  expect(interfaceFontSizeOf('20')).toBe(0.8)
  expect(interfaceFontSizeOf('200')).toBe(1.6)
})
