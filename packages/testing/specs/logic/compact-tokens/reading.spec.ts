/**
 * The token counts the session panel, the usage panel and the turn status line
 * print: the unit follows the count's own magnitude, one decimal at most, and
 * a k reading never grows into a thousand k — the window's own figures stay
 * apart from the room left under it. The compact footer's figures instead keep
 * one decimal place in K/M/B/T at every step, so a reading keeps its width while
 * it crosses a unit.
 *
 * @capability compact-tokens
 * @features session-panel, context-stats, shared
 * @risk A count just under a million rounds up into the unit above it, so the
 *   room left in the context window reads the same as the window itself; or a
 *   count of a thousand reads as a bare number without its unit; or the footer's
 *   unit reading drops its decimal and the figures jitter as they cross a step.
 */
import { expect, test } from 'vitest'
import { formatCompactTokens, formatUnitTokens } from '@dsh-claude-style/client/pure'

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

test('the footer unit reading keeps one decimal place from the first thousand on', () => {
  expect(formatUnitTokens(0)).toBe('0')
  expect(formatUnitTokens(999)).toBe('999')
  expect(formatUnitTokens(1000)).toBe('1.0K')
  expect(formatUnitTokens(1049)).toBe('1.0K')
  expect(formatUnitTokens(1050)).toBe('1.1K')
  expect(formatUnitTokens(66800)).toBe('66.8K')
  expect(formatUnitTokens(999949)).toBe('999.9K')
})

test('the footer unit reading takes the next step when rounding would carry it over', () => {
  expect(formatUnitTokens(999950)).toBe('1.0M')
  expect(formatUnitTokens(999999)).toBe('1.0M')
  expect(formatUnitTokens(1000000)).toBe('1.0M')
  expect(formatUnitTokens(1200000000)).toBe('1.2B')
  expect(formatUnitTokens(1200000000000)).toBe('1.2T')
})

test('an unreadable count reads as nothing in the footer unit reading too', () => {
  expect(formatUnitTokens(undefined)).toBe('0')
  expect(formatUnitTokens(null)).toBe('0')
  expect(formatUnitTokens('')).toBe('0')
})
