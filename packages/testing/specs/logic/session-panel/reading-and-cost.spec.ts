/**
 * What the details rail shows after a session switch, and how it writes the
 * session's settled cost: a reading belongs to the session that answered it, so
 * a switch never draws the old session's rows and a failed first ask for the new
 * session shows the failure instead of the old answer; the cost follows the
 * reader's billing currency, with billing off leaving no cost row.
 *
 * @capability session-panel
 * @features session-panel
 * @risk The rail keeps the previous session's environment, outputs and tasks
 *   under a new session, a failed first ask leaves the old answer on screen
 *   without a failure mark, the cost prints in yuan while the reader prices in
 *   dollars, or a settled USD cost reads the yuan total.
 */
import { expect, test } from 'vitest'
import { EMPTY_READING, answeredReading, failedReading, readingFor, statsCostText, billingCurrency } from '@dsh-claude-style/client/pure'
import type { SessionPanelValue } from '@dsh-claude-style/contracts/session-panel'

const VALUE: SessionPanelValue = { environment: null, context: null, outputs: [], changes: [], background: { jobs: [], subagents: [], team: null } }

test('a reading belongs to the session that answered it', () => {
  const state = answeredReading('session-a', VALUE)
  expect(readingFor('session-a', state).value).toEqual(VALUE)
  expect(readingFor('session-b', state)).toEqual(EMPTY_READING)
})

test('a failed ask keeps the same session\'s rows and marks the failure', () => {
  const failed = failedReading(answeredReading('session-a', VALUE))
  expect(readingFor('session-a', failed)).toEqual({ value: VALUE, failed: true })
  expect(readingFor('session-b', failed)).toEqual(EMPTY_READING)
})

test('a failed first ask for a session shows no value', () => {
  const failed = failedReading({ session: 'session-b', reading: EMPTY_READING })
  expect(readingFor('session-b', failed)).toEqual({ value: null, failed: true })
})

test('billing off takes the cost row away', () => {
  expect(billingCurrency('off')).toBeNull()
  expect(statsCostText({ cny: 1_230_000, usd: 456_000 }, null)).toBeNull()
})

test('each currency prints its own total', () => {
  expect(statsCostText({ cny: 1_230_000, usd: 456_000 }, 'CNY')).toMatch(/^¥1\.23/)
  expect(statsCostText({ cny: 1_230_000, usd: 456_000 }, 'USD')).toMatch(/^\$0\.45/)
})

test('an unsettled cost prints nothing', () => {
  expect(statsCostText(null, 'USD')).toBeNull()
})
