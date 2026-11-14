/**
 * The tokens a piece of the page's text is worth: a run is priced by its shape, and a
 * run cut in two by a text-node boundary is still one run.
 *
 * @capability context-stats
 * @features context-stats
 * @risk The written-back figure under the composer drifts away from the provider's own count while an answer streams, so the number the reader watches jumps when the step settles, or a re-read of the same text prices it twice.
 */
import { expect, test } from 'vitest'
import { textTokens } from '@dsh-claude-style/contracts/tokens'

test('a line of English prose lands near the tokenizer\'s own count for it', () => {
  // The tokenizer reads this sentence as ten tokens.
  const estimate = textTokens(['The quick brown fox jumps over the lazy dog.'])
  expect(estimate).toBeGreaterThan(8.5)
  expect(estimate).toBeLessThan(11.5)
})

test('a line of Chinese lands near the tokenizer\'s own count for it', () => {
  // The tokenizer reads this couplet as ten tokens.
  const estimate = textTokens(['春眠不觉晓，处处闻啼鸟。'])
  expect(estimate).toBeGreaterThan(8.5)
  expect(estimate).toBeLessThan(11.5)
})

test('a word split across two text nodes is priced as one word', () => {
  expect(textTokens(['hel', 'lo'])).toBeCloseTo(textTokens(['hello']), 6)
  expect(textTokens(['你好', '世界'])).toBeCloseTo(textTokens(['你好世界']), 6)
})

test('a run of spaces costs more than the single space that rides into a word', () => {
  // The tokenizer reads "a b" as two tokens and "a    b" as three.
  expect(textTokens(['a    b'])).toBeGreaterThan(textTokens(['a b']) + 0.5)
})

test('a newline costs more than the space it replaces', () => {
  expect(textTokens(['a\nb'])).toBeGreaterThan(textTokens(['a b']))
})

test('digits are priced in groups of three', () => {
  expect(textTokens(['123'])).toBeCloseTo(1, 6)
  expect(textTokens(['1234567'])).toBeCloseTo(3, 6)
})

test('a surrogate pair is one character, not two', () => {
  // The pair is one wide mark, so it costs what a single wide mark costs.
  expect(textTokens(['👍'])).toBeCloseTo(textTokens(['，']), 6)
  expect(textTokens(['👍'])).toBeGreaterThan(textTokens(['，']) - 0.01)
})
