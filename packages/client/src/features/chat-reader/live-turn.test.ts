import type { AssistantBlock, ToolResultNode } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { AssistantChatData, ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import { PartialArguments } from '@deepseek-ai/dsh-util-values'
import { expect, test } from 'vitest'
import { foldSummary, presentLiveTurn, readerFlow, segmentLiveTurn, splitChain } from './live-turn'
import type { LiveStep, LiveTurnItem } from './live-turn'
import type { TurnBoundary } from './projection'

const open: TurnBoundary = { status: 'open', reason: null, latestStep: 4, closingStep: null }
const completed: TurnBoundary = { status: 'closed', reason: 'completed', latestStep: 4, closingStep: 4 }

function toolResult(callId: string, name = 'bash'): ToolResultNode {
  return { kind: 'tool-result', seq: 1, time: 2, callId, name, args: PartialArguments.fromText('{"command":"ls"}'), call: { name, argsRaw: '{"command":"ls"}' }, callTime: 1, content: [], isError: false, subCalls: [] }
}

const reasoning = (id: string): LiveStep => ({ kind: 'reasoning', key: id, nodeKey: id, start: 0, blocks: [{ kind: 'reasoning', text: `思考 ${id}` }], step: 0 })
const body = (id: string): LiveStep => ({ kind: 'body', key: id, nodeKey: id, start: 1, blocks: [{ kind: 'text', text: `输出 ${id}` }], step: 0 })
const tool = (id: string): LiveStep => ({ kind: 'tool', key: id, entry: { kind: 'tool', key: id, callId: id, step: 0, order: 0, block: toolResult(id) } })
const user = (id: string): LiveStep => ({ kind: 'user', key: id, nodeKey: id })
const other = (id: string): LiveStep => ({ kind: 'other', key: id, nodeKey: id })

function kinds(items: readonly LiveTurnItem[]) {
  return items.map(item => item.kind === 'fold' ? ['fold', item.summary, item.steps.map(step => step.key)] : [item.kind, item.key])
}

function chatNode(key: string, kind: string, data: unknown, anchorSeq: number, step = 0, visibility: 'visible' | 'hidden' = 'visible'): ChatConversationViewNode {
  const location = { kind: 'step', turn: { turn: 1 }, step: { step } } as unknown as ChatConversationViewNode['location']
  return { key, id: key, kind, target: 'chat', data, anchorSeq, visibility, location }
}

test('body or tool alone never folds, even after the first thought', () => {
  expect(splitChain([reasoning('1')], 'standard').fold).toBeNull()
  expect(splitChain([reasoning('1'), body('2'), tool('3')], 'standard').fold).toBeNull()
  expect(splitChain([body('2'), tool('3')], 'standard').fold).toBeNull()
  expect(splitChain([other('ctx'), reasoning('1'), body('2')], 'standard').fold).toBeNull()
})

test('a new thought folds every earlier step of its chain into one box', () => {
  const second = splitChain([reasoning('1'), body('2'), tool('3'), reasoning('4'), tool('5')], 'standard')
  expect(second.fold?.map(step => step.key)).toEqual(['1', '2', '3'])
  expect(second.open.map(step => step.key)).toEqual(['4', '5'])
  expect(foldSummary(second.fold!)).toBe('Thinking×1 · Output×1 · Tools×1')
  const third = splitChain([reasoning('1'), body('2'), tool('3'), reasoning('4'), tool('5'), reasoning('6'), body('7')], 'standard')
  expect(third.fold?.map(step => step.key)).toEqual(['1', '2', '3', '4', '5'])
  expect(third.open.map(step => step.key)).toEqual(['6', '7'])
})

test('the fold keeps its key and its steps\' keys as it grows, and a chain has one box', () => {
  const chain = [reasoning('1'), body('2'), tool('3')]
  expect(presentLiveTurn(chain, open).map(item => item.key)).toEqual(['1', '2', '3'])
  const grown = presentLiveTurn([...chain, reasoning('4'), tool('5'), reasoning('6')], open)
  expect(grown.filter(item => item.kind === 'fold')).toHaveLength(1)
  expect(grown[0]).toMatchObject({ kind: 'fold', key: 'live-fold:1' })
  expect(grown[0]!.kind === 'fold' && grown[0]!.steps.map(step => step.key)).toEqual(['1', '2', '3', '4', '5'])
})

test('the work-details mode shapes the chain: one box, everything, or a box per intermediate output', () => {
  const chain = [reasoning('1'), tool('2'), body('3'), reasoning('4'), tool('5')]
  // Compact gathers the whole chain into one summary row.
  expect(presentLiveTurn(chain, open, false, 'compact')).toMatchObject([{ kind: 'fold', summary: 'Thinking×2 · Output×1 · Tools×2' }])
  // Standard gathers everything before the last thought.
  expect(kinds(presentLiveTurn(chain, open, false, 'standard'))).toEqual([
    ['fold', 'Thinking×1 · Output×1 · Tools×1', ['1', '2', '3']],
    ['open', '4'], ['open', '5'],
  ])
  // Detailed leaves the trailing intermediate output as a row and gathers everything before it.
  expect(kinds(presentLiveTurn(chain, open, false, 'detailed'))).toEqual([
    ['fold', 'Thinking×1 · Output×1 · Tools×1', ['1', '2', '3']],
    ['open', '4'], ['open', '5'],
  ])
  const after = presentLiveTurn([...chain, body('6')], open, false, 'detailed')
  expect(kinds(after)).toEqual([
    ['fold', 'Thinking×2 · Output×1 · Tools×2', ['1', '2', '3', '4', '5']],
    ['open', '6'],
  ])
})

test('a message from the reader mid-turn starts a new chain', () => {
  const items = presentLiveTurn([reasoning('1'), body('2'), tool('3'), user('insert'), body('4'), tool('5'), reasoning('6')], open)
  expect(kinds(items)).toEqual([
    ['open', '1'], ['open', '2'], ['open', '3'],
    ['user', 'insert'],
    ['fold', 'Output×1 · Tools×1', ['4', '5']],
    ['open', '6'],
  ])
})

test('once the turn has closed, in any way, nothing live-folds', () => {
  const steps = [reasoning('1'), body('2'), tool('3'), reasoning('4')]
  expect(presentLiveTurn(steps, completed).some(item => item.kind === 'fold')).toBe(false)
  for (const reason of ['error', 'interrupted', 'blocked', 'max-tokens']) {
    expect(presentLiveTurn(steps, { ...completed, reason }).some(item => item.kind === 'fold')).toBe(false)
  }
})

test('a call the step names stands between that step\'s text; empty thinking invents no step', () => {
  const blocks: AssistantBlock[] = [
    { kind: 'reasoning', text: '第一段思考' },
    { kind: 'reasoning', text: '同一思考步骤' },
    { kind: 'text', text: '中途说明' },
    { kind: 'tool-call', callId: 'c1', name: 'bash', argsRaw: '{"command":"ls"}' },
    { kind: 'reasoning', text: '   ' },
    { kind: 'text', text: '调用之后' },
  ]
  const data: AssistantChatData = { status: 'running', turn: 1, step: 0, blocks, time: 1 }
  // The tool node's anchor comes before the step's: its place is still the step's block order.
  const nodes = new Map([
    ['t', chatNode('t', 'tool-call', { root: toolResult('c1') }, 5)],
    ['a', chatNode('a', 'assistant-step', data, 10)],
  ])
  const flow = readerFlow({ key: 'turn:1', turn: 1, keys: ['t', 'a'] }, key => nodes.get(key))
  const steps = segmentLiveTurn(flow, key => nodes.get(key))
  expect(steps.map(step => step.kind)).toEqual(['reasoning', 'body', 'tool', 'body'])
  expect(steps[0]!.kind === 'reasoning' && steps[0]!.blocks).toHaveLength(2)
})

test('the host\'s own process control and turn tail are no steps of the turn', () => {
  const data: AssistantChatData = { status: 'settled', turn: 1, step: 0, blocks: [{ kind: 'text', text: '答案' }], time: 1 }
  const nodes = new Map([
    ['p', chatNode('p', 'turn-process', {}, 4)],
    ['a', chatNode('a', 'assistant-step', data, 5)],
    ['tail', chatNode('tail', 'turn-tail', {}, 6)],
  ])
  const flow = readerFlow({ key: 'turn:1', turn: 1, keys: ['p', 'a', 'tail'] }, key => nodes.get(key))
  expect(segmentLiveTurn(flow, key => nodes.get(key)).map(step => step.key)).toEqual(['a:body:0'])
})

test('a call no visible step names keeps its own place', () => {
  const data: AssistantChatData = { status: 'running', turn: 1, step: 0, blocks: [{ kind: 'tool-call', callId: 'c1', name: 'bash', argsRaw: '{}' }], time: 1 }
  const nodes = new Map([
    ['a', chatNode('a', 'assistant-step', data, 5, 0, 'hidden')],
    ['t', chatNode('t', 'tool-call', { root: toolResult('c1') }, 6)],
  ])
  const flow = readerFlow({ key: 'turn:1', turn: 1, keys: ['a', 't'] }, key => nodes.get(key))
  expect(segmentLiveTurn(flow, key => nodes.get(key)).map(step => step.key)).toEqual(['reader-tool:c1'])
})

test('steering in the flow starts a new chain, as a reader message does', () => {  const first: AssistantChatData = { status: 'settled', turn: 1, step: 0, blocks: [{ kind: 'reasoning', text: '先想' }, { kind: 'text', text: '先说' }], time: 1 }
  const second: AssistantChatData = { status: 'running', turn: 1, step: 1, blocks: [{ kind: 'reasoning', text: '插入后再想' }], time: 2 }
  const nodes = new Map([
    ['a', chatNode('a', 'assistant-step', first, 10)],
    ['steer', chatNode('steer', 'steering', {}, 15)],
    ['b', chatNode('b', 'assistant-step', second, 20, 1)],
  ])
  const flow = readerFlow({ key: 'turn:1', turn: 1, keys: ['a', 'steer', 'b'] }, key => nodes.get(key))
  expect(kinds(presentLiveTurn(segmentLiveTurn(flow, key => nodes.get(key)), open, false, 'standard'))).toEqual([
    ['open', 'a:reasoning:0'], ['open', 'a:body:1'],
    ['user', 'steer'],
    ['open', 'b:reasoning:0'],
  ])
})
