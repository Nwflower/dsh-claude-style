import type { AssistantBlock, TurnLocation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { AssistantChatData, ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import { readerCopy } from '../../core/i18n'

/**
 * The session projection as the reading view reads it (D57), ported from
 * dsh-better-display's projection (MIT): consecutive nodes of one turn form a
 * group, and a turn's boundary decides what folds when it closes.
 */

/** Consecutive nodes of one turn, or one node outside any turn. */
export interface ReaderGroup {
  key: string
  turn: number | null
  keys: readonly string[]
}

/** How a turn stands: open, or closed with the reason its end event gave. */
export interface TurnBoundary {
  status: 'open' | 'closed' | 'unknown'
  reason: string | null
  latestStep: number
  /** The step of the turn's last content-bearing assistant message, which stays open. */
  closingStep: number | null
}

/** A node's turn, or null for a node placed on the session. */
export function nodeTurn(node: ChatConversationViewNode): number | null {
  return node.location.kind === 'step' || node.location.kind === 'turn' ? node.location.turn.turn : null
}

/**
 * Group the visible nodes by turn, in order. A turn the order leaves and comes
 * back to gets a second group with its own key. Runs on structural changes,
 * never on each text delta: a node's own seat subscribes to its content.
 */
export function groupNodes(order: readonly string[], get: (key: string) => ChatConversationViewNode | undefined): ReaderGroup[] {
  const groups: ReaderGroup[] = []
  const seenTurns = new Set<number>()
  for (const key of order) {
    const node = get(key)
    if (node === undefined || node.visibility === 'hidden') continue
    const turn = nodeTurn(node)
    const previous = groups.at(-1)
    if (turn !== null && previous?.turn === turn) {
      (previous.keys as string[]).push(key)
      continue
    }
    const groupKey = turn === null ? `node:${key}` : seenTurns.has(turn) ? `turn:${turn}:${key}` : `turn:${turn}`
    groups.push({ key: groupKey, turn, keys: [key] })
    if (turn !== null) seenTurns.add(turn)
  }
  return groups
}

export function boundaryOf(turn: TurnLocation | undefined): TurnBoundary {
  return {
    status: turn?.status ?? 'unknown',
    reason: turn?.end?.data.reason.kind ?? null,
    latestStep: turn?.steps.at(-1)?.step ?? -1,
    closingStep: turn?.data.get('turn-tail')?.closing?.step ?? null,
  }
}

/** Whether a turn closed as a success, the one ending that folds its process. */
export function closedCompleted(boundary: TurnBoundary): boolean {
  return boundary.status === 'closed' && boundary.reason === 'completed'
}

/**
 * Whether an assistant step is narration before the final answer. New body
 * text, a tool call or a settled step is not a completed turn: only a turn that
 * closed as completed folds the steps before its closing one.
 */
export function isEarlierNarration(data: AssistantChatData, boundary: TurnBoundary): boolean {
  if (data.status !== 'settled' || !closedCompleted(boundary)) return false
  if (data.blocks.some(block => block.kind === 'image' || block.kind === 'other')) return false
  return boundary.closingStep !== null && data.step < boundary.closingStep
}

/** Whether a turn's process stands open: the reader's choice, else open until it completes. */
export function processExpanded(choice: boolean | undefined, boundary: TurnBoundary): boolean {
  return choice ?? !closedCompleted(boundary)
}

/** The reader's choice is kept per boundary state, so reading a running turn does not pin it open once it completes. */
export function processChoiceKey(groupKey: string, boundary: TurnBoundary): string {
  return `${groupKey}:${boundary.status}:${boundary.reason ?? 'pending'}`
}

export function hasVisibleBody(blocks: readonly AssistantBlock[]): boolean {
  return blocks.some(block => block.kind === 'image' || block.kind === 'other' || (block.kind === 'text' && block.text.trim() !== ''))
}

/** Kinds that are records of the turn's work in their own right: they open and close with its process. */
export const PROCESS_RECORDS: ReadonlySet<string> = new Set(['context', 'model-retry', 'system-prompt', 'command', 'manual-compaction', 'compaction'])

/** Whether a node belongs to the turn's process; a body-only step is the answer, not process. */
export function hasProcessContent(node: ChatConversationViewNode | undefined, boundary: TurnBoundary): boolean {
  if (node === undefined || node.visibility === 'hidden') return false
  if (node.kind === 'assistant-step') {
    const data = node.data as AssistantChatData
    return data.blocks.some(block => block.kind === 'reasoning' && block.text.trim() !== '')
      || (isEarlierNarration(data, boundary) && hasVisibleBody(data.blocks))
  }
  return PROCESS_RECORDS.has(node.kind)
}

/** A run of blocks of one kind inside an assistant step, at its first block's index. */
export interface AssistantSegment {
  kind: 'reasoning' | 'body'
  start: number
  blocks: AssistantBlock[]
}

/**
 * An assistant step's blocks in their native order, as runs of thinking and
 * body. A tool call ends a run; a later thought is never lifted above text.
 */
export function assistantSegments(blocks: readonly AssistantBlock[]): AssistantSegment[] {
  const segments: AssistantSegment[] = []
  let previous: AssistantSegment | undefined
  blocks.forEach((block, index) => {
    if (block.kind === 'tool-call') {
      previous = undefined
      return
    }
    const kind = block.kind === 'reasoning' ? 'reasoning' : 'body'
    if (previous?.kind === kind) {
      previous.blocks.push(block)
      return
    }
    previous = { kind, start: index, blocks: [block] }
    segments.push(previous)
  })
  return segments
}

/** The notice under a turn that ended other than completed, or null. */
export function terminalLabel(reason: string | null): string | null {
  switch (reason) {
    case null:
    case 'completed':
      return null
    case 'aborted':
    case 'interrupted':
      return readerCopy('endStopped', 'This turn was stopped; what it produced is kept.')
    case 'blocked':
      return readerCopy('endBlocked', 'This turn is waiting on something; see the actions below.')
    case 'max-tokens':
      return readerCopy('endMaxTokens', 'The output reached this turn\'s length limit and may be incomplete.')
    case 'error':
      return readerCopy('endError', 'This turn did not finish; the error is kept below.')
    default:
      return readerCopy('endOther', 'This turn ended as {reason}.', { reason })
  }
}

/**
 * The fork anchor: the first finite seq among the candidates. A missing anchor
 * stays undefined, because the host reads an absent `atSeq` as a fork of the
 * whole session.
 */
export function forkAnchorSeq(candidates: ReadonlyArray<{ seq?: unknown } | null | undefined>): number | undefined {
  for (const candidate of candidates) {
    const seq = candidate?.seq
    if (typeof seq === 'number' && Number.isFinite(seq)) return seq
  }
  return undefined
}
