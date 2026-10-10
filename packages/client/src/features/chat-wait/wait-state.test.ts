import { expect, test } from 'vitest'
import type { HostChatSnapshot, HostTurn } from '@dsh-claude-style/contracts/services'
import { activityWords } from '../../shared/turn-activity'
import { openTurn, waitStart } from './wait-state'

function step(status: string, blocks: string[]) {
  const assistant = { status, blocks: blocks.map(kind => ({ kind })) }
  return { data: { get: (kind: string) => kind === 'assistant-step' ? assistant : undefined } }
}

function turn(number: number, status: string, steps: ReturnType<typeof step>[], start = 1000): HostTurn {
  return { turn: number, status, steps, start: { time: start } }
}

function snapshot(turns: HostTurn[], runningCalls: { turn: number }[] = []): HostChatSnapshot {
  return { timeline: { turns: new Map(turns.map(entry => [entry.turn, entry])), turnOrder: turns.map(entry => entry.turn) }, legacy: { runningCalls } }
}

test('no state can be read before any step, and while a started step has written nothing', () => {
  const fresh = turn(1, 'open', [])
  expect(activityWords(snapshot([fresh]), fresh)).toBeNull()
  const started = turn(1, 'open', [step('running', [])])
  expect(activityWords(snapshot([started]), started)).toBeNull()
  expect(activityWords(null, fresh)).toBeNull()
  expect(activityWords(snapshot([fresh]), undefined)).toBeNull()
})

test('the newest block says what the model is doing: thinking, drawing up a call, writing', () => {
  const thinking = turn(1, 'open', [step('running', ['reasoning'])])
  expect(activityWords(snapshot([thinking]), thinking)?.fallback).toBe('Thinking…')
  const drawing = turn(1, 'open', [step('running', ['reasoning', 'tool-call'])])
  expect(activityWords(snapshot([drawing]), drawing)?.fallback).toBe('Preparing a tool call…')
  const writing = turn(1, 'open', [step('running', ['reasoning', 'tool-call', 'text'])])
  expect(activityWords(snapshot([writing]), writing)?.fallback).toBe('Writing…')
})

test('a running tool call is its own state, and one from another turn does not count', () => {
  const tooling = turn(1, 'open', [step('settled', ['reasoning', 'tool-call'])])
  expect(activityWords(snapshot([tooling], [{ turn: 1 }]), tooling)?.fallback).toBe('Running tools…')
  expect(activityWords(snapshot([tooling], [{ turn: 2 }]), tooling)).toBeNull()
})

test('the first wait of a turn counts from its start, a later one from when it was seen', () => {
  expect(waitStart(turn(1, 'open', [], 1000), 5000)).toBe(1000)
  expect(waitStart(turn(1, 'open', [step('running', [])], 1000), 5000)).toBe(1000)
  expect(waitStart(turn(1, 'open', [step('settled', ['tool-call']), step('running', [])], 1000), 5000)).toBe(5000)
})

test('the running row speaks for the newest open turn', () => {
  const closed = turn(1, 'closed', [])
  const open = turn(2, 'open', [])
  expect(openTurn(snapshot([closed, open]))).toBe(open)
  expect(openTurn(snapshot([closed]))).toBeUndefined()
})
