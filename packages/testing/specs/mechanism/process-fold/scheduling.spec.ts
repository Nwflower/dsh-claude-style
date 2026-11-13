/**
 * Shared automatic fold scheduling and batch-scoped host reads (D3, D12, D40).
 * @capability process-fold
 * @features chat-fold
 * @risk Disabled folds still press host controls, manual decisions are lost, or a mounted turn scans its whole column for every row.
 */
import { afterEach, expect, test, vi } from 'vitest'
import { createReasoningFold, createProcessFold } from '@dsh-claude-style/client/pure'
import { createProcessTurnReader } from '@dsh-claude-style/engine/host'
import { ASSISTANT_STEP_KIND, CHAT_FLOW_SELECTOR, CHAT_TURN_ATTRIBUTE, COMPOSER_COMPOSING_ATTRIBUTE, COMPOSER_INPUT_SELECTOR, EXPANDED_ATTRIBUTE, FLOW_KIND_ATTRIBUTE, PROCESS_ACTIVITY_SELECTOR, PROCESS_BODY_SELECTOR, PROCESS_GROUP_SELECTOR, ROW_PHASE_ATTRIBUTE, RUNNING_STATE, THINK_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { hostElement } from '../../fixtures/host-markup'
import { frames } from '../../fixtures/frames'

const stops: (() => void)[] = []
afterEach(() => {
  for (const stop of stops.splice(0)) stop()
  document.body.replaceChildren()
})

function thinking() {
  const row = hostElement(THINK_ROW_SELECTOR)
  row.setAttribute(ROW_PHASE_ATTRIBUTE, RUNNING_STATE)
  const button = document.createElement('button')
  row.append(button)
  document.body.append(row)
  return { row, button }
}

test('unloading either fold family cancels its queued automatic press', async () => {
  const { button } = thinking()
  const group = hostElement(PROCESS_GROUP_SELECTOR)
  const header = hostElement(PROCESS_ACTIVITY_SELECTOR)
  const body = hostElement(PROCESS_BODY_SELECTOR)
  group.append(header, body)
  document.body.append(group)
  let presses = 0
  button.onclick = header.onclick = () => { presses += 1 }
  createReasoningFold()()
  createProcessFold()()
  await frames(2)
  expect(presses).toBe(0)
})

test('unsuccessful presses wait for a phase change; onRows precedes the automatic press', async () => {
  const { row, button } = thinking()
  const calls: string[] = []
  button.onclick = () => { calls.push('press') }
  stops.push(createReasoningFold(() => calls.push('rows')))
  await frames(2)
  expect(calls).toEqual(['rows', 'press'])
  row.toggleAttribute(EXPANDED_ATTRIBUTE, true)
  await frames(2)
  row.toggleAttribute(EXPANDED_ATTRIBUTE, false)
  await frames(2)
  expect(calls.filter(call => call === 'press')).toHaveLength(1)
  row.setAttribute(ROW_PHASE_ATTRIBUTE, 'finished')
  row.toggleAttribute(EXPANDED_ATTRIBUTE, true)
  await frames(2)
  expect(calls.filter(call => call === 'press')).toHaveLength(2)
})

test('composition defers automatic folding until compositionend and manual choices last for their phase', async () => {
  const { row, button } = thinking()
  const input = hostElement(COMPOSER_INPUT_SELECTOR)
  input.contentEditable = 'true'
  input.setAttribute(COMPOSER_COMPOSING_ATTRIBUTE, '')
  document.body.append(input)
  input.focus()
  let presses = 0
  button.onclick = () => {
    presses += 1
    row.toggleAttribute(EXPANDED_ATTRIBUTE)
  }
  stops.push(createReasoningFold())
  await frames(2)
  expect(presses).toBe(0)
  input.removeAttribute(COMPOSER_COMPOSING_ATTRIBUTE)
  input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
  await frames(2)
  expect(row.hasAttribute(EXPANDED_ATTRIBUTE)).toBe(true)
  button.click()
  await frames(2)
  expect(presses).toBe(2)
  expect(row.hasAttribute(EXPANDED_ATTRIBUTE)).toBe(false)
})

test('one reader reuses its column index; a later batch observes the host changes', () => {
  const flow = hostElement(CHAT_FLOW_SELECTOR)
  const first = hostElement(PROCESS_GROUP_SELECTOR)
  const last = hostElement(PROCESS_GROUP_SELECTOR)
  for (const group of [first, last]) group.setAttribute(CHAT_TURN_ATTRIBUTE, 'turn')
  flow.append(first, last)
  document.body.append(flow)
  // cost: D40 — bound whole-column queries when many rows share one mutation batch.
  const queries = vi.spyOn(flow, 'querySelectorAll')
  const read = createProcessTurnReader()
  const initial = read(flow)
  expect(initial.groups.get('turn')).toEqual([first, last])
  // D40: equality proves the batch reuses the same materialized query result.
  expect(read(flow)).toBe(initial)
  expect(queries).toHaveBeenCalledTimes(2)
  const answer = document.createElement('div')
  answer.setAttribute(FLOW_KIND_ATTRIBUTE, ASSISTANT_STEP_KIND)
  answer.setAttribute(CHAT_TURN_ATTRIBUTE, 'turn')
  flow.append(answer)
  expect(createProcessTurnReader()(flow).answered.has('turn')).toBe(true)
  queries.mockRestore()
})

test('a detached row is skipped and a successful thinking press belongs to its phase', async () => {
  const removed = thinking()
  const current = thinking()
  let presses = 0
  for (const { row, button } of [removed, current]) button.onclick = () => {
    presses += 1
    row.toggleAttribute(EXPANDED_ATTRIBUTE)
  }
  stops.push(createReasoningFold())
  removed.row.remove()
  await frames(2)
  expect(presses).toBe(1)
  current.row.removeAttribute(EXPANDED_ATTRIBUTE)
  await frames(2)
  expect(presses).toBe(1)
})
