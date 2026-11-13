/**
 * The rail's two figures tables print the composer's live reading (D94).
 * @capability session-panel
 * @features session-panel
 * @risk The tables print a projection that has said nothing as zero, drop a cost
 *   the live reading has, or print the route's settled number while a fresher
 *   one stands — the standing still and the mismatch this reading removes.
 */
import { expect, test } from 'vitest'
import { panelFiguresOf } from '@dsh-claude-style/client/pure'
import { formatMoneyMicro } from '@dsh-claude-style/contracts/prices'
import type { PanelStats } from '@dsh-claude-style/contracts/session-panel'
import type { SessionFigures } from '@dsh-claude-style/client/pure'

/** The route's folded figures: one settlement behind the live reading. */
const SETTLED: PanelStats = {
  turns: 2,
  steps: 9,
  llmMs: 61000,
  toolMs: 4000,
  ttftMs: 4000,
  ttftSteps: 2,
  decodeMs: 20000,
  decodeTokens: 2000,
  uncachedInputTokens: 9000,
  cacheReadTokens: 30000,
  cacheWriteTokens: 0,
  outputTokens: 2000,
  cost: { cny: 1000000, usd: 140000 },
}

/** One live reading: the settled values with the answer now streaming added. */
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
  const figures = panelFiguresOf(live(), SETTLED)
  expect(figures.stats.steps).toBe(10)
  expect(figures.stats.decodeTokens).toBe(2400)
  expect(figures.stats.outputTokens).toBe(2400)
  expect(figures.stats.cacheReadTokens).toBe(31000)
})

test('the cost is the live figure in its own currency, not the route total', () => {
  expect(panelFiguresOf(live(), SETTLED).cost).toBe(formatMoneyMicro(1200000, 'CNY'))
  expect(panelFiguresOf(live({ cost: 1400000, currency: 'USD' }), SETTLED).cost).toBe(formatMoneyMicro(1400000, 'USD'))
})

test('no cost figure leaves no cost row, as on the line itself', () => {
  expect(panelFiguresOf(live({ cost: null, currency: null }), SETTLED).cost).toBeNull()
})

test('a projection that has not answered keeps the route figure rather than printing a zero', () => {
  const figures = panelFiguresOf(live({ stats: null }), SETTLED)
  expect(figures.stats.steps).toBe(SETTLED.steps)
  expect(figures.stats.decodeTokens).toBe(SETTLED.decodeTokens)
})

test('usage the reading has not answered keeps the route bucket rather than printing a zero', () => {
  const figures = panelFiguresOf(live({ usage: null }), SETTLED)
  expect(figures.stats.outputTokens).toBe(SETTLED.outputTokens)
  expect(figures.stats.uncachedInputTokens).toBe(SETTLED.uncachedInputTokens)
  // The half that answered still prints the reading's own number.
  expect(figures.stats.steps).toBe(10)
})

test('with no route answer either, a table prints the reading alone', () => {
  const figures = panelFiguresOf(live({ usage: null }), null)
  expect(figures.stats.outputTokens).toBe(0)
  expect(figures.stats.steps).toBe(10)
})

test('every printed figure is a whole number', () => {
  const figures = panelFiguresOf(live({
    stats: { turns: 1.4, steps: 2.6, llmMs: 1000.7, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0 },
    usage: { uncachedInputTokens: 10.2, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 3.8 },
  }), null)
  expect(figures.stats.turns).toBe(1)
  expect(figures.stats.steps).toBe(3)
  expect(figures.stats.llmMs).toBe(1001)
  expect(figures.stats.uncachedInputTokens).toBe(10)
  expect(figures.stats.outputTokens).toBe(4)
})
