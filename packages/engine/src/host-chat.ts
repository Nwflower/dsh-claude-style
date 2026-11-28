/**
 * The chat readings: what the host's conversation says about a session — the
 * saved view, the running turn's activity, the permission preset, and the
 * whole-log outline the turn navigator jumps through (D91).
 */

import { CONVERSATION_VIEW_STORAGE_PREFIX } from '@dsh-claude-style/contracts/dom'
import type { HostAssistantStep, HostChatSnapshot, HostOutlineTurn, HostRunningCall, HostSession, HostTurn } from '@dsh-claude-style/contracts/services'
import { hostSessions } from './host-services'
import type { HostContext } from './host-types'

/** The saved view last parsed, with the raw string it was parsed from: the composer's pass reads it every frame and the store moves only on a view switch. */
let savedView: { raw: string, view: string | null } | null = null

/** The view id the host saved for this session; null means chat or no usable saved value. */
export function conversationViewPreference(sessionId: string | null | undefined): string | null {
  if (typeof sessionId !== 'string' || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(CONVERSATION_VIEW_STORAGE_PREFIX + sessionId)
    if (raw === null) return null
    if (savedView !== null && savedView.raw === raw) return savedView.view
    const stored: unknown = JSON.parse(raw)
    const view = typeof stored !== 'object' || stored === null || !('view' in stored)
      ? null
      : typeof stored.view === 'string' ? stored.view : null
    savedView = { raw, view }
    return view
  } catch {
    // The host reads an unavailable store or malformed JSON as no saved view too.
    return null
  }
}

/**
 * What an open turn is doing, read off the host's chat snapshot: its newest step's assistant output while that streams (`newest` is the kind of its newest block), else the call the host reports in flight, else null while the turn waits on the model.
 */
export function readTurnActivity(snapshot: HostChatSnapshot, turn: HostTurn): TurnActivity | null {
  const step = turn.steps.length === 0 ? undefined : turn.steps[turn.steps.length - 1]
  const assistant = step === undefined ? undefined : step.data.get('assistant-step')
  if (assistant !== undefined && assistant.status === 'running') {
    const blocks = assistant.blocks
    return { kind: 'assistant', assistant, newest: blocks.length === 0 ? null : blocks[blocks.length - 1].kind }
  }
  // The host orders the calls in flight by where they stand in the turn, so the
  // last of this turn's is the one the model is on now.
  const calls = snapshot.legacy?.runningCalls ?? []
  let running: HostRunningCall | undefined
  for (let i = 0; i < calls.length; i++) {
    if (calls[i].turn === turn.turn) running = calls[i]
  }
  return running === undefined ? null : { kind: 'tools', call: running }
}

/** What an open turn is doing (readTurnActivity). */
export type TurnActivity = { kind: 'assistant', assistant: HostAssistantStep, newest: string | null } | { kind: 'tools', call: HostRunningCall }

export function currentPreset(session: HostSession): string | null {
  const snapshot = session.projections?.faceOf('permissions').getSnapshot()
  if (snapshot === undefined || snapshot === null) return null
  // The face hands back `{ currentValue }`, the shape the host's own picker reads.
  const value = (snapshot as { currentValue?: unknown }).currentValue
  return typeof value === 'string' ? value : null
}

/** One session's whole-log turn outline (the host's `turnOutline` projection), or undefined where the assembly does not mount it; `seq` is the turn's `turn/start` event, which the host's own jump pages history through. */
export function sessionOutline(ctx: HostContext, sessionId: string): HostOutlineTurn[] | undefined {
  const face = hostSessions(ctx)?.binding(sessionId)?.session?.projections?.faceOf('turnOutline')
  const snapshot = typeof face?.getSnapshot === 'function' ? face.getSnapshot() : undefined
  return Array.isArray(snapshot) ? snapshot as HostOutlineTurn[] : undefined
}

/** The turn holding one event seq: the latest outline entry at or before it; an outline that does not reach that far answers null, and the caller leaves the reading position where it is. */
export function turnForSeq(outline: HostOutlineTurn[] | undefined, seq: number): number | null {
  if (!Array.isArray(outline)) return null
  let found: number | null = null
  for (const entry of outline) {
    if (entry === null || typeof entry !== 'object') continue
    if (!Number.isSafeInteger(entry.turn) || !Number.isSafeInteger(entry.seq)) continue
    if (entry.seq > seq) continue
    if (found === null || entry.turn > found) found = entry.turn
  }
  return found
}

