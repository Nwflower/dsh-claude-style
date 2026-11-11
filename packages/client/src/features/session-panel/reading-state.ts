/**
 * The reading the details rail shows, scoped to the session it belongs to (D94).
 *
 * A session switch replaces the rail's body and restarts its polling; the
 * reading is kept with the session id that answered it, so a frame between the
 * two never draws the previous session's directory, outputs or tasks under the
 * new session's title, and a failed first ask shows its failure instead of the
 * old answer.
 */
import type { SessionPanelValue } from '@dsh-claude-style/contracts/session-panel'

/** What one open rail knows: the host's last folded answer, and whether the last ask failed. */
export interface PanelReading {
  value: SessionPanelValue | null
  failed: boolean
}

/** The reading before the first answer. */
export const EMPTY_READING: PanelReading = { value: null, failed: false }

/** The reading kept with the session that produced it. */
export interface PanelReadingState {
  session: string
  reading: PanelReading
}

/**
 * The reading for one session: the kept one when it belongs to that session,
 * the empty one otherwise.
 * @param sessionId - the session the rail shows now.
 * @param state - the last kept reading and its session.
 */
export function readingFor(sessionId: string, state: PanelReadingState): PanelReading {
  return state.session === sessionId ? state.reading : EMPTY_READING
}

/** The reading after an answer for the session that asked. */
export function answeredReading(sessionId: string, value: SessionPanelValue): PanelReadingState {
  return { session: sessionId, reading: { value, failed: false } }
}

/** The reading after a failed ask: the same session keeps what it showed, with the failure flag. */
export function failedReading(state: PanelReadingState): PanelReadingState {
  return { session: state.session, reading: { value: state.reading.value, failed: true } }
}
