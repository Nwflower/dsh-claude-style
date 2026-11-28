import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { SESSION_DELETE_PATH } from '@dsh-claude-style/contracts/routes'
import { HostHttpError, readHostJson } from '@dsh-claude-style/engine/resource'
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
    readHostJson(SESSION_DELETE_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: id }),
    }).then(result => {
      if (result?.ok === true) {
        refreshSessions()
        return
      }
      throw new Error(String(result?.error || 'session delete failed'))
    }).catch((reason: unknown) => {
      if (reason instanceof HostHttpError && reason.status === 404 && reason.message === 'session not found') {
        refreshSessions()
        return
      }
      console.warn('dsh-claude-style: session delete rejected:', reason)
      const status = reason instanceof HostHttpError ? reason.status : undefined
      const detail = reason instanceof Error ? reason.message : String(reason)
      notifyToast(status === 409
        ? copy('archiveDeleteOpen')
        : copy('archiveDeleteFailed', { detail }))
    })
  }

  return { removeArchived, refreshSessions, notifyToast }
}
