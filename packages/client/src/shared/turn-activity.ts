import { readTurnActivity } from '@dsh-claude-style/engine/host'
import { BRAND_DEEPSEEK } from '../constants'
import { activityPhrase } from './activity-phrase'
import { callArgsOf, callString } from './call-args'
import { fileToolCall } from './file-tool'
import type { CopyParams } from '../core/i18n'
import type { FileToolOperation } from './file-tool'
import type { HostAssistantStep, HostChatBlock, HostChatSnapshot, HostRunningCall, HostTurn } from '@dsh-claude-style/contracts/services'

/** `precise` adds file names, command descriptions and reasoning clauses; simple mode uses copy keys alone (D74).
 * Model-authored text has `key: null`; tool details survive the waiting line's standing lock.
 */

/** One state's words: the key they stand under in the line's copy, or the model's own text. */
export interface ActivityWords {
  /** The waiting line's own copy key, or null where the model wrote the words itself (then `text`). */
  key: string | null
  /** The model's own words; set only where `key` is null. */
  text?: string
  /**
   * Set on the words that are about a tool call: `detail` marks the words one
   * call carries of its own (the file it works on, the description it
   * declares), which the waiting line keeps past a standing lock
   * (features/chat-wait); `generic` marks the turn's calls with nothing of
   * their own to say.
   */
  aboutCall?: 'detail' | 'generic'
  /** Values for the copy's `{name}` slots. */
  params?: CopyParams
}

/** The thinking state's copy key, which is also the word a brand waits on while the model thinks (waitingWord). */
export const THINKING_KEY = 'chatWaitThinking'
/** The model is thinking, and its reasoning says nothing the line can take. */
export const ACTIVITY_THINKING: ActivityWords = { key: THINKING_KEY }
/** The model is writing its answer. */
export const ACTIVITY_WRITING: ActivityWords = { key: 'chatWaitWriting' }
/** The model is drawing up a tool call. */
export const ACTIVITY_TOOL_CALL: ActivityWords = { key: 'chatWaitToolCall', aboutCall: 'generic' }
/** The turn's tool calls are running, and the running call says nothing of its own. */
export const ACTIVITY_TOOLS: ActivityWords = { key: 'chatWaitTools', aboutCall: 'generic' }

/** Keep one waiting word per brand to avoid swapping between equivalent labels. */
export function waitingWord(brand: string, hostWord: string, skinWord: string) {
  return brand === BRAND_DEEPSEEK ? hostWord : skinWord
}

/** Reading, editing and writing one file: the file's own name fills the copy's slot. */
const ACTIVITY_FILE: Record<FileToolOperation, ActivityWords> = {
  read: { key: 'chatWaitReading', aboutCall: 'detail' },
  edit: { key: 'chatWaitEditing', aboutCall: 'detail' },
  write: { key: 'chatWaitWritingFile', aboutCall: 'detail' },
}

/** Null means no newest output or running tool; other block kinds read as writing. */
export function activityWords(snapshot: HostChatSnapshot | null, turn: HostTurn | undefined, precise: boolean): ActivityWords | null {
  if (snapshot === null || turn === undefined) return null
  const activity = readTurnActivity(snapshot, turn)
  if (activity === null) return null
  if (activity.kind === 'tools') return precise ? toolWords(activity.call) : ACTIVITY_TOOLS
  const newest = activity.newest
  if (newest === 'reasoning') {
    if (!precise) return ACTIVITY_THINKING
    const phrase = reasoningPhrase(activity.assistant)
    return phrase === null ? ACTIVITY_THINKING : { key: null, text: phrase }
  }
  if (newest === 'tool-call') return ACTIVITY_TOOL_CALL
  if (newest === null) return null
  return ACTIVITY_WRITING
}

/**
 * The words a call in flight declares for itself: the host's shell tools
 * (pwsh, bash) take a required `description` argument — what the command does,
 * in the model's own words — and the host's own tool row shows it beside the
 * tool's title. The waiting line carries it the way it carries a reasoning
 * clause (shared/activity-phrase): the first line as the model wrote it,
 * whole, so the row's own width decides how much of it shows. Only a started
 * call is read: a preparing one's argument JSON is cut off mid-stream
 * (shared/file-tool).
 */
export function callDescription(block: HostChatBlock): string | null {
  if (block.phase !== 'start') return null
  const args = callArgsOf(block.argsRaw ?? '')
  const description = args === null ? undefined : callString(args, ['description'])
  if (description === undefined) return null
  const line = description.split('\n', 1)[0].replace(/\s+/g, ' ').trim()
  if (line === '') return null
  return line.charAt(0).toUpperCase() + line.slice(1)
}

/** What a call in flight says: the file it works on, or the words it declares for itself. */
function toolWords(call: HostRunningCall): ActivityWords {
  const file = fileToolCall(call)
  if (file !== null) return { ...ACTIVITY_FILE[file.operation], params: { file: file.file } }
  const description = callDescription(call)
  if (description !== null) return { key: null, text: description, aboutCall: 'detail' }
  return ACTIVITY_TOOLS
}

/** The model's own words for its work, off the reasoning block it is streaming into. */
function reasoningPhrase(assistant: HostAssistantStep): string | null {
  const blocks = assistant.blocks
  const newest = blocks.length === 0 ? undefined : blocks[blocks.length - 1]
  if (newest === undefined || newest.kind !== 'reasoning' || typeof newest.text !== 'string') return null
  return activityPhrase(newest.text)
}
