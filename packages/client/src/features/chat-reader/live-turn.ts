import type { AssistantBlock, ToolCallBlock } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { AssistantChatData, ChatConversationViewNode, ToolChatData } from '@deepseek-ai/dsh-client-ui-chat/client'
import { readerCopy } from '../../core/i18n'
import { assistantSegments, hasVisibleBody } from './projection'
import type { ReaderGroup, TurnBoundary } from './projection'
import { activitySummary, argText, baseName, callArgs } from './tool-activity'
import type { ToolActivityEntry } from './tool-activity'

/**
 * One turn as a sequence of steps, and the live fold over it (D57), ported from
 * dsh-better-display's live-turn (MIT). While a turn is open, a new thought
 * folds the earlier steps of its chain into one summary; a user message starts
 * a new chain. The fold is presentation only: the session data is never changed.
 */

/** A node of the reading flow, or a root tool call. */
export type ReaderFlowEntry = ToolActivityEntry | { kind: 'node', key: string, nodeKey: string, order: number }

export type LiveStep =
  | { kind: 'reasoning', key: string, nodeKey: string, start: number, blocks: AssistantBlock[], step: number }
  | { kind: 'body', key: string, nodeKey: string, start: number, blocks: AssistantBlock[], step: number }
  | { kind: 'tool', key: string, entry: ToolActivityEntry }
  | { kind: 'user', key: string, nodeKey: string }
  | { kind: 'other', key: string, nodeKey: string }

export type LiveTurnItem =
  | { kind: 'user', key: string, step: Extract<LiveStep, { kind: 'user' }> }
  | { kind: 'fold', key: string, steps: readonly LiveStep[], summary: string }
  | { kind: 'open', key: string, step: LiveStep }

/** One group's nodes in order, each root tool call as its own entry. */
export function readerFlow(group: ReaderGroup, get: (key: string) => ChatConversationViewNode | undefined): ReaderFlowEntry[] {
  const flow: ReaderFlowEntry[] = []
  for (const key of group.keys) {
    const node = get(key)
    if (node === undefined || node.visibility === 'hidden') continue
    if (node.kind === 'tool-call') {
      const block: ToolCallBlock = (node.data as ToolChatData).root
      const step = node.location.kind === 'step' ? node.location.step.step : 0
      flow.push({ kind: 'tool', key: `reader-tool:${block.callId}`, callId: block.callId, step, block, order: node.anchorSeq })
      continue
    }
    flow.push({ kind: 'node', key, nodeKey: key, order: node.anchorSeq })
  }
  return flow.sort((left, right) => left.order - right.order)
}

export function liveFoldEnabled(boundary: TurnBoundary): boolean {
  return boundary.status === 'open'
}

/** The figures of a fold: `思考×N · 输出×M · 工具×K · 记录×J` in the reader's language. */
export function foldSummary(steps: readonly LiveStep[]): string {
  let reasoning = 0
  let body = 0
  let tool = 0
  let other = 0
  for (const step of steps) {
    if (step.kind === 'reasoning') reasoning += 1
    else if (step.kind === 'body') body += 1
    else if (step.kind === 'tool') tool += 1
    else if (step.kind === 'other') other += 1
  }
  const parts: string[] = []
  if (reasoning > 0) parts.push(readerCopy('foldThinking', 'Thinking×{count}', { count: reasoning }))
  if (body > 0) parts.push(readerCopy('foldOutput', 'Output×{count}', { count: body }))
  if (tool > 0) parts.push(readerCopy('foldTool', 'Tools×{count}', { count: tool }))
  if (other > 0) parts.push(readerCopy('foldRecord', 'Records×{count}', { count: other }))
  return parts.length > 0 ? parts.join(' · ') : readerCopy('foldEarlier', 'Earlier steps')
}

/** One chain splits only when a new thought follows earlier thinking, body or tool work. */
export function splitChain(chain: readonly LiveStep[]): { fold: readonly LiveStep[] | null, open: readonly LiveStep[] } {
  const lastReasoning = chain.findLastIndex(step => step.kind === 'reasoning')
  if (lastReasoning <= 0) return { fold: null, open: chain }
  const prior = chain.slice(0, lastReasoning)
  if (!prior.some(step => step.kind === 'reasoning' || step.kind === 'body' || step.kind === 'tool')) return { fold: null, open: chain }
  return { fold: prior, open: chain.slice(lastReasoning) }
}

/** An assistant step as thinking runs, body runs and the root calls it made, in block order. */
function stepsFromAssistant(nodeKey: string, data: AssistantChatData, tools: Map<string, ToolActivityEntry>, consumed: Set<string>): LiveStep[] {
  const marks: { at: number, step: LiveStep }[] = []
  for (const part of assistantSegments(data.blocks)) {
    const empty = part.kind === 'reasoning'
      ? !part.blocks.some(block => block.kind === 'reasoning' && block.text.trim() !== '')
      : !hasVisibleBody(part.blocks)
    if (empty) continue
    marks.push({ at: part.start, step: { kind: part.kind, key: `${nodeKey}:${part.kind}:${part.start}`, nodeKey, start: part.start, blocks: part.blocks, step: data.step } })
  }
  data.blocks.forEach((block, index) => {
    if (block.kind !== 'tool-call') return
    const tool = tools.get(block.callId)
    if (tool === undefined || consumed.has(tool.callId)) return
    consumed.add(tool.callId)
    marks.push({ at: index, step: { kind: 'tool', key: tool.key, entry: tool } })
  })
  marks.sort((left, right) => left.at - right.at || left.step.key.localeCompare(right.step.key))
  return marks.map(mark => mark.step)
}

/**
 * The flow as source-ordered steps. A root call its assistant step names stands
 * between that step's text where the model made it; one no step names keeps
 * its node's place.
 */
export function segmentLiveTurn(flow: readonly ReaderFlowEntry[], get: (key: string) => ChatConversationViewNode | undefined): LiveStep[] {
  const tools = new Map<string, ToolActivityEntry>()
  for (const entry of flow) if (entry.kind === 'tool') tools.set(entry.callId, entry)
  const named = new Set<string>()
  for (const entry of flow) {
    if (entry.kind !== 'node') continue
    const node = get(entry.nodeKey)
    if (node?.kind !== 'assistant-step' || node.visibility === 'hidden') continue
    for (const block of (node.data as AssistantChatData).blocks) if (block.kind === 'tool-call') named.add(block.callId)
  }
  const steps: LiveStep[] = []
  const consumed = new Set<string>()
  for (const entry of flow) {
    if (entry.kind === 'tool') {
      if (named.has(entry.callId) || consumed.has(entry.callId)) continue
      consumed.add(entry.callId)
      steps.push({ kind: 'tool', key: entry.key, entry })
      continue
    }
    const node = get(entry.nodeKey)
    // The host's turn tail and its whole-turn process control: the view draws its own of both.
    if (node === undefined || node.visibility === 'hidden' || node.kind === 'turn-tail' || node.kind === 'turn-process') continue
    if (node.kind === 'user' || node.kind === 'steering') steps.push({ kind: 'user', key: entry.key, nodeKey: entry.nodeKey })
    else if (node.kind === 'assistant-step') steps.push(...stepsFromAssistant(entry.nodeKey, node.data as AssistantChatData, tools, consumed))
    else steps.push({ kind: 'other', key: entry.key, nodeKey: entry.nodeKey })
  }
  return steps
}

/** Cut a value to one line of at most `max` characters. */
function clip(value: string | undefined, max: number): string | undefined {
  if (value === undefined) return undefined
  const flat = value.replace(/\s+/gu, ' ').trim()
  if (flat === '') return undefined
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

/** One finished call, described by what it did, for a folded step list. */
export function toolSummary(entry: ToolActivityEntry): string {
  const info = activitySummary(entry.block)
  const args = callArgs(entry.block)
  const said = clip(info.description, 40)
  switch (info.category) {
    case 'read': {
      const file = clip(info.target === undefined ? undefined : baseName(info.target), 28)
      return file === undefined ? readerCopy('toolReadAny', 'Read a file') : readerCopy('toolReadFile', 'Read {file}', { file })
    }
    case 'write':
      return clip(info.title, 40) ?? readerCopy('toolEditAny', 'Edit a file')
    case 'terminal': {
      const command = clip(info.command, 32)
      return said ?? (command === undefined ? readerCopy('toolRunCommand', 'Run a command') : readerCopy('toolRunNamed', 'Run {command}', { command }))
    }
    case 'search': {
      const needle = clip(argText(args, ['pattern', 'query']), 26)
      if (info.name === 'glob') return needle === undefined ? readerCopy('toolFindFiles', 'Find files') : readerCopy('toolFindNamed', 'Find {needle}', { needle })
      return needle === undefined ? readerCopy('toolSearchContent', 'Search content') : readerCopy('toolSearchNamed', 'Search {needle}', { needle })
    }
    case 'web': {
      const query = clip(info.target, 30)
      if (info.name === 'web_search') return query === undefined ? readerCopy('toolSearchWeb', 'Search the web') : readerCopy('toolSearchWebNamed', 'Search the web for {query}', { query })
      return query === undefined ? readerCopy('toolReadWeb', 'Read a web page') : readerCopy('toolReadWebNamed', 'Read {query}', { query })
    }
    case 'code':
    case 'other': {
      // A schema-less tool says what it does in an argument: the model's own
      // description first, then the first meaningful line of the code it ran.
      if (said !== undefined) return said
      const code = argText(args, ['code', 'source', 'script'])
      const line = code?.split('\n').map(part => part.trim()).find(part => part !== '' && !/^[)\]}]/.test(part) && !/^(\/\/|\*|\/\*|#)/.test(part))
      if (line !== undefined) return clip(line, 44) ?? readerCopy('toolRunCode', 'Run code')
      return clip(info.title, 32) ?? readerCopy('toolUnnamed', 'Tool call')
    }
  }
}

/** The turn's steps as the reader sees them: user rows, folds and open steps. `held` keeps every step open (a live selection). */
export function presentLiveTurn(steps: readonly LiveStep[], boundary: TurnBoundary, held = false): LiveTurnItem[] {
  const live = liveFoldEnabled(boundary) && !held
  const items: LiveTurnItem[] = []
  let chain: LiveStep[] = []
  const flush = () => {
    if (chain.length === 0) return
    const { fold, open } = live ? splitChain(chain) : { fold: null, open: chain }
    if (fold !== null && fold.length > 0) items.push({ kind: 'fold', key: `live-fold:${chain[0]!.key}`, steps: fold, summary: foldSummary(fold) })
    for (const step of open) items.push({ kind: 'open', key: step.key, step })
    chain = []
  }
  for (const step of steps) {
    if (step.kind !== 'user') {
      chain.push(step)
      continue
    }
    flush()
    items.push({ kind: 'user', key: step.key, step })
  }
  flush()
  return items
}
