/**
 * What the session panel sections show after a session switch: a reading
 * belongs to the session that answered it, so a switch never draws the old
 * session's rows and a failed first ask for the new session shows the failure
 * instead of the old answer.
 *
 * @capability session-panel
 * @features session-panel
 * @risk The sections keep the previous session's context and outputs under a
 *   new session, or a failed first ask leaves the old answer on screen
 *   without a failure mark.
 */
import { expect, test } from 'vitest'
import { EMPTY_READING, answeredReading, failedReading, readingFor } from '@dsh-claude-style/client/pure'
import type { SessionPanelValue } from '@dsh-claude-style/contracts/session-panel'

const VALUE: SessionPanelValue = { directory: null, context: null, outputs: [] }

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
