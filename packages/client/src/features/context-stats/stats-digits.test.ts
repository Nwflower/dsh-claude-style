import { expect, test } from 'vitest'
import { buildDigitGroup, writeDigits } from './stats-digits'

/**
 * A figure that can re-enter (D27): every character is a span of its own, the
 * last two carry the stagger the stylesheet delays them by, and a figure that
 * did not move is left exactly as it is — the pass runs on every projection
 * frame while an answer streams, so an unchanged figure must not be rewritten.
 */

test('a figure is written one character per span, the last two staggered', () => {
  const group = buildDigitGroup('374')
  const digits = [...group.children] as HTMLElement[]
  expect(digits.map((digit) => digit.textContent)).toEqual(['3', '7', '4'])
  expect(digits.map((digit) => digit.getAttribute('data-stagger'))).toEqual([null, '1', '2'])
  expect(digits.every((digit) => digit.classList.contains('dsh-claude-digit'))).toBe(true)
})

test('a figure that did not move keeps the spans it has', () => {
  const group = buildDigitGroup('374')
  const before = [...group.children]
  expect(writeDigits(group, '374')).toBe(false)
  expect([...group.children]).toEqual(before)
})

test('a figure that moved is written again', () => {
  const group = buildDigitGroup('374')
  const before = [...group.children]
  expect(writeDigits(group, '375')).toBe(true)
  const digits = [...group.children] as HTMLElement[]
  expect(digits.map((digit) => digit.textContent)).toEqual(['3', '7', '5'])
  expect(digits[0]).not.toBe(before[0])
  // A grouped figure keeps its separators as characters of their own.
  expect(writeDigits(group, '1,024')).toBe(true)
  expect([...group.children].map((digit) => digit.textContent)).toEqual(['1', ',', '0', '2', '4'])
})
