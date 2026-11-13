/**
 * Sidebar seats move to their target order with the fewest DOM moves, while
 * non-session children stay as hard boundaries.
 *
 * @capability sidebar-order
 * @features date-groups, active-first
 * @risk A local swap moves the whole list, a host redraw loses row identity, a running row crosses a section, or equal timestamps reverse the host's order.
 */
import { afterEach, expect, test } from 'vitest'
import { moveElementsIntoOrder, orderDateSeats, sessionSeatSegments } from '@dsh-claude-style/client/pure'
import { frames } from '../../fixtures/teardown'

afterEach(() => document.body.replaceChildren())

function seat(id: string) {
  const element = document.createElement('div')
  element.id = id
  element.className = 'seat'
  element.tabIndex = 0
  element.style.height = '24px'
  return element
}

function ids(elements: ArrayLike<Element>) {
  return Array.from(elements, element => element instanceof HTMLElement ? element.id : '')
}

function mounted(names: string[]) {
  const list = document.createElement('div')
  const seats = new Map(names.map(name => [name, seat(name)]))
  list.append(...seats.values())
  document.body.append(list)
  return { list, seats }
}

async function addedParents(target: Element) {
  const records: MutationRecord[] = []
  const observer = new MutationObserver(found => records.push(...found))
  observer.observe(target, { childList: true })
  return async () => {
    await frames(1)
    observer.disconnect()
    return records.flatMap(record => ids(record.addedNodes as unknown as ArrayLike<Element>))
  }
}

test('a standing list and an unchanged target write nothing', async () => {
  const { list, seats } = mounted(['a', 'b'])
  const a = seats.get('a')!
  const b = seats.get('b')!
  const settle = await addedParents(list)
  expect(moveElementsIntoOrder([a, b])).toBe(0)
  expect(await settle()).toEqual([])
})

test('one local swap moves one seat and preserves every row node', async () => {
  const { list, seats } = mounted(['a', 'b', 'c'])
  const a = seats.get('a')!, b = seats.get('b')!, c = seats.get('c')!
  const before = new Set(list.children)
  list.style.cssText = 'height:40px;overflow:auto'
  c.focus()
  const scrollTop = list.scrollTop
  const settle = await addedParents(list)
  expect(moveElementsIntoOrder([b, a, c])).toBe(1)
  expect(ids(list.children)).toEqual(['b', 'a', 'c'])
  expect([...list.children].every(child => before.has(child))).toBe(true)
  expect(document.activeElement).toBe(c)
  expect(list.scrollTop).toBe(scrollTop)
  expect(await settle()).toEqual(['b'])
})

test('running seats move ahead without disturbing the waiting run', async () => {
  const { list, seats } = mounted(['a', 'b', 'c', 'd'])
  const a = seats.get('a')!
  const b = seats.get('b')!
  const c = seats.get('c')!
  const d = seats.get('d')!
  const settle = await addedParents(list)
  expect(moveElementsIntoOrder([b, d, a, c])).toBe(2)
  expect(ids(list.children)).toEqual(['b', 'd', 'a', 'c'])
  expect(await settle()).toEqual(['b', 'd'])
})

test('non-session children split hard boundaries while owned headings can be crossed', () => {
  const list = document.createElement('div')
  const placeholder = document.createElement('div')
  placeholder.textContent = 'new session'
  const a = seat('a')
  const heading = document.createElement('div')
  heading.className = 'date-heading'
  const b = seat('b')
  const divider = document.createElement('div')
  divider.className = 'divider'
  const c = seat('c')
  const d = seat('d')
  list.append(placeholder, a, heading, b, divider, c, d)
  const bySeat = new Map([a, b, c, d].map(element => [element, element.id]))
  expect(sessionSeatSegments(list, bySeat, child => child.classList.contains('date-heading')))
    .toEqual([['a', 'b'], ['c', 'd']])
  moveElementsIntoOrder([b, a])
  expect(ids(Array.from(list.children).filter(child => child.classList.contains('seat')))).toEqual(['b', 'a', 'c', 'd'])
  expect(placeholder.nextElementSibling).toBe(b)
  expect(divider.nextElementSibling).toBe(c)
})

test('a host redraw replaces one row and leaves the surviving rows in place', () => {
  const { list, seats } = mounted(['a', 'b', 'c'])
  const a = seats.get('a')!, b = seats.get('b')!, c = seats.get('c')!
  const replacement = seat('b2')
  b.replaceWith(replacement)
  list.append(replacement)
  expect(moveElementsIntoOrder([a, replacement, c])).toBe(1)
  expect(ids(list.children)).toEqual(['a', 'b2', 'c'])
  expect(list.children[0]).toBe(a)
  expect(list.children[2]).toBe(c)
})

test('equal update times keep the host order', () => {
  const first = { id: 'first', day: 0, updatedAt: 20 }
  const second = { id: 'second', day: 0, updatedAt: 20 }
  const newest = { id: 'newest', day: 0, updatedAt: 30 }
  expect(orderDateSeats([first, second, newest])).toEqual([newest, first, second])
})
