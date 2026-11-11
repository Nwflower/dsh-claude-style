/**
 * The panel's way back into the host (D94): it opens a produced file in the
 * host's own preview and a subagent or Team member's session in the
 * conversation view.
 *
 * The install hands its host context over for the lifetime of the rail's React
 * root. Row actions read the host through this one place; teardown releases it.
 */
import { hostUiWorkspace, openHostFile } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'

/** The host context this generation runs on, for the seats behind the panel's rows. */
let host: HostContext | null = null

/** Hand the host context over for this generation; its teardown gives it back. */
export function setPanelContext(ctx: HostContext | null) {
  host = ctx
  return ctx
}

/** Give the host context back only when it is still the one this generation handed over. */
export function clearPanelContext(ctx: HostContext | null) {
  if (host === ctx) host = null
}

/** Open one subagent or Team member session in the conversation view. */
export function openPanelSession(sessionId: string) {
  if (host === null) return
  const workspace = hostUiWorkspace(host)
  if (typeof workspace?.openSession === 'function') workspace.openSession(sessionId)
}

/** Open one produced file in the host's own preview page. */
export function openPanelFile(sessionId: string, directory: string | undefined, path: string) {
  if (host === null) throw new Error('the session details rail is not installed')
  openHostFile(host, sessionId, directory, path)
}
