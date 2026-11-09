/**
 * The host names its one activity seat two ways: `activity` while the slot is
 * idle and `activityExpanded` while a plugin expands it. The seat reads as the
 * skin's own part in both, and its emptiness is answered by the hold around its
 * slot, so whatever a plugin mounts there keeps the seat in the row.
 *
 * @capability part-marking
 * @features engine
 * @risk While the host expands the composer's activity seat, the seat stops reading as the skin's own part, so the entry a plugin mounts in it (the microphone button a reader presses to record) loses the seat's rules and leaves the composer.
 */
import { expect, test } from 'vitest'
import { installParts } from '@dsh-claude-style/engine/parts'
import { holdRelations } from '@dsh-claude-style/engine/parts-table'
import { CONVERSATION_ACTIVITY_SLOT_SELECTOR, CONVERSATION_SCROLL_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { partRegion } from '../../fixtures/part-region'
import { hostElement } from '../../fixtures/host-markup'
import { pageCleanups } from '../../fixtures/page'
import { HOLDS_ATTR, PART_ATTR, TEST_PARTS } from '../../fixtures/vocabulary'

const settle = () => new Promise(resolve => { setTimeout(resolve, 0) })
const cleanups = pageCleanups()
const conversation = partRegion(CONVERSATION_SCROLL_SELECTOR, TEST_PARTS)

/** A hold word the relations table answers. */
function hold(name: string) {
  if (!holdRelations(TEST_PARTS).some(relation => relation.name === name)) throw new Error(`no hold relation "${name}"`)
  return name
}

const holds = (element: Element) => element.getAttribute(HOLDS_ATTR)

/** One activity seat around its own slot, the way the host renders one. */
function seatBox(local: string, ...entry: Node[]) {
  const slot = hostElement(CONVERSATION_ACTIVITY_SLOT_SELECTOR)
  slot.append(...entry)
  return conversation.box(local, slot)
}

/** Mount a composer row holding these seats on its trailing end, and start the walk. */
function mountRow(...seats: Element[]) {
  const scroller = hostElement(CONVERSATION_SCROLL_SELECTOR)
  scroller.append(conversation.box('trailing', ...seats))
  document.body.append(scroller)
  cleanups.push(installParts(TEST_PARTS))
}

test('the activity seat keeps its part while the host expands it for a plugin', () => {
  const idle = seatBox('activity', document.createElement('button'))
  const expanded = seatBox('activityExpanded', document.createElement('button'))
  mountRow(idle, expanded)
  expect(idle.getAttribute(PART_ATTR)).toBe(conversation.part('activity'))
  expect(expanded.getAttribute(PART_ATTR)).toBe(conversation.part('activityExpanded'))
  expect(holds(idle)).toBe(hold('composer-activity-filled'))
  expect(holds(expanded)).toBe(hold('composer-activity-filled'))
})

test('the seat stands down while its slot is empty and comes back with the entry a plugin mounts there', async () => {
  const seat = seatBox('activity')
  mountRow(seat)
  expect(seat.getAttribute(PART_ATTR)).toBe(conversation.part('activity'))
  expect(holds(seat)).toBeNull()

  const microphone = document.createElement('button')
  seat.querySelector(CONVERSATION_ACTIVITY_SLOT_SELECTOR)!.append(microphone)
  await settle()
  expect(holds(seat)).toBe(hold('composer-activity-filled'))

  microphone.remove()
  await settle()
  expect(holds(seat)).toBeNull()
  // An empty seat keeps its part: whether an empty seat stands down is the
  // stylesheet's answer, and it reaches the element through this mark alone.
  expect(seat.getAttribute(PART_ATTR)).toBe(conversation.part('activity'))
})

test('the host expanding the seat in place moves no mark', async () => {
  const seat = seatBox('activity', document.createElement('button'))
  const expandedName = seatBox('activityExpanded').className
  mountRow(seat)
  expect(holds(seat)).toBe(hold('composer-activity-filled'))

  seat.className = expandedName
  await settle()
  expect(seat.getAttribute(PART_ATTR)).toBe(conversation.part('activityExpanded'))
  expect(holds(seat)).toBe(hold('composer-activity-filled'))
})
