import { readTurnActivity } from '../core/host'
import type { HostChatSnapshot, HostTurn } from '@dsh-claude-style/contracts/services'

/**
 * What an open turn is doing now, in words (D23, D32): the states the turn
 * status line and the live waiting line both say, so the two cannot drift.
 *
 * The words are the copy document's own (`turnStatus*`, model-descriptions.json);
 * a line that cannot read a state falls back to its own wording.
 */

/** One line of copy: its key in the copy document and the English the bundle carries. */
export interface ActivityWords {
  key: string
  fallback: string
}

/** The model is thinking. */
export const ACTIVITY_THINKING: ActivityWords = { key: 'turnStatusThinking', fallback: 'Thinking…' }
/** The model is writing its answer. */
export const ACTIVITY_WRITING: ActivityWords = { key: 'turnStatusWriting', fallback: 'Writing…' }
/** The model is drawing up a tool call. */
export const ACTIVITY_TOOL_CALL: ActivityWords = { key: 'turnStatusToolCall', fallback: 'Preparing a tool call…' }
/** The turn's tool calls are running. */
export const ACTIVITY_TOOLS: ActivityWords = { key: 'turnStatusTools', fallback: 'Running tools…' }

/**
 * The words for what the turn is doing, or null where there is nothing to say:
 * the model has written nothing in its newest step and no tool is running. A
 * turn's newest block decides among thinking, a tool call being drawn up and
 * writing; any other block kind reads as writing.
 */
export function activityWords(snapshot: HostChatSnapshot | null, turn: HostTurn | undefined): ActivityWords | null {
  if (snapshot === null || turn === undefined) return null
  const activity = readTurnActivity(snapshot, turn)
  if (activity === null) return null
  if (activity.kind === 'tools') return ACTIVITY_TOOLS
  const newest = activity.newest
  if (newest === 'reasoning') return ACTIVITY_THINKING
  if (newest === 'tool-call') return ACTIVITY_TOOL_CALL
  if (newest === null) return null
  return ACTIVITY_WRITING
}
