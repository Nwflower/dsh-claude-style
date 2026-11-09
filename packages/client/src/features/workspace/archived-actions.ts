import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { SESSION_DELETE_ROUTE } from '../../constants'
import type { HostAnswer } from '@dsh-claude-style/engine/resource'
import type { HostSessionsService } from '@dsh-claude-style/contracts/services'
import type { createHostToast } from '../../shared/host-toast'
import { copy } from './copy'

/** Archived-session deletion through the host half's route and service (D43, D75). */
export function createArchivedActions(options: {
  /** The host's Toast, rendered by the skin itself; disposed with the feature. */
  toast: ReturnType<typeof createHostToast>
  /** The session service, acquired once the host's registration stands. */
  sessions: () => HostSessionsService | null
}) {
  /** Render the host Toast here because its notice channel is private to ui-workspace. */
  function notifyToast(text: string) {
    options.toast.show({ text, icon: React.createElement(primitives.IconWarningOutlineRegular) })
  }

  /**
   * Pull the session list after a delete so the projection prunes the removed
   * id now; the service single-flights an in-progress refresh.
   */
  function refreshSessions() {
    const followed = options.sessions()
    if (followed === null || typeof followed.refresh !== 'function') return
    // Best effort against the host's sessions service: a rejection leaves the list as it stands (D12).
    followed.refresh().catch((reason: unknown) => {
      console.warn('dsh-claude-style: session baseline refresh rejected:', reason)
    })
  }

  /**
   * Delete one stored session. A missing directory or an old host's JSON 404
   * counts as already gone; 409 keeps the row because the agent still holds it,
   * and every other refusal shows the route's message.
   */
  function removeArchived(id: string) {
    fetch(SESSION_DELETE_ROUTE, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: id }),
    }).then(response => response.json().then((result: HostAnswer) => ({ status: response.status, result }))).then(({ status, result }) => {
      if (result?.ok === true || (status === 404 && result?.error === 'session not found')) {
        refreshSessions()
        return
      }
      const refusal: Error & { status?: number } = new Error(String(result?.error || `HTTP ${status}`))
      refusal.status = status
      throw refusal
    }).catch((reason: { status?: number, message?: string }) => {
      console.warn('dsh-claude-style: session delete rejected:', reason)
      notifyToast(reason?.status === 409
        ? copy('archiveDeleteOpen')
        : copy('archiveDeleteFailed', { detail: reason?.message ?? String(reason) }))
    })
  }

  return { removeArchived, refreshSessions, notifyToast }
}
