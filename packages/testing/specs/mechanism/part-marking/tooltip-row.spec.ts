/**
 * The hold that keeps a row holding a non-portal tooltip out of the off-screen
 * rule (features/row-skip/row-skip.css): the host's message actions mount their
 * bubble inside the row, where a skipped row is both the fixed bubble's
 * containing block and its crop, so the row keeps its layout while one stands
 * under it and returns to the skip once the bubble is gone.
 *
 * @capability part-marking
 * @features engine
 * @risk Hovering a message's copy or branch action draws no tooltip at all, or draws it offset from the button: the row under it is skipped, so the fixed bubble's viewport coordinates are read as row coordinates and its paint is clipped at the row's edge.
 */
import { expect, test } from 'vitest'
import { installParts } from '@dsh-claude-style/engine/parts'
import { ASSISTANT_STEP_KIND, CHAT_FLOW_SELECTOR, FLOW_KIND_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { holdRelation, holdsOf, pageCleanups, rowInFlow, settle, TEST_PARTS } from '../../fixtures/hold-mark'

const HOLD = 'tooltip-row'
const cleanups = pageCleanups()

/** One row of the chat flow, the way the host draws it. */
const row = () => {
  const element = document.createElement('div')
  element.setAttribute(FLOW_KIND_ATTRIBUTE, ASSISTANT_STEP_KIND)
  return element
}

/** The host's non-portal bubble: a fixed span with a tooltip role, mounted beside its anchor. */
const bubble = () => {
  const element = document.createElement('span')
  element.setAttribute('role', 'tooltip')
  element.style.cssText = 'position:fixed;left:8px;top:8px'
  return element
}

/**
 * The rows mounted the way the host draws them, with the marking pass installed.
 *
 * @param rows - the rows to mount, each the outer element of its own flow item.
 */
function flow(rows: Element[]) {
  rowInFlow(rows)
  cleanups.push(installParts(TEST_PARTS))
  return rows
}

test('the row holding a tooltip is marked, and its neighbour is not', () => {
  const holder = row()
  holder.append(bubble())
  const neighbour = row()
  flow([holder, neighbour])
  expect(holdsOf(holder)).toEqual([HOLD])
  expect(holdsOf(neighbour)).toBeNull()
})

test('a bubble that opens and closes moves the mark with it', async () => {
  const holder = row()
  flow([holder])
  expect(holdsOf(holder)).toBeNull()
  const tooltip = bubble()
  holder.append(tooltip)
  await settle()
  expect(holdsOf(holder)).toEqual([HOLD])
  tooltip.remove()
  await settle()
  expect(holdsOf(holder)).toBeNull()
})

test('a tooltip outside the chat area holds no row', () => {
  const outside = row()
  outside.append(bubble())
  document.body.append(outside)
  flow([])
  expect(holdsOf(outside)).toBeNull()
})

test('the relation stands inside the chat area and watches the tooltip role', () => {
  const relation = holdRelation(TEST_PARTS, HOLD)
  expect(relation.scope).toBe(CHAT_FLOW_SELECTOR)
  expect(relation.held).toContain('[role="tooltip"]')
  expect(relation.attributes).toEqual(['role'])
})
