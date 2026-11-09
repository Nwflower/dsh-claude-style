/**
 * Prefer `observeSession`: `readSession` lists the whole corpus per lookup, while observation leases avoid that.
 * `readTitleSnapshots` discards events and cannot substitute. Keep `readSession` only for older hosts.
 * Corrupt/vanished logs are omitted with a warning; all other failures propagate (D12).
 */
import type { DshContext, DshSessionObservation } from './dsh'

/** The `sessionQuery` service, in the members this module reads. */
interface QueryReader {
  observeSession?(sessionId: string, options?: { projectionMode?: 'all' | 'none' }): Promise<DshSessionObservation>
  readSession?(sessionId: string): Promise<{ events?: unknown } | null | undefined>
}

/** The caller's events out of whatever the host hands back, or null when it is not a log. */
function eventsOf<T>(events: unknown): T[] | null {
  return Array.isArray(events) ? events as T[] : null
}

/** Return only corrupt/vanished-session failures that may be omitted; other errors belong to the caller. */
function unreadableLog(error: unknown): { message?: string } | null {
  const failure = error as { code?: string, message?: string } | null
  return failure?.code === 'SESSION_QUERY_CORRUPT_SESSION' || failure?.code === 'SESSION_QUERY_SESSION_NOT_FOUND'
    ? failure
    : null
}

/** Report one session the reader refused, naming the pass it was left out of. */
function reportUnreadable(ctx: DshContext, packageName: string, error: unknown, sessionId: string, label: string) {
  ctx.logger?.warn?.(`${packageName}: session ${sessionId} left out of ${label}: ${unreadableLog(error)?.message}`)
}

/** Support host leases exposing either named `dispose` or `Symbol.dispose`. */
function releaseObservation(observation: DshSessionObservation) {
  const named = (observation as { dispose?: () => void }).dispose
  if (typeof named === 'function') named.call(observation)
  else if (Symbol.dispose in observation) (observation as unknown as { [Symbol.dispose](): void })[Symbol.dispose]()
}

export async function readEvents<T>(ctx: DshContext, packageName: string, sessionId: string, label: string): Promise<T[] | null> {
  const query = ctx.get('sessionQuery') as QueryReader | null | undefined
  if (query === null || query === undefined) return null
  try {
    if (typeof query.observeSession === 'function') {
      // `projectionMode: 'none'` keeps the host's own projection computation off
      // a read that only wants the events; the lease is released as soon as they
      // are in hand.
      const observation = await query.observeSession(sessionId, { projectionMode: 'none' })
      try {
        return eventsOf<T>(observation.events)
      } finally {
        releaseObservation(observation)
      }
    }
    if (typeof query.readSession !== 'function') return null
    const snapshot = await query.readSession(sessionId)
    return eventsOf<T>(snapshot?.events)
  } catch (error) {
    if (unreadableLog(error) === null) throw error
    reportUnreadable(ctx, packageName, error, sessionId, label)
    return null
  }
}
