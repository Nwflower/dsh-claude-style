/**
 * The margin the waiting line's overtime badge waits out: twice the session's
 * average time to first token, never under the floor, and the floor alone while
 * no step has settled a first token.
 *
 * @capability waiting-line
 * @features chat-wait
 * @risk A model whose first token is slow is called unresponsive on every turn, or the badge comes out under the floor on a fast session.
 */
import { expect, test } from 'vitest'
import { WAIT_OVERTIME_MS, overtimeMargin } from '@dsh-claude-style/client/pure'
import type { HostSessionStatsProjection } from '@dsh-claude-style/contracts/services'

function stats(ttftMs: number, ttftSteps: number): HostSessionStatsProjection {
  return { turns: 1, steps: ttftSteps, llmMs: 0, toolMs: 0, ttftMs, ttftSteps, decodeMs: 0, decodeTokens: 0 }
}

test('no statistics, or no step with a first token, leave the floor as the whole margin', () => {
  expect(overtimeMargin(null)).toBe(WAIT_OVERTIME_MS)
  expect(overtimeMargin(stats(0, 0))).toBe(WAIT_OVERTIME_MS)
})

test('a fast session keeps the floor: twice its average is under it', () => {
  expect(overtimeMargin(stats(4000, 2))).toBe(WAIT_OVERTIME_MS)
  // The average the floor meets exactly: twice five seconds is the floor itself.
  expect(overtimeMargin(stats(10000, 2))).toBe(WAIT_OVERTIME_MS)
})

test('a slow session stretches the margin to twice its average', () => {
  expect(overtimeMargin(stats(16000, 2))).toBe(16000)
  expect(overtimeMargin(stats(120000, 2))).toBe(120000)
})

test('the average is per step that reported a first token, not the sum', () => {
  expect(overtimeMargin(stats(30000, 3))).toBe(20000)
})
