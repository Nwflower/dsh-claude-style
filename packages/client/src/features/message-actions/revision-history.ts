/** Logical-conversation metadata and sidebar visibility (D105). */
import type { LogicalConversation } from '@dsh-claude-style/contracts/session-rewind'
import { SESSION_REVISIONS_PATH } from '@dsh-claude-style/contracts/routes'
import { CHAT_TURN_ATTRIBUTE, SESSION_ROW_KEY_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import type { HostContext } from '@dsh-claude-style/engine/host'
import { closestConversationSession, conversationSessionId, currentSessionId, findChatTarget } from '@dsh-claude-style/engine/host'

export const REVISION_HIDDEN_ATTRIBUTE = 'data-dsh-claude-revision-hidden'
export const REVISIONS_CHANGED_EVENT = 'dsh-claude-style:revisions-changed'

let conversations: LogicalConversation[] = []

export function conversationFor(sessionId: string): LogicalConversation | undefined {
  return conversations.find(conversation => conversation.revisions.some(revision => revision.sessionId === sessionId))
}

export async function refreshConversations(): Promise<void> {
  const response = await fetch(SESSION_REVISIONS_PATH, { credentials: 'same-origin' })
  if (response.status === 404) {
    // A host without the plugin's rewind routes has no logical-conversation service (D12).
    conversations = []
    document.dispatchEvent(new Event(REVISIONS_CHANGED_EVENT))
    return
  }
  const answer = await response.json() as { ok?: boolean, value?: LogicalConversation[], error?: string }
  if (!response.ok || answer.ok !== true || !Array.isArray(answer.value)) {
    throw new Error(answer.error ?? `logical conversations answered HTTP ${response.status}`)
  }
  conversations = answer.value
  document.dispatchEvent(new Event(REVISIONS_CHANGED_EVENT))
}

/** One native row stays visible for each logical conversation: its active fork. */
export function rowSession(ctx: HostContext, row: HTMLElement): string | null {
  return conversationSessionId(closestConversationSession(row)) ?? currentSessionId(ctx)
}

/** Hide only host-fork artifacts inside a managed logical conversation, never ordinary fork dividers or settled turns. */
export function applyForkArtifactVisibility(ctx: HostContext, inheritedRows: readonly HTMLElement[], tailRows: readonly HTMLElement[]): void {
  for (const row of inheritedRows) {
    const sessionId = rowSession(ctx, row)
    if (sessionId !== null && conversationFor(sessionId) !== undefined) row.setAttribute(REVISION_HIDDEN_ATTRIBUTE, '')
    else row.removeAttribute(REVISION_HIDDEN_ATTRIBUTE)
  }
  for (const row of tailRows) {
    const sessionId = rowSession(ctx, row)
    const turn = Number(row.getAttribute(CHAT_TURN_ATTRIBUTE))
    const snapshot = sessionId === null ? null : findChatTarget(ctx, sessionId)?.getSnapshot()
    const ending = Number.isSafeInteger(turn) ? snapshot?.timeline.turns.get(turn)?.end : undefined
    if (sessionId !== null && conversationFor(sessionId) !== undefined && ending?.data.reason.kind === 'forked') row.setAttribute(REVISION_HIDDEN_ATTRIBUTE, '')
    else row.removeAttribute(REVISION_HIDDEN_ATTRIBUTE)
  }
}

export function clearRevisionVisibility(rows: readonly HTMLElement[]): void {
  for (const row of rows) row.removeAttribute(REVISION_HIDDEN_ATTRIBUTE)
}

export function applyRevisionVisibility(rows: readonly HTMLElement[]): void {
  const hidden = new Set<string>()
  for (const conversation of conversations) {
    for (const revision of conversation.revisions) {
      if (revision.sessionId !== conversation.activeSessionId) hidden.add(revision.sessionId)
    }
  }
  for (const row of rows) {
    const key = row.getAttribute(SESSION_ROW_KEY_ATTRIBUTE) ?? ''
    if (key.startsWith('session:') && hidden.has(key.slice('session:'.length))) row.setAttribute(REVISION_HIDDEN_ATTRIBUTE, '')
    else row.removeAttribute(REVISION_HIDDEN_ATTRIBUTE)
  }
}
