import { expect, test } from 'vitest'
import { STEP_DISPLAY_DEFAULT, stepDisplayModeOf } from './step-display'

/** One `describe()` answer as the settings service wraps it. */
function answer(namespaces: readonly { ns: string, value?: unknown }[]) {
  return { ok: true, value: { writable: true, hasDocument: true, namespaces } }
}

test('the host\'s work-details mode is read out of the settings answer', () => {
  expect(stepDisplayModeOf(answer([{ ns: 'llm-deepseek', value: {} }, { ns: 'ui-chat', value: { transcriptView: 'compact' } }]))).toBe('compact')
  expect(stepDisplayModeOf(answer([{ ns: 'ui-chat', value: { transcriptView: 'verbose' } }]))).toBe('verbose')
})

test('a namespace list that arrives bare or keyed is read the same way', () => {
  expect(stepDisplayModeOf([{ ns: 'ui-chat', value: { transcriptView: 'standard' } }])).toBe('standard')
  expect(stepDisplayModeOf({ value: { namespaces: { chat: { ns: 'ui-chat', value: { transcriptView: 'compact' } } } } })).toBe('compact')
})

test('a value this plugin does not know reads as the host\'s default, and no Chat namespace has no mode', () => {
  expect(stepDisplayModeOf(answer([{ ns: 'ui-chat', value: { transcriptView: 'normal' } }]))).toBe(STEP_DISPLAY_DEFAULT)
  expect(stepDisplayModeOf(answer([{ ns: 'ui-chat', value: { transcriptView: 'something-new' } }]))).toBe(STEP_DISPLAY_DEFAULT)
  expect(stepDisplayModeOf(answer([{ ns: 'ui-chat', value: {} }]))).toBe(STEP_DISPLAY_DEFAULT)
  expect(stepDisplayModeOf(answer([{ ns: 'ui-chat' }]))).toBe(STEP_DISPLAY_DEFAULT)
  expect(stepDisplayModeOf(answer([]))).toBeUndefined()
  expect(stepDisplayModeOf(undefined)).toBeUndefined()
})
