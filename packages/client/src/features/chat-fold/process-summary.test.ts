import { expect, test } from 'vitest'
import { countProcessItems, summaryForm, summaryParts, summarySeparator, summaryText } from './process-summary'

/** A group body as the host renders it: one flow row per item, a tool row holding its own inner rows. */
function content(rows: string) {
  const element = document.createElement('div')
  element.innerHTML = rows
  return element
}

test('a body counts its own rows: thoughts and outputs by their part, tool calls, and everything else as records', () => {
  const body = content(
    '<div data-chat-flow-kind="assistant-step" data-chat-group-part="reasoning"></div>' +
    '<div data-chat-flow-kind="tool-call"><div data-chat-flow-kind="tool-call"></div></div>' +
    '<div data-chat-flow-kind="assistant-step" data-chat-group-part="reasoning"></div>' +
    '<div data-chat-flow-kind="assistant-step" data-chat-group-part="response"></div>' +
    '<div data-chat-flow-kind="command"></div>' +
    '<div class="not-a-row"></div>',
  )
  expect(countProcessItems(body)).toEqual({ thinking: 2, output: 1, tool: 1, record: 1 })
})

test('the figures read in order and the empty ones are left out', () => {
  const sentence = summaryParts({ thinking: 2, output: 0, tool: 3, record: 0 }, 'full')
  expect(sentence.map(part => part.figure)).toEqual(['thinking', 'tool'])
  expect(summaryText(sentence, 'full')).toBe('2 thoughts, 3 tool calls')
  expect(summaryText(summaryParts({ thinking: 2, output: 0, tool: 3, record: 0 }, 'compact'), 'compact')).toBe('Thinking×2 · Tools×3')
})

test('a count of one reads in the singular', () => {
  expect(summaryText(summaryParts({ thinking: 1, output: 1, tool: 1, record: 1 }, 'full'), 'full'))
    .toBe('1 thought, 1 output, 1 tool call, 1 record')
  expect(summarySeparator('full')).toBe(', ')
})

test('a group with nothing counted has no summary', () => {
  expect(summaryParts({ thinking: 0, output: 0, tool: 0, record: 0 }, 'full')).toEqual([])
})

test('the sentence stands while it fits, the compact figures take over when it does not', () => {
  expect(summaryForm(120, 200)).toBe('full')
  expect(summaryForm(200, 200)).toBe('full')
  expect(summaryForm(201, 200)).toBe('compact')
})
