/**
 * A session switch mounts its transcript in one large batch, and the marks that
 * batch needs are what the sheet draws that frame with. The marking pass therefore
 * runs in the observer's callback, before the frame is painted; a batch the bus
 * deferred would paint the host's own type first and move it a task later.
 *
 * @capability part-marking
 * @features engine
 * @risk A large batch is marked one task late: switching sessions paints the host's own line height and table widths for a frame and then reflows, which the reader sees as a jump (#178).
 */
import { expect, test } from 'vitest'
import { installParts } from '@dsh-claude-style/engine/parts'
import { CONVERSATION_SCROLL_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { partRegion } from '../../fixtures/part-region'
import { hostElement } from '../../fixtures/host-markup'
import { pageCleanups } from '../../fixtures/page'
import { PART_ATTR, TEST_PARTS } from '../../fixtures/vocabulary'

/** Two microtask turns: the observer's callback is queued before the first. */
const microtasks = () => new Promise<void>(resolve => { queueMicrotask(() => { queueMicrotask(() => { resolve() }) }) })

const cleanups = pageCleanups()
const conversation = partRegion(CONVERSATION_SCROLL_SELECTOR, TEST_PARTS)

test('a transcript mounted in one large batch carries its parts before the task ends', async () => {
  const scroller = hostElement(CONVERSATION_SCROLL_SELECTOR)
  document.body.append(scroller)
  cleanups.push(installParts(TEST_PARTS))
  // The install's own walk saw an empty scroller; everything below is one batch
  // far past the weight the bus holds back for another task.
  const blocks = Array.from({ length: 120 }, () => conversation.box('activity', document.createElement('button')))
  scroller.append(...blocks)
  await microtasks()
  expect(blocks[0].getAttribute(PART_ATTR)).toBe(conversation.part('activity'))
  expect(blocks[blocks.length - 1].getAttribute(PART_ATTR)).toBe(conversation.part('activity'))
})

test('a transcript mounted one block at a time is marked as it arrives', async () => {
  const scroller = hostElement(CONVERSATION_SCROLL_SELECTOR)
  document.body.append(scroller)
  cleanups.push(installParts(TEST_PARTS))
  const block = conversation.box('activity', document.createElement('button'))
  scroller.append(block)
  await microtasks()
  expect(block.getAttribute(PART_ATTR)).toBe(conversation.part('activity'))
})
