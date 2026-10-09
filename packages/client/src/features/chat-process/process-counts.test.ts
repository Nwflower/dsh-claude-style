import { expect, test } from 'vitest'
import { countsLine, EMPTY_TALLY, rollTally, segmentProcess, tallyProcess } from './process-counts'

/** A member row holding one reasoning block, the way the host renders one. */
function thinkRow(text = '想一下'): HTMLElement {
  const row = document.createElement('div')
  row.setAttribute('data-turn-process-member', '')
  row.setAttribute('data-chat-flow-kind', 'assistant-step')
  row.setAttribute('data-chat-group-part', 'reasoning')
  row.innerHTML = `<div data-variant="think" data-state="ok"><span>${text}</span></div>`
  return row
}

/** A member row holding one root tool call, with `nested` subcalls inside it. */
function toolRow(callId: string, nested = 0): HTMLElement {
  const row = document.createElement('div')
  row.setAttribute('data-turn-process-member', '')
  row.setAttribute('data-chat-flow-kind', 'tool-call')
  const call = document.createElement('div')
  call.setAttribute('data-chat-call-id', callId)
  row.append(call)
  for (let at = 0; at < nested; at += 1) {
    const sub = document.createElement('div')
    sub.setAttribute('data-chat-call-id', `${callId}-sub${at}`)
    call.append(sub)
  }
  return row
}

/** A member row holding neither: an intermediate answer or another process record. */
function recordRow(kind = 'assistant-step'): HTMLElement {
  const row = document.createElement('div')
  row.setAttribute('data-turn-process-member', '')
  row.setAttribute('data-chat-flow-kind', kind)
  row.textContent = '先记一句中间结论。'
  return row
}

/** One step's formal output: the host's response row of an assistant step. */
function responseRow(key: string): HTMLElement {
  const row = document.createElement('div')
  row.setAttribute('data-turn-process-member', '')
  row.setAttribute('data-chat-flow-kind', 'assistant-step')
  row.setAttribute('data-chat-group-part', 'response')
  row.setAttribute('data-chat-flow-key', key)
  row.textContent = '这是那一步的输出。'
  return row
}

test('a turn tallies one thinking row per reasoning block, one tool row per root call, and one record for the rest', () => {
  const rows = [thinkRow(), toolRow('a'), toolRow('b', 2), recordRow(), recordRow('context')]
  expect(tallyProcess(rows)).toEqual({ thinking: 1, tool: 2, record: 2 })
})

test('a subcall is not an item of the list', () => {
  expect(tallyProcess([toolRow('a', 3)])).toEqual({ thinking: 0, tool: 1, record: 0 })
})

test('a row that is itself the call row counts once', () => {
  const row = document.createElement('div')
  row.setAttribute('data-chat-call-id', 'solo')
  expect(tallyProcess([row])).toEqual({ thinking: 0, tool: 1, record: 0 })
})

test('an empty process tallies nothing and writes no counts line', () => {
  expect(tallyProcess([])).toEqual(EMPTY_TALLY)
  expect(countsLine(EMPTY_TALLY)).toBe('')
})

test('the counts line names only the kinds the turn has, joined for the host label', () => {
  expect(countsLine({ thinking: 2, tool: 0, record: 0 })).toBe(' · 思考×2')
  expect(countsLine({ thinking: 0, tool: 1, record: 3 })).toBe(' · 工具×1 · 记录×3')
  expect(countsLine({ thinking: 1, tool: 2, record: 3 })).toBe(' · 思考×1 · 工具×2 · 记录×3')
})

test('a roll walks every figure from the old total to the new one and lands exactly', () => {
  const from = { thinking: 1, tool: 4, record: 0 }
  const to = { thinking: 3, tool: 6, record: 2 }
  expect(rollTally(from, to, 0)).toEqual(from)
  expect(rollTally(from, to, 1)).toEqual(to)
  expect(rollTally(from, to, 0.5)).toEqual({ thinking: 2, tool: 5, record: 1 })
  // A figure the turn had none of arrives from zero rather than from nowhere.
  expect(rollTally(from, to, 0.5).record).toBe(1)
  // Out-of-range shares are clamped, so a late frame cannot overshoot the total.
  expect(rollTally(from, to, 1.4)).toEqual(to)
  expect(rollTally(from, to, -0.2)).toEqual(from)
})

test('a turn with two formal outputs splits into segments at the response rows', () => {
  const first = responseRow('step1:response')
  const second = responseRow('step2:response')
  const rows = [thinkRow(), toolRow('a'), first, thinkRow(), toolRow('b'), recordRow(), second, thinkRow()]
  const segments = segmentProcess(rows)
  expect(segments.length).toBe(3)
  expect(segments[0]!.key).toBe('step1:response')
  expect(segments[0]!.rows).toHaveLength(2)
  expect(segments[0]!.response).toBe(first)
  expect(segments[0]!.tally).toEqual({ thinking: 1, tool: 1, record: 0 })
  expect(segments[1]!.key).toBe('step2:response')
  expect(segments[1]!.rows).toHaveLength(3)
  expect(segments[1]!.tally).toEqual({ thinking: 1, tool: 1, record: 1 })
  // The rows past the last formal output are the open segment, still being written.
  expect(segments[2]!.response).toBeNull()
  expect(segments[2]!.rows).toHaveLength(1)
})

test('the rows before one formal output are one segment, the output itself its boundary', () => {
  const only = responseRow('step1:response')
  const segments = segmentProcess([thinkRow(), toolRow('a'), only])
  expect(segments.length).toBe(1)
  expect(segments[0]!.rows).toHaveLength(2)
  expect(segments[0]!.response).toBe(only)
  expect(segments[0]!.tally).toEqual({ thinking: 1, tool: 1, record: 0 })
})

test('a turn with no formal output yet is one open segment', () => {
  const segments = segmentProcess([thinkRow(), toolRow('a')])
  expect(segments.length).toBe(1)
  expect(segments[0]!.response).toBeNull()
  expect(segments[0]!.tally).toEqual({ thinking: 1, tool: 1, record: 0 })
})
