/**
 * The token counts the details rail, the usage panel and the turn status line
 * print: the unit follows the count's own magnitude, one decimal at most, and
 * a k reading never grows into a thousand k — the window's own figures stay
 * apart from the room left under it.
 *
 * @capability compact-tokens
 * @features session-panel, context-stats, shared
 * @risk A count just under a million rounds up into the unit above it, so the
 *   room left in the context window reads the same as the window itself; or a
 *   count of a thousand reads as a bare number without its unit.
 */
import { expect, test } from 'vitest'
import { formatCompactTokens } from '@dsh-claude-style/client/pure'

test('a count under a thousand keeps its own value', () => {
  expect(formatCompactTokens(0)).toBe('0')
  expect(formatCompactTokens(7)).toBe('7')
  expect(formatCompactTokens(255)).toBe('255')
  expect(formatCompactTokens(999)).toBe('999')
})

test('a count from a thousand uses k with one decimal at most', () => {
  expect(formatCompactTokens(1000)).toBe('1k')
  expect(formatCompactTokens(6680)).toBe('6.7k')
  expect(formatCompactTokens(66800)).toBe('66.8k')
  expect(formatCompactTokens(999949)).toBe('999.9k')
})

test('the room left under a million-token window keeps its k reading', () => {
  const window = 1048576
  expect(formatCompactTokens(window)).toBe('1M')
  expect(formatCompactTokens(window - 95300)).toBe('953.3k')
  expect(formatCompactTokens(window - 66800)).toBe('981.8k')
})

test('a k reading that would reach a thousand k takes M', () => {
  expect(formatCompactTokens(999950)).toBe('1M')
  expect(formatCompactTokens(999999)).toBe('1M')
  expect(formatCompactTokens(1000000)).toBe('1M')
})

test('M and B follow the same ladder with one decimal, a whole count without its ".0"', () => {
  expect(formatCompactTokens(1048576)).toBe('1M')
  expect(formatCompactTokens(4400000)).toBe('4.4M')
  expect(formatCompactTokens(109000000)).toBe('109M')
  expect(formatCompactTokens(1200000000)).toBe('1.2B')
  expect(formatCompactTokens(2000000000)).toBe('2B')
})

test('an unreadable count reads as nothing rather than as a unit', () => {
  expect(formatCompactTokens(undefined)).toBe('0')
  expect(formatCompactTokens(null)).toBe('0')
  expect(formatCompactTokens('')).toBe('0')
})
