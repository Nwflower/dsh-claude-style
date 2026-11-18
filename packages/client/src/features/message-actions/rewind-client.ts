/** Browser orchestration: plan, fork through DSH, then commit files and lineage through the plugin. */
import type { HostContext } from '@dsh-claude-style/engine/host'
import { hostSessions, hostUiWorkspace } from '@dsh-claude-style/engine/host'
import type { HostUiWorkspaceService } from '@dsh-claude-style/contracts/services'
import { SESSION_REWIND_COMMIT_PATH, SESSION_REWIND_PLAN_PATH } from '@dsh-claude-style/contracts/routes'
import type { LogicalConversation, RewindAction, RewindPlan } from '@dsh-claude-style/contracts/session-rewind'
import type { ReaderMessage } from './message-cut'
import { seedDraft } from './message-cut'
import { refreshConversations } from './revision-history'

async function request<Value>(path: string, body: unknown): Promise<Value> {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (response.status === 404) throw new Error('message-actions: the host offers no rewind routes')
  const answer = await response.json() as { ok?: boolean, value?: Value, error?: string }
  if (!response.ok || answer.ok !== true || answer.value === undefined) {
    throw new Error(answer.error ?? `rewind route answered HTTP ${response.status}`)
  }
  return answer.value
}

export function prepareRewind(message: ReaderMessage): Promise<RewindPlan> {
  return request<RewindPlan>(SESSION_REWIND_PLAN_PATH, {
    sessionId: message.sessionId,
    messageSeq: message.seq,
    turn: message.turn,
  })
}

export async function executeRewind(
  ctx: HostContext,
  message: ReaderMessage,
  plan: RewindPlan,
  text: string,
  send: boolean,
  action: RewindAction,
  restore: boolean,
): Promise<void> {
  const sessions = hostSessions(ctx)
  if (sessions === null || typeof sessions.fork !== 'function') throw new Error('message-actions: the host sessions service offers no fork')
  const childId = await sessions.fork({ sessionId: message.sessionId, atSeq: plan.atSeq, increaseTitle: false })
  try {
    await request<LogicalConversation>(SESSION_REWIND_COMMIT_PATH, {
      planId: plan.id,
      childSessionId: childId,
      action,
      restore,
    })
  } catch (error) {
    // A failed commit records the child as a hidden failed revision; refresh before surfacing the failure.
    await refreshConversations()
    throw error
  }
  const workspace = hostUiWorkspace(ctx) as HostUiWorkspaceService | null
  if (workspace === null || typeof workspace.openSession !== 'function') throw new Error('message-actions: host uiWorkspace.openSession is unavailable')
  workspace.openSession(childId)
  await seedDraft(ctx, childId, text, send)
  await refreshConversations()
}
