/**
 * The home dashboard keeps an unfiltered summary out of scoped reports.
 * @capability home-layout
 * @features home
 * @risk Switching from all records to a workspace leaves another workspace's models in the ranking or favorite tile.
 */
import { expect, test } from 'vitest'
import { homePanelData } from '@dsh-claude-style/client/pure'
import type { HomeUsageState, ListSummary } from '@dsh-claude-style/client/pure'

const allSessions: ListSummary = {
  models: [{ id: 'global-model', tokens: 3200, sessions: 2, lastAt: 0 }],
  model: 'global-model', tokens: 3200, sessions: 2, activeDays: 1,
  days: [{ date: '2026-11-18', total: 3200 }],
  entries: [{ at: 0, tokens: 3200, model: 'global-model' }],
}
const emptyReport = {
  source: 'local', computedAt: 0, days: [], models: [],
  firstDay: null, lastDay: null, totals: { total: 0, sessions: 1 },
}
const pending: HomeUsageState = {
  scope: 'all', value: null, computing: true, error: null, loading: false, answeredAt: null,
}

for (const scope of ['workspace', 'active'] as const) {
  test(`the ${scope} scope never draws the cached all-records summary`, () => {
    const unloaded = homePanelData({ ...pending, scope }, allSessions, 'all', 0)
    expect(unloaded).toMatchObject({ known: false, model: null, models: null })
    const empty = homePanelData({ ...pending, scope, value: emptyReport }, allSessions, 'all', 0)
    expect(empty).toMatchObject({ known: true, tokens: 0, sessions: 1, model: null, models: [] })
    const report = { ...emptyReport, models: [{ id: 'scoped-model', tokens: 25 }] }
    const scoped = homePanelData({ ...pending, scope, value: report }, allSessions, 'all', 0)
    expect(scoped.model).toBe('scoped-model')
    expect(scoped.models?.map(model => model.id)).toEqual(['scoped-model'])
  })
}

test('all records can still use the session summary when the fold has no attributed models', () => {
  const data = homePanelData({ ...pending, value: emptyReport }, allSessions, 'all', 0)
  expect(data.model).toBe('global-model')
  expect(data.models?.map(model => model.id)).toEqual(['global-model'])
})
