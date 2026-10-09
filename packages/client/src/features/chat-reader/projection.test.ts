import type { AssistantBlock, TurnLocation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { AssistantChatData, ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import { expect, test } from 'vitest'
import { assistantSegments, boundaryOf, forkAnchorSeq, groupNodes, hasProcessContent, hasVisibleBody, isEarlierNarration, processChoiceKey, processExpanded, terminalLabel } from './projection'
import type { TurnBoundary } from './projection'

const text: AssistantBlock = { kind: 'text', text: '前序说明或回答：不能靠关键词判断。' }
const assistant = (values: Partial<AssistantChatData> = {}): AssistantChatData => ({ status: 'settled', turn: 1, step: 0, blocks: [text], time: 1, ...values })
const active: TurnBoundary = { status: 'open', reason: null, latestStep: 2, closingStep: null }
const completed: TurnBoundary = { ...active, status: 'closed', reason: 'completed', closingStep: 2 }
const ENDINGS = ['error', 'aborted', 'interrupted', 'blocked', 'max-tokens', 'future-terminal']

function node(key: string, kind: string, data: unknown, location: ChatConversationViewNode['location'] = { kind: 'unresolved' }, visibility: 'visible' | 'hidden' = 'visible'): ChatConversationViewNode {
  return { key, id: key, kind, target: 'chat', data, anchorSeq: Number(key) || 0, visibility, location }
}

test('system prompts and the other record kinds belong to the process', () => {
  for (const kind of ['system-prompt', 'context', 'model-retry', 'command', 'compaction']) expect(hasProcessContent(node('1', kind, {}), completed)).toBe(true)
})

test('thinking and body keep their order, content and identity across appends', () => {
  const first: AssistantBlock = { kind: 'reasoning', text: '**原始标点**\n  原始空格\n' }
  const later: AssistantBlock = { kind: 'reasoning', text: '正文之后的思考' }
  const segments = assistantSegments([first, text, later])
  expect(segments.map(part => [part.kind, part.start])).toEqual([['reasoning', 0], ['body', 1], ['reasoning', 2]])
  expect(segments[0]!.blocks[0]).toBe(first)
  expect(assistantSegments([first, text, later, { kind: 'text', text: '最终正文' }]).slice(0, 3)).toEqual(segments)
})

test('a settled step alone is never narration before the answer', () => {
  expect(isEarlierNarration(assistant(), { ...active, latestStep: 0 })).toBe(false)
  expect(isEarlierNarration(assistant(), { ...active, status: 'unknown' })).toBe(false)
  expect(isEarlierNarration(assistant({ status: 'running' }), active)).toBe(false)
})

test('the process stays open through output and later steps until the turn completes', () => {
  expect(processExpanded(undefined, active)).toBe(true)
  expect(processExpanded(undefined, completed)).toBe(false)
  expect(processExpanded(undefined, { ...active, status: 'unknown' })).toBe(true)
  for (const reason of ENDINGS) expect(processExpanded(undefined, { ...completed, reason })).toBe(true)
})

test('the reader\'s own choice wins, and a choice made while running does not pin a completed turn open', () => {
  expect(processExpanded(true, completed)).toBe(true)
  expect(processExpanded(false, active)).toBe(false)
  const choices: Record<string, boolean> = { [processChoiceKey('turn:1', active)]: true }
  expect(processExpanded(choices[processChoiceKey('turn:1', completed)], completed)).toBe(false)
  expect(processChoiceKey('turn:1', active)).toBe(processChoiceKey('turn:1', { ...active, latestStep: 9 }))
})

test('a body-only step is the answer; real thinking and earlier narration are process', () => {
  const step = (data: AssistantChatData) => node('1', 'assistant-step', data)
  expect(hasProcessContent(step(assistant({ step: 2 })), completed)).toBe(false)
  expect(hasProcessContent(step(assistant({ step: 2, blocks: [{ kind: 'reasoning', text: '' }, text] })), completed)).toBe(false)
  expect(hasProcessContent(step(assistant({ step: 2, blocks: [{ kind: 'reasoning', text: '真实思考' }, text] })), active)).toBe(true)
  expect(hasProcessContent(step(assistant({ step: 1 })), completed)).toBe(true)
  expect(hasProcessContent({ ...step(assistant({ step: 1 })), visibility: 'hidden' }, completed)).toBe(false)
})

test('a completed turn keeps its closing message; any other ending keeps everything', () => {
  expect(isEarlierNarration(assistant({ step: 2 }), completed)).toBe(false)
  expect(isEarlierNarration(assistant({ step: 0 }), { ...completed, closingStep: 1 })).toBe(true)
  expect(isEarlierNarration(assistant(), { ...completed, closingStep: null })).toBe(false)
  for (const reason of ENDINGS) {
    expect(isEarlierNarration(assistant(), { ...completed, reason })).toBe(false)
    expect(terminalLabel(reason)).not.toBeNull()
  }
  expect(terminalLabel('completed')).toBeNull()
})

test('images and unknown blocks never fold away as process; wording is never read', () => {
  const unknown: AssistantBlock = { kind: 'other', block: { type: 'mcp-app' } }
  for (const blocks of [[unknown], [text, unknown]]) {
    expect(isEarlierNarration(assistant({ blocks }), completed)).toBe(false)
    expect(hasVisibleBody(blocks)).toBe(true)
  }
  expect(hasVisibleBody([{ kind: 'reasoning', text: 'trace' }])).toBe(false)
  for (const value of ['Final answer:', '正在处理', 'All done']) expect(isEarlierNarration(assistant({ step: 2, blocks: [{ kind: 'text', text: value }] }), completed)).toBe(false)
})

test('grouping keeps keys and order and leaves out hidden rows', () => {
  const turn = { turn: 1, status: 'open', steps: [] } as unknown as TurnLocation
  const nodes = [
    node('1', 'user', {}),
    node('2', 'assistant-step', {}, { kind: 'turn', turn }),
    node('3', 'tool-call', {}, { kind: 'turn', turn }),
    node('4', 'context', {}, { kind: 'turn', turn }, 'hidden'),
    node('5', 'custom', {}),
  ]
  const byKey = new Map(nodes.map(row => [row.key, row]))
  const groups = groupNodes(nodes.map(row => row.key), key => byKey.get(key))
  expect(groups.map(group => group.keys)).toEqual([['1'], ['2', '3'], ['5']])
  expect(groups[1]!.key).toBe('turn:1')
})

test('a missing turn stays explicitly unknown', () => {
  expect(boundaryOf(undefined)).toEqual({ status: 'unknown', reason: null, latestStep: -1, closingStep: null })
})

test('the fork anchor is the first finite seq and never invented', () => {
  expect(forkAnchorSeq([{ seq: 42 }])).toBe(42)
  expect(forkAnchorSeq([null, undefined, {}, { seq: '42' }, { seq: 7 }])).toBe(7)
  expect(forkAnchorSeq([{ seq: Number.NaN }, { seq: Number.POSITIVE_INFINITY }, { seq: 100.5 }])).toBe(100.5)
  expect(forkAnchorSeq([])).toBeUndefined()
})
