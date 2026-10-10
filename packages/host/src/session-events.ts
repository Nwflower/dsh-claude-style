/**
 * Reading one session's raw log through the host's own reader.
 *
 * Both host-half readers (the usage roll-up and the search corpus) go through
 * this one call: `sessionQuery` is the only path to a log that may be live,
 * stored, or both, and the two codes it throws for an unreadable or vanished
 * log mean "this session has nothing to give right now" (docs/decisions D12).
 * Every other failure propagates.
 *
 * The host ships no type for the events, so the caller names the shape it reads.
 *
 * @param ctx - host plugin context, for the `sessionQuery` service.
 * @param sessionId - the session whose log is read.
 * @param label - what the caller is doing, for the warning a tolerated failure leaves.
 * @returns the events, or null when there is no reader or the log cannot be read.
 */
import type { DshContext } from './dsh.js'

export async function readEvents<T>(ctx: DshContext, sessionId: string, label: string): Promise<T[] | null> {
  const query = ctx.get('sessionQuery')
  if (query === null || query === undefined || typeof query.readSession !== 'function') return null
  let snapshot
  try {
    snapshot = await query.readSession(sessionId)
  } catch (error) {
    const failure = error as { code?: string, message?: string }
    if (failure?.code !== 'SESSION_QUERY_CORRUPT_SESSION' && failure?.code !== 'SESSION_QUERY_SESSION_NOT_FOUND') throw error
    ctx.logger?.warn?.(`dsh-claude-style: session ${sessionId} left out of ${label}: ${failure.message}`)
    return null
  }
  const events = snapshot?.events
  return Array.isArray(events) ? events as T[] : null
}
