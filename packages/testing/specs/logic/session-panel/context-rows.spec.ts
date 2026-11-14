/**
 * The context legend and colour bar allocate the provider reading once (D94, D99).
 * @capability session-panel
 * @features session-panel
 * @risk Source prices double-count injected instructions, disagree with the
 *   occupancy, reorder categories, or turn a missing composition into messages.
 */
import { expect, test } from 'vitest'
import { contextOverview, contextRows } from '@dsh-claude-style/client/pure'
import type { PanelContext } from '@dsh-claude-style/contracts/session-panel'

test('source parts share one occupancy and one window denominator', () => {
  const context: PanelContext = {
    used: 301, window: 1000,
    parts: [
      { kind: 'skills', tokens: 10 }, { kind: 'system', tokens: 20 },
      { kind: 'mcp', tokens: 30 }, { kind: 'user', tokens: 80 },
      { kind: 'memory', tokens: 30 }, { kind: 'tools', tokens: 30 },
    ],
  }
  const rows = contextRows(context)
  expect(rows.map(row => row.kind)).toEqual(['user', 'tools', 'mcp', 'memory', 'system', 'skills'])
  expect(rows.reduce((sum, row) => sum + row.tokens, 0)).toBe(context.used)
  expect(rows.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(30.1)
  for (const row of rows) expect(row.share).toBeCloseTo(row.tokens / context.window * 100)
})

test('the rows run largest first, and equal parts keep the reading order', () => {
  const rows = contextRows({
    used: 500, window: 1000,
    parts: [
      { kind: 'system', tokens: 50 }, { kind: 'tools', tokens: 300 },
      { kind: 'user', tokens: 50 }, { kind: 'memory', tokens: 100 },
    ],
  })
  expect(rows.map(row => [row.kind, row.tokens])).toEqual([
    ['tools', 300], ['memory', 100], ['system', 50], ['user', 50],
  ])
  for (let index = 1; index < rows.length; index++) expect(rows[index - 1].tokens).toBeGreaterThanOrEqual(rows[index].tokens)
})

test('the conversation is read apart: user, assistant and tool result keep their own rows', () => {
  const context: PanelContext = {
    used: 1000, window: 2000,
    parts: [
      { kind: 'tool-result', tokens: 400 }, { kind: 'assistant', tokens: 300 },
      { kind: 'user', tokens: 200 }, { kind: 'system', tokens: 100 },
    ],
  }
  expect(contextRows(context).map(row => [row.kind, row.tokens, row.label]))
    .toEqual([
      ['tool-result', 400, 'toolResultTokens'], ['assistant', 300, 'assistantTokens'],
      ['user', 200, 'userTokens'], ['system', 100, 'systemTokens'],
    ])
})

test('unattributed occupancy keeps its own category and zero stays zero', () => {
  const context: PanelContext = { used: 100, window: 1000, parts: [] }
  expect(contextRows(context).map(row => [row.kind, row.tokens])).toEqual([['other', 100]])
  expect(contextRows({ ...context, used: 0 }).reduce((sum, row) => sum + row.tokens, 0)).toBe(0)
})

test('the live occupancy states the overview before the route has any context', () => {
  expect(contextOverview({ used: 248900, window: 450000 }, null)).toEqual({ used: 248900, window: 450000 })
})

test('the live occupancy decides while it answers, over the route figure', () => {
  const context: PanelContext = { used: 100, window: 1000, parts: [{ kind: 'user', tokens: 100 }] }
  expect(contextOverview({ used: 120, window: 1000 }, context)).toEqual({ used: 120, window: 1000 })
})

test('the route answers when nothing is live, and no window answers nothing', () => {
  const context: PanelContext = { used: 100, window: 1000, parts: [{ kind: 'user', tokens: 100 }] }
  expect(contextOverview(null, context)).toEqual({ used: 100, window: 1000 })
  expect(contextOverview(null, null)).toBeNull()
  expect(contextOverview({ used: 10, window: 0 }, null)).toBeNull()
})

test('an occupancy past either end of the window is clamped into it', () => {
  expect(contextOverview({ used: 1200, window: 1000 }, null)).toEqual({ used: 1000, window: 1000 })
  expect(contextOverview({ used: -5, window: 1000 }, null)).toEqual({ used: 0, window: 1000 })
})
