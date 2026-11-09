/**
 * The hold that keeps a row the host has folded out of the off-screen rule
 * (features/row-skip/row-skip.css): a row hiding a cell inside itself carries the
 * mark, and the row the host draws in its place does not.
 *
 * @capability part-marking
 * @features engine
 * @risk The row that hides what the host folded loses its hold, so the off-screen rule skips it, an estimated height stands where the host draws nothing, and a stretch of reasoning is drawn inside the last answer.
 */
import { expect, test } from 'vitest'
import { installParts } from '@dsh-claude-style/engine/parts'
import { ASSISTANT_STEP_KIND, CHAT_FLOW_SELECTOR, FLOW_KIND_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { holdRelation, holdsOf, pageCleanups, rowInFlow, settle, TEST_PARTS } from '../../fixtures/hold-mark'

const HOLD = 'hidden-row'
const cleanups = pageCleanups()

/** One row of the chat flow, the way the host draws it. */
const row = () => {
  const element = document.createElement('div')
  element.setAttribute(FLOW_KIND_ATTRIBUTE, ASSISTANT_STEP_KIND)
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

test('the row holding a hidden cell is marked, and its neighbour is not', () => {
  const relation = holdRelation(TEST_PARTS, HOLD)
  const holder = row()
  const cell = document.createElement('div')
  cell.setAttribute(relation.attributes[0], '')
  holder.append(cell)
  const neighbour = row()
  flow([holder, neighbour])
  expect(holdsOf(holder)).toEqual([HOLD])
  expect(holdsOf(neighbour)).toBeNull()
})

test('folding and unfolding a cell moves the mark with it', async () => {
  const relation = holdRelation(TEST_PARTS, HOLD)
  const holder = row()
  const cell = document.createElement('div')
  holder.append(cell)
  flow([holder])
  expect(holdsOf(holder)).toBeNull()
  cell.setAttribute(relation.attributes[1], 'until-found')
  await settle()
  expect(holdsOf(holder)).toEqual([HOLD])
  cell.removeAttribute(relation.attributes[1])
  await settle()
  expect(holdsOf(holder)).toBeNull()
})

test('a row holding two hidden cells is marked once, and a row outside the chat area is not', () => {
  const relation = holdRelation(TEST_PARTS, HOLD)
  const holder = row()
  for (const [name, value] of [[relation.attributes[0], ''], [relation.attributes[1], 'until-found']]) {
    const cell = document.createElement('div')
    cell.setAttribute(name, value)
    holder.append(cell)
  }
  const outside = row()
  const stray = document.createElement('div')
  stray.setAttribute(relation.attributes[1], 'until-found')
  outside.append(stray)
  document.body.append(outside)
  flow([holder])
  expect(holdsOf(holder)).toEqual([HOLD])
  expect(holdsOf(outside)).toBeNull()
})

test('the relation stands inside the chat area and watches both ways a cell hides', () => {
  const relation = holdRelation(TEST_PARTS, HOLD)
  expect(relation.scope).toBe(CHAT_FLOW_SELECTOR)
  expect(relation.attributes.length).toBe(2)
})
