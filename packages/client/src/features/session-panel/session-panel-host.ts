/**
 * The panel's way back into the host (D94): it opens a produced file in the
 * host's own preview and a subagent or Team member's session in the
 * conversation view.
 *
 * The install hands its host context over for the lifetime of the rail's React
 * root. Row actions read the host through this one place; teardown releases it.
 */
import { hostJobs, hostRemoteSubagents, hostUiWorkspace, openHostFile } from '@dsh-claude-style/engine/host'
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

/** The host context this generation runs on, or null before the install handed it over. */
export function panelHost(): HostContext | null {
  return host
}

/** Request human cancellation through the same owner-fenced service as the host's job list (D94). */
export async function stopPanelJob(sessionId: string, jobId: string) {
  const jobs = hostJobs(host)
  if (typeof jobs?.kill !== 'function') throw new Error('the host jobs controller is unavailable')
  const answer = await jobs.kill(sessionId, jobId)
  if (answer.ok !== true) throw new Error('the host refused to stop the job')
}

/** Interrupt a continuable child's active turn under the current parent's authority (D94). */
export async function stopPanelSubagent(parentSessionId: string, childSessionId: string) {
  const subagents = hostRemoteSubagents(host)
  if (typeof subagents?.interruptByParent !== 'function') throw new Error('the host subagent controller is unavailable')
  const answer = await subagents.interruptByParent(childSessionId, parentSessionId, 'continuable')
  if (answer.ok !== true) throw new Error('the host refused to stop the subagent')
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
