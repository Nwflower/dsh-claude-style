/**
 * The process summary's teardown (D12): a summary written this frame stands in
 * its header before the measuring pass that would name it, so stopping the
 * module takes every span it wrote, not only the named ones.
 *
 * @capability process-summary
 * @features chat-fold
 * @risk Handing the page to another owner leaves the skin's count sentence in the host's process header, a theme node on a page the theme no longer owns.
 */
import { expect, test } from 'vitest'
import { createProcessSummary, PROCESS_SUMMARY_ATTR, PROCESS_SUMMARY_CLASS, PROCESS_SUMMARY_REPLACED_ATTR } from '@dsh-claude-style/client/mechanisms'
import { ASSISTANT_STEP_KIND, CHAT_GROUP_PART_ATTRIBUTE, CHAT_GROUP_PART_REASONING, FLOW_KIND_ATTRIBUTE, PROCESS_ACTIVITY_SELECTOR, PROCESS_CONTENT_SELECTOR, PROCESS_GROUP_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { hostElement } from '../../fixtures/host-markup'
import { frames } from '../../fixtures/frames'
import { moduleStops } from '../../fixtures/module-stops'

const stops = moduleStops()

function countedGroup() {
  const group = hostElement(PROCESS_GROUP_SELECTOR)
  const header = hostElement(PROCESS_ACTIVITY_SELECTOR)
  const content = hostElement(PROCESS_CONTENT_SELECTOR)
  const row = document.createElement('div')
  row.setAttribute(FLOW_KIND_ATTRIBUTE, ASSISTANT_STEP_KIND)
  row.setAttribute(CHAT_GROUP_PART_ATTRIBUTE, CHAT_GROUP_PART_REASONING)
  content.append(row)
  group.append(header, content)
  document.body.append(group)
  return { group, header }
}

test('teardown takes a summary written this frame, before its measuring pass named it', async () => {
  countedGroup()
  const summary = createProcessSummary()
  stops.push(() => summary.stop())
  // The first frame writes the sentence into a fresh span; the pass that
  // measures and names it is the next frame, which teardown here precedes.
  await frames(1)
  expect(document.querySelector(`.${PROCESS_SUMMARY_CLASS}`)).not.toBeNull()
  summary.stop()
  expect(document.querySelector(`.${PROCESS_SUMMARY_CLASS}`)).toBeNull()
  expect(document.querySelector(`[${PROCESS_SUMMARY_ATTR}]`)).toBeNull()
})

test('teardown takes the named summaries and gives the host words back', async () => {
  countedGroup()
  const summary = createProcessSummary()
  stops.push(() => summary.stop())
  await frames(3)
  expect(document.querySelector(`.${PROCESS_SUMMARY_CLASS}`)).not.toBeNull()
  summary.stop()
  expect(document.querySelector(`.${PROCESS_SUMMARY_CLASS}`)).toBeNull()
  expect(document.querySelector(`[${PROCESS_SUMMARY_REPLACED_ATTR}]`)).toBeNull()
})
