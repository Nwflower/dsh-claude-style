/**
 * The session panel's two figures tables print the composer's live reading of
 * the host's projections (D113).
 * @capability session-panel
 * @features session-panel
 * @risk The tables print a projection that has said nothing as zero, drop a cost
 *   the live reading has, or print a fraction where the host's counts are whole.
 */
import { expect, test } from 'vitest'
import { panelFiguresOf } from '@dsh-claude-style/client/pure'
import { formatMoneyMicro } from '@dsh-claude-style/contracts/prices'
import type { SessionFigures } from '@dsh-claude-style/client/pure'

/** One live reading: the settled projections with the answer now streaming added. */
function live(overrides: Partial<SessionFigures> = {}): SessionFigures {
  return {
    sessionId: 'session-a',
    stats: { turns: 3, steps: 10, llmMs: 64000, toolMs: 4000, ttftMs: 4000, ttftSteps: 2, decodeMs: 21000, decodeTokens: 2400 },
    usage: { uncachedInputTokens: 9000, cacheReadTokens: 31000, cacheWriteTokens: 0, outputTokens: 2400 },
    cost: 1200000,
    currency: 'CNY',
    ...overrides,
  }
}

test('the tables print the live reading, which carries the streaming answer', () => {
  const figures = panelFiguresOf(live())
  expect(figures.run?.steps).toBe(10)
  expect(figures.run?.decodeTokens).toBe(2400)
  expect(figures.usage?.outputTokens).toBe(2400)
  expect(figures.usage?.cacheReadTokens).toBe(31000)
})

test('the cost is the live figure in its own currency', () => {
  expect(panelFiguresOf(live()).cost).toBe(formatMoneyMicro(1200000, 'CNY'))
  expect(panelFiguresOf(live({ cost: 1400000, currency: 'USD' })).cost).toBe(formatMoneyMicro(1400000, 'USD'))
})

test('no cost figure, or billing off, leaves no cost row, as on the line itself', () => {
  expect(panelFiguresOf(live({ cost: null })).cost).toBeNull()
  expect(panelFiguresOf(live({ currency: null })).cost).toBeNull()
})

test('a projection that has not answered leaves its table unanswered rather than printing zeros', () => {
  const unrun = panelFiguresOf(live({ stats: null }))
  expect(unrun.run).toBeNull()
  expect(unrun.usage?.outputTokens).toBe(2400)
  const unused = panelFiguresOf(live({ usage: null }))
  expect(unused.usage).toBeNull()
  expect(unused.run?.steps).toBe(10)
})

test('every printed figure is a whole number', () => {
  const figures = panelFiguresOf(live({
    stats: { turns: 1.4, steps: 2.6, llmMs: 1000.7, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0 },
    usage: { uncachedInputTokens: 10.2, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 3.8 },
  }))
  expect(figures.run?.turns).toBe(1)
  expect(figures.run?.steps).toBe(3)
  expect(figures.run?.llmMs).toBe(1001)
  expect(figures.usage?.uncachedInputTokens).toBe(10)
  expect(figures.usage?.outputTokens).toBe(4)
})
