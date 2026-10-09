import type { ToolResultNode } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import { PartialArguments } from '@deepseek-ai/dsh-util-values'
import { expect, test } from 'vitest'
import { reasoningTarget } from './reasoning-follow'
import { handsBackToModel, waitingAnchor } from './waiting-clock'

test('a thought follows ordinary growth two lines at a time and never passes its end', () => {
  expect(reasoningTarget(0, 284, 224, 24)).toBe(48)
  expect(reasoningTarget(48, 284, 224, 24)).toBe(60)
  expect(reasoningTarget(0, 100, 224, 24)).toBe(0)
  expect(reasoningTarget(999, 284, 224, 24)).toBe(60)
})

test('a backlog is covered in one step, up to the ceiling', () => {
  expect(reasoningTarget(0, 5000, 224, 24, 10)).toBe(240)
  expect(reasoningTarget(0, 5000, 224, 24, 400)).toBe(960)
})

test('the step follows the real line height and clamps a resized viewport', () => {
  expect(reasoningTarget(28, 900, 192, 30)).toBe(88)
  expect(reasoningTarget(-50, 900, 192, 30)).toBe(60)
  expect(reasoningTarget(708, 900, 400, 30)).toBe(500)
  expect(reasoningTarget(0, 900, 192, 0)).toBe(2)
})

function node(key: string, kind: string, data: unknown): ChatConversationViewNode {
  return { key, id: key, kind, target: 'chat', data, anchorSeq: 0, visibility: 'visible', location: { kind: 'unresolved' } }
}

const settled: ToolResultNode = { kind: 'tool-result', seq: 3, time: 61000, callId: 'c1', name: 'read', args: PartialArguments.EMPTY, call: null, callTime: 60000, content: [], isError: false, subCalls: [] }
const nodes = new Map([
  ['u1', node('u1', 'user', { time: 1000 })],
  ['s1', node('s1', 'steering', { time: 301000 })],
  ['s2', node('s2', 'steering', { time: 305000 })],
  ['a1', node('a1', 'assistant-step', { time: 302000 })],
  ['ctx', node('ctx', 'context', { time: 399000 })],
  ['tr', node('tr', 'tool-call', { root: settled })],
  ['tc', node('tc', 'tool-call', { root: { phase: 'start', callId: 'c2', name: 'read', turn: 1, step: 0, time: 62000, subCalls: [], args: PartialArguments.EMPTY, argsRaw: '{}' } })],
  ['cmd', node('cmd', 'command', { time: 70000, outcome: { kind: 'success' } })],
  ['cmd-open', node('cmd-open', 'command', { time: 71000, outcome: null })],
])
const get = (key: string) => nodes.get(key)

test('a returned tool hands the move back at its result; a running one does not', () => {
  expect(handsBackToModel(get('tr')!)).toBe(true)
  expect(waitingAnchor(['u1', 's1', 'tr'], get)).toEqual({ key: 'tr', time: 61000 })
  expect(handsBackToModel(get('tc')!)).toBe(false)
  expect(waitingAnchor(['u1', 'tc'], get)).toEqual({ key: 'u1', time: 1000 })
})

test('a settled command hands over; one still running does not', () => {
  expect(waitingAnchor(['u1', 'cmd'], get)).toEqual({ key: 'cmd', time: 70000 })
  expect(waitingAnchor(['u1', 'cmd-open'], get)).toEqual({ key: 'u1', time: 1000 })
})

test('steering and context restart the wait; an assistant step does not', () => {
  expect(waitingAnchor(['u1', 's1'], get)).toEqual({ key: 's1', time: 301000 })
  expect(waitingAnchor(['u1', 's1', 's2'], get)).toEqual({ key: 's2', time: 305000 })
  expect(waitingAnchor(['u1', 's1', 'a1'], get)).toEqual({ key: 's1', time: 301000 })
  expect(waitingAnchor(['u1', 's1', 'a1', 'ctx'], get)).toEqual({ key: 'ctx', time: 399000 })
})

test('a fresh local echo restarts the wait; a queued or stale one does not', () => {
  const echo = (requestId: string, time: number, placement: 'transcript' | 'queued' | 'steering') => ({ requestId, time, placement, text: '', attachments: [] }) as never
  expect(waitingAnchor(['u1'], get, [echo('new', 301000, 'steering')])).toEqual({ key: 'pending:new', time: 301000 })
  expect(waitingAnchor(['u1', 's1'], get, [echo('q', 400000, 'queued')])).toEqual({ key: 's1', time: 301000 })
  expect(waitingAnchor(['u1', 's1'], get, [echo('old', 1000, 'transcript')])).toEqual({ key: 's1', time: 301000 })
  expect(waitingAnchor([], get)).toEqual({ key: 'unresolved', time: null })
})
