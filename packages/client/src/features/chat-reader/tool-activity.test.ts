import type { RunningToolCall, ToolCallBlock, ToolResultNode } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { PartialArguments } from '@deepseek-ai/dsh-util-values'
import { expect, test } from 'vitest'
import { activityPhase, activitySummary, callDiffHunks, callStartTime, preparingLabel } from './tool-activity'

function result(name: string, args: object, fields: Partial<ToolResultNode> = {}): ToolResultNode {
  const argsRaw = JSON.stringify(args)
  return {
    kind: 'tool-result', seq: 1, time: 2, callId: `${name}-call`, name, args: PartialArguments.fromText(argsRaw),
    call: { name, argsRaw }, callTime: 1, content: [], isError: false, subCalls: [], ...fields,
  }
}

function running(name: string, argsText: string, phase: 'preparing' | 'start' = 'preparing'): RunningToolCall {
  const args = new PartialArguments()
  args.append(argsText)
  const head = { callId: `${name}-running`, name, turn: 1, step: 0, time: 5, subCalls: [], args }
  return phase === 'preparing' ? { ...head, phase } : { ...head, phase, argsRaw: argsText }
}

test('a result of the 0.2.0 line, which keeps only the raw text, reads its arguments the same way', () => {
  const { args: _args, name: _name, ...rest } = result('write', { file_path: 'src/view.ts', content: 'one\ntwo\n' })
  const block = rest as unknown as ToolResultNode
  expect(activitySummary(block).target).toBe('src/view.ts')
  expect(activitySummary(block).title).toBe('Write view.ts')
  expect(callDiffHunks(block)).toEqual([{ path: 'src/view.ts', oldText: null, newText: 'one\ntwo\n' }])
})

test('the result metadata wins over the arguments', () => {
  const block = result('write', { path: 'a.ts', content: 'ignored' }, { meta: { diffs: [{ path: 'a.ts', oldText: 'old\n', newText: 'new\nline\n' }] } })
  expect(callDiffHunks(block)).toEqual([{ path: 'a.ts', oldText: 'old\n', newText: 'new\nline\n' }])
})

test('a content field on a tool that writes no file counts nothing', () => {
  expect(callDiffHunks(result('memory_note', { path: 'notes', content: 'a\nb\nc' }))).toEqual([])
})

test('a write or an edit falls back to its own arguments, and a parent owns what its children changed', () => {
  expect(callDiffHunks(result('write', { path: 'src/a.ts', content: 'one\ntwo\n' }))).toEqual([{ path: 'src/a.ts', oldText: null, newText: 'one\ntwo\n' }])
  const child = result('edit', { path: 'nested.ts', old_string: 'a\n', new_string: 'b\nc\n' })
  const parent = result('run_code', {}, { subCalls: [child] })
  expect(callDiffHunks(parent)).toEqual([{ path: 'nested.ts', oldText: 'a\n', newText: 'b\nc\n' }])
})

test('a call still streaming its arguments already names its target', () => {
  const block = running('write', '{"file_path":"/work/view.html","content":"<html>\\n')
  expect(activityPhase(block)).toBe('preparing')
  const summary = activitySummary(block)
  expect(summary.title).toBe('Write view.html')
  expect(summary.target).toBe('/work/view.html')
  expect(preparingLabel(summary.name)).toBe('Writing the file content')
})

test('a cancelled call is interrupted, a nonzero exit or a failed child is a failure', () => {
  const cancelled = result('bash', { command: 'sleep 9' }, { isError: true, error: { name: 'AbortError', code: 'ABORTED' } })
  expect(activityPhase(cancelled)).toBe('interrupted')
  expect(activityPhase(result('bash', {}, { meta: { exitCode: 7 } }))).toBe('failed')
  expect(activityPhase(result('bash', {}, { meta: { exitCode: 0 } }))).toBe('succeeded')
  expect(activityPhase(result('bash', {}, { content: [{ type: 'text', text: 'out\n[exit code: 2]' }] }))).toBe('failed')
  expect(activityPhase(result('read', {}))).toBe('returned')
  const failedChild: ToolCallBlock = result('bash', {}, { isError: true })
  expect(activityPhase(result('run_code', {}, { subCalls: [failedChild] }))).toBe('failed')
})

test('an unfinished call of a closed turn was interrupted', () => {
  expect(activityPhase(running('bash', '{"command":"ls"}', 'start'))).toBe('running')
  expect(activityPhase(running('bash', '{"command":"ls"}', 'start'), true)).toBe('interrupted')
})

test('the clock counts from the stamped start; a result whose call left the window has none', () => {
  expect(callStartTime(running('bash', '{}', 'start'))).toBe(5)
  expect(callStartTime(result('bash', {}, { callTime: 1000 }))).toBe(1000)
  expect(callStartTime(result('bash', {}, { callTime: null }))).toBeNull()
})
