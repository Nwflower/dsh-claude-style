/**
 * A region does not read its host class names inside the separate element the
 * host mounts in its box: the composer card's overlay seat holds the `@` and `/`
 * menus, whose `_item` and `_trailing` are not the composer's row and cluster.
 *
 * @capability part-marking
 * @features engine
 * @risk With the `@` menu open, the composer's own row and cluster marks land on a menu row, so the skin measures that row as the toolbar and every measurement taken from it — the dock's line, the room the meter keeps — lands on the open menu.
 */
import { expect, test } from 'vitest'
import { installParts } from '@dsh-claude-style/engine/parts'
import { COMPOSER_OVERLAY_SELECTOR, CONVERSATION_SCROLL_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { partRegion } from '../../fixtures/part-region'
import { hostAttribute, hostElement } from '../../fixtures/host-markup'
import { pageCleanups } from '../../fixtures/page'
import { PART_ATTR, TEST_PARTS } from '../../fixtures/vocabulary'

const settle = () => new Promise(resolve => setTimeout(resolve, 0))
const cleanups = pageCleanups()
const conversation = partRegion(CONVERSATION_SCROLL_SELECTOR, TEST_PARTS)
const marksIn = (root: Element) => root.querySelectorAll(`[${PART_ATTR}]`).length
/** The page: the conversation scroller holding the card, its overlay seat and its toolbar row. */
function mountComposer(seatChildren: Node[], seat: HTMLElement = hostElement(COMPOSER_OVERLAY_SELECTOR)) {
  seat.append(...seatChildren)
  const scroller = hostElement(CONVERSATION_SCROLL_SELECTOR)
  const stack = conversation.box('composerStack')
  stack.append(conversation.box('card', seat, conversation.box('row', conversation.box('trailing'))))
  scroller.append(stack)
  document.body.append(scroller)
  return seat
}

/** The composer's own row and cluster stand where they stand, marked as themselves. */
const expectComposerMarked = () => {
  for (const local of ['row', 'trailing']) {
    const found = document.querySelector(`[${PART_ATTR}~="${conversation.part(local)}"]`)
    expect(found?.getAttribute(PART_ATTR)).toBe(conversation.part(local))
    expect(found?.closest(COMPOSER_OVERLAY_SELECTOR)).toBeNull()
  }
}

test('a menu mounted in the overlay seat before the walk plays none of the composer\'s parts', () => {
  const seat = mountComposer([conversation.box('row', conversation.box('trailing'))])
  cleanups.push(installParts(TEST_PARTS))
  expect(marksIn(seat)).toBe(0)
  expectComposerMarked()
})

test('the seat keeps the part its own class names carry, while the menu mounted in it keeps none', () => {
  const seat = conversation.box('overlayAnchor')
  seat.setAttribute(hostAttribute(COMPOSER_OVERLAY_SELECTOR), '')
  mountComposer([conversation.box('row', conversation.box('trailing'))], seat)
  cleanups.push(installParts(TEST_PARTS))
  expect(seat.getAttribute(PART_ATTR)).toBe(conversation.part('overlayAnchor'))
  expect(marksIn(seat)).toBe(0)
  expectComposerMarked()
})

test('a menu mounted into the seat after the walk plays none of the composer\'s parts', async () => {
  const seat = mountComposer([])
  cleanups.push(installParts(TEST_PARTS))
  const menu = conversation.box('row', conversation.box('trailing'))
  seat.append(menu)
  await settle()
  expect(marksIn(menu)).toBe(0)
  expectComposerMarked()
})

test('a seat the menu itself mounts stays a skipped subtree', async () => {
  const outer = mountComposer([])
  cleanups.push(installParts(TEST_PARTS))
  const inner = hostElement(COMPOSER_OVERLAY_SELECTOR)
  inner.append(conversation.box('trailing'))
  const menuRow = document.createElement('div')
  menuRow.append(inner)
  outer.append(menuRow)
  await settle()
  expect(marksIn(inner)).toBe(0)
  expectComposerMarked()
})

test('the composer keeps its own marks when the menu closes', async () => {
  const seat = mountComposer([])
  cleanups.push(installParts(TEST_PARTS))
  const menu = conversation.box('row', conversation.box('trailing'))
  seat.append(menu)
  await settle()
  menu.remove()
  await settle()
  expectComposerMarked()
})
