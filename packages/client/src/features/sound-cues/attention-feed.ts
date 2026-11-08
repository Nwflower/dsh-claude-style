import { hostSessions, hostUiSession } from '@dsh-claude-style/engine/host'
import { attentionEvents, attentionReading } from './attention'
import type { AttentionEvent, AttentionReading } from './attention'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostSessionListSnapshot, HostSessionStatusSnapshot, HostSnapshotSource } from '@dsh-claude-style/contracts/services'

/**
 * Watch the two host snapshots the cues read and answer each publication with
 * the events since the last one. The first reading is the baseline.
 *
 * The services can mount after this feature (the page boots it before the
 * shell finishes), so `ctx.inject` waits for both where the host offers it; a
 * host without the wait reads what stands now.
 */
export function createAttentionFeed(ctx: HostContext, onEvent: (event: AttentionEvent) => void) {
  let previous: Map<string, AttentionReading> | null = null
  let statusSource: HostSnapshotSource<HostSessionStatusSnapshot> | undefined
  let listSource: HostSnapshotSource<HostSessionListSnapshot> | undefined
  let stopStatus: (() => void) | null = null
  let stopList: (() => void) | null = null
  let disposed = false

  function read() {
    if (disposed) return
    const status = typeof statusSource?.getSnapshot === 'function' ? statusSource.getSnapshot() : null
    const list = typeof listSource?.getSnapshot === 'function' ? listSource.getSnapshot() : null
    const next = attentionReading(status, list)
    if (previous !== null) {
      const events = attentionEvents(previous, next)
      for (let i = 0; i < events.length; i++) onEvent(events[i])
    }
    previous = next
  }

  function bind(scope: HostContext) {
    if (disposed) return
    const status = hostUiSession(scope)?.sessionStatus
    const list = hostSessions(scope)?.list
    if (status !== statusSource) {
      if (stopStatus !== null) stopStatus()
      statusSource = status
      stopStatus = typeof status?.subscribe === 'function' ? status.subscribe(read) : null
    }
    if (list !== listSource) {
      if (stopList !== null) stopList()
      listSource = list
      stopList = typeof list?.subscribe === 'function' ? list.subscribe(read) : null
    }
    read()
  }

  const fiber = typeof ctx.inject === 'function' ? ctx.inject(['uiSession', 'sessions'], bind) : null
  if (fiber === null) bind(ctx)

  return {
    dispose() {
      disposed = true
      if (stopStatus !== null) stopStatus()
      if (stopList !== null) stopList()
      fiber?.dispose()
    },
  }
}
