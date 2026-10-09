import { expect, test } from 'vitest'
import { collapseRows, containsNewUser, FOLD_TIMING, flowRows, retiringKeys } from './fold-choreography'
import { presentLiveTurn } from './live-turn'
import type { LiveStep } from './live-turn'
import type { TurnBoundary } from './projection'

const open: TurnBoundary = { status: 'open', reason: null, latestStep: 3, closingStep: null }
const reasoning = (n: number): LiveStep => ({ kind: 'reasoning', key: `r${n}`, nodeKey: `n${n}`, start: 0, blocks: [], step: n })
const body: LiveStep = { kind: 'body', key: 'b1', nodeKey: 'n1', start: 1, blocks: [], step: 1 }

test('the first fold keeps every visible step and admits no incoming thought while it shrinks', () => {
  const before = presentLiveTurn([reasoning(1), body], open, false, 'standard')
  const after = presentLiveTurn([reasoning(1), body, reasoning(2)], open, false, 'standard')
  expect(retiringKeys(before, after, {})).toEqual(['r1', 'b1'])
  const rows = collapseRows(before, after)
  expect(rows.filter(row => row.kind === 'step').map(row => row.key)).toEqual(['r1', 'b1'])
  expect(rows[0]!.kind === 'summary' && rows[0]!.item.summary).toBe('Thinking×0 · Output×0')
  expect(new Set(flowRows(after).map(row => row.key)).size).toBe(flowRows(after).length)
})

test('a growing fold retires only its newly folded open rows and keeps the same summary', () => {
  const before = presentLiveTurn([reasoning(1), body, reasoning(2)], open, false, 'standard')
  const after = presentLiveTurn([reasoning(1), body, reasoning(2), reasoning(3)], open, false, 'standard')
  expect(retiringKeys(before, after, {})).toEqual(['r2'])
  expect(collapseRows(before, after)[0]!.key).toBe(flowRows(before)[0]!.key)
  expect(retiringKeys(before, after, { 'live-fold:r1': true })).toEqual([])
})

test('a reader message bypasses the fold and keeps source order', () => {
  const before = presentLiveTurn([reasoning(1)], open, false, 'standard')
  const user: LiveStep = { kind: 'user', key: 'u2', nodeKey: 'u2' }
  const after = presentLiveTurn([reasoning(1), user, reasoning(2)], open, false, 'standard')
  expect(containsNewUser(before, after)).toBe(true)
  expect(retiringKeys(before, after, {})).toEqual([])
  expect(flowRows(after).map(row => row.key)).toEqual(['r1', 'u2', 'r2'])
})

test('every phase has a budget and a watchdog past it, all under a second', () => {
  for (const phase of ['collapse', 'count', 'settle', 'reveal'] as const) {
    expect(FOLD_TIMING[phase]).toBeGreaterThan(0)
    expect(FOLD_TIMING[phase] + FOLD_TIMING.watchdogSlack).toBeLessThan(1000)
  }
})
