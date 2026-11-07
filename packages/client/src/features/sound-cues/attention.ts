import type { HostSessionListSnapshot, HostSessionStatusSnapshot } from '@dsh-claude-style/contracts/services'

/** The two readings a session's state has for the cues. */
export interface AttentionReading {
  /** The session waits on the reader right now. */
  pending: boolean
  /** The session runs, as the live status or the list's summary says. */
  running: boolean
  /** The session is a top-level conversation, not a subagent. */
  topLevel: boolean
}

/** What a reading changed: a prompt the reader has not answered, or a finished run. */
export type AttentionEvent = 'permission' | 'finished'

/**
 * One reading of every session the cues watch: the list's top-level rows first,
 * with the live status laid over them, then any session the status carries that
 * the list has not reached (a subagent, or a list still loading). A session the
 * list does not prove top-level counts as a child, so only its prompt can cue.
 */
export function attentionReading(status: HostSessionStatusSnapshot | null, list: HostSessionListSnapshot | null): Map<string, AttentionReading> {
  const readings = new Map<string, AttentionReading>()
  if (list !== null) {
    for (let i = 0; i < list.ids.length; i++) {
      const id = list.ids[i]
      const row = list.byId[id]
      const live = status?.get(id)
      readings.set(id, {
        pending: live?.pendingInteraction !== undefined,
        running: live?.running ?? row?.running === true,
        topLevel: row?.origin !== 'subagent',
      })
    }
  }
  if (status !== null) {
    for (const [id, live] of status) {
      if (readings.has(id)) continue
      readings.set(id, {
        pending: live.pendingInteraction !== undefined,
        running: live.running === true,
        topLevel: false,
      })
    }
  }
  return readings
}

/**
 * The cues two consecutive readings ask for. A session's first reading is its
 * baseline: a prompt already pending or a run already going makes no sound
 * until it changes. A session that stops running while a new prompt waits
 * answers both events here, and the caller's window keeps the permission cue.
 */
export function attentionEvents(previous: ReadonlyMap<string, AttentionReading>, next: ReadonlyMap<string, AttentionReading>): AttentionEvent[] {
  const events: AttentionEvent[] = []
  for (const [id, now] of next) {
    const before = previous.get(id)
    if (before === undefined) continue
    if (now.pending && !before.pending) events.push('permission')
    if (now.topLevel && before.running && !now.running) events.push('finished')
  }
  return events
}
