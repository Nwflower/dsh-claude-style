import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { SESSION_DELETE_ROUTE } from '../../constants'
import type { HostAnswer } from '@dsh-claude-style/engine/resource'
import type { HostSessionsService } from '@dsh-claude-style/contracts/services'
import type { createHostToast } from '../../shared/host-toast'
import { copy } from './copy'

/**
 * The archived conversations' own actions, reached through the host half's own
 * routes and services (D43, D75): deleting goes through the host half's route
 * as it did on the skin's own rows, and the session baseline is re-pulled
 * through the host's sessions service right after.
 */
export function createArchivedActions(options: {
  /** The host's Toast, rendered by the skin itself; disposed with the feature. */
  toast: ReturnType<typeof createHostToast>
  /** The session service, acquired once the host's registration stands. */
  sessions: () => HostSessionsService | null
}) {
  /**
   * The host's Toast, warning glyph included, rendered by the skin itself: the
   * host's notice channel is private to ui-workspace. The Toast portals to the
   * body, and a new key restarts it the way the host re-shows it.
   */
  function notifyToast(text: string) {
    options.toast.show({ text, icon: React.createElement(primitives.IconWarningOutlineRegular) })
  }

  /**
   * Re-pull the host's session baseline right after a delete.
   *
   * The full list is what the projection prunes by: the host's fresh list
   * answer no longer carries the removed id, so its stale summary — the
   * one that kept a deleted session looking alive — leaves `sessions.list`
   * at this pull instead of at the next reconnect, and the host's own tree
   * drops the row with it. The pull is the sessions service's single-flight
   * refresh, so a pull already under way is reused.
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
   * Delete one stored session through the host half's own route.
   *
   * The harness gives the browser half no deletion API of its own (the
   * workspace controller archives and unarchives; the agent protocol's
   * session delete is the host delegating to an ACP agent that owns the
   * storage), so the skin's host half removes the session's stored
   * directory and drops the id from the registry's archive set before it
   * answers. A stored-directory miss answers success too — an archive
   * entry whose directory is already gone is the ghost this buries — and
   * a 404 that still carries the host's own "session not found" JSON is
   * the same miss from an older host half without that branch: the storage
   * is gone all the same, so the row leaves too. Every other refusal keeps
   * the row and raises the host's Toast: the "session is open" answer (the
   * app still holds the session's agent attached, and only a restart
   * releases it) carries its own copy, everything else names the refusal
   * the route sent.
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
