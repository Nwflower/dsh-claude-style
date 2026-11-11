/**
 * A session that is running stands at the head of its list, waiting rows behind
 * it, each partition keeping the order it came in; a list already standing that
 * way is left untouched.
 *
 * @capability active-first
 * @features active-first
 * @risk A session works quietly in the middle of the list while the reader reads an older conversation, and the row he wants is the one he has to hunt for.
 */
import { expect, test } from 'vitest'
import { SESSION_ONGOING_STATE, SESSION_ONGOING_SELECTOR, SESSION_PHASE_ATTRIBUTE, SESSION_ROW_KEY_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { installActiveFirst } from '@dsh-claude-style/client/pure'
import { cleanupWith, frames } from '../../fixtures/teardown'


function installed() {
  const stop = installActiveFirst()
  cleanupWith(stop)
  return stop
}

interface Seat {
  id: string
  running?: boolean
}

/** A sidebar list of session rows, in the host's own naming. */
function sessionList(seats: Seat[]) {
  const list = document.createElement('div')
  list.setAttribute('role', 'tree')
  document.body.append(list)
  const rows = new Map<string, HTMLElement>()
  for (const seat of seats) {
    const row = document.createElement('div')
    row.setAttribute(SESSION_ROW_KEY_ATTRIBUTE, `session:${seat.id}`)
    if (seat.running === true) row.append(phaseDot())
    // The host draws a row inside a box of its own, one child per box: the box
    // is the row's seat in the list, and the seats are what the list reorders.
    const box = document.createElement('span')
    box.append(row)
    list.append(box)
    rows.set(seat.id, row)
  }
  return { list, rows }
}

/** The dot the host draws in a row whose session is running. */
function phaseDot() {
  const dot = document.createElement('span')
  dot.setAttribute(SESSION_PHASE_ATTRIBUTE, SESSION_ONGOING_STATE)
  return dot
}

/** The seats a reader sees, in order. */
function order(list: Element) {
  // The seat's name is read through the contract's own key attribute, never a
  // host attribute spelled here.
  return [...list.querySelectorAll<HTMLElement>(`[${SESSION_ROW_KEY_ATTRIBUTE}]`)].map(row => {
    const key = row.getAttribute(SESSION_ROW_KEY_ATTRIBUTE) ?? ''
    return key.startsWith('session:') ? key.slice('session:'.length) : key
  })
}

test('a running session stands at the head of its list', async () => {
  const { list } = sessionList([{ id: 'a' }, { id: 'b', running: true }, { id: 'c' }])
  installed()
  await frames(2)
  expect(order(list)).toEqual(['b', 'a', 'c'])
})

test('two running sessions keep their own order, ahead of the waiting ones', async () => {
  const { list } = sessionList([{ id: 'a' }, { id: 'b', running: true }, { id: 'c' }, { id: 'd', running: true }])
  installed()
  await frames(2)
  expect(order(list)).toEqual(['b', 'd', 'a', 'c'])
})

test('a list already standing that way is not touched', async () => {
  const { list } = sessionList([{ id: 'a', running: true }, { id: 'b' }])
  installed()
  const moved: MutationRecord[] = []
  const observer = new MutationObserver(records => moved.push(...records))
  observer.observe(list, { childList: true })
  await frames(3)
  observer.disconnect()
  expect(moved).toHaveLength(0)
  expect(order(list)).toEqual(['a', 'b'])
})

test('a session that starts running later takes the head of the list', async () => {
  const { list, rows } = sessionList([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
  installed()
  await frames(2)
  expect(order(list)).toEqual(['a', 'b', 'c'])
  rows.get('c')?.append(phaseDot())
  await frames(3)
  expect(order(list)).toEqual(['c', 'a', 'b'])
})

test('the teardown leaves the rows where they stand', async () => {
  const { list, rows } = sessionList([{ id: 'a' }, { id: 'b' }])
  const stop = installed()
  await frames(2)
  expect(order(list)).toEqual(['a', 'b'])
  rows.get('b')?.append(phaseDot())
  await frames(3)
  expect(order(list)).toEqual(['b', 'a'])
  stop()
  rows.get('b')?.querySelector(SESSION_ONGOING_SELECTOR)?.remove()
  await frames(2)
  expect(order(list)).toEqual(['b', 'a'])
})

test('non-session headers in a shared flat list bound each workspace and group segment', async () => {
  const list = document.createElement('div')
  list.setAttribute('role', 'tree')
  document.body.append(list)
  const addHeader = (name: string) => {
    const header = document.createElement('div')
    header.setAttribute('data-test-header', name)
    list.append(header)
  }
  const rows = new Map<string, HTMLElement>()
  const boxes = new Map<string, HTMLElement>()
  const addSeat = (id: string, running = false) => {
    const row = document.createElement('div')
    row.setAttribute(SESSION_ROW_KEY_ATTRIBUTE, `session:${id}`)
    if (running) row.append(phaseDot())
    // The host draws every row inside a box of its own: the box is the seat.
    const box = document.createElement('span')
    box.append(row)
    list.append(box)
    boxes.set(id, box)
    rows.set(id, row)
  }
  // Workspace A has an idle session; Workspace B has two groups with running
  // sessions; workspace C starts with the running row already at its head.
  addHeader('ws-a')
  addSeat('a-idle')
  addHeader('ws-b')
  addSeat('b-idle')
  addSeat('b-running', true)
  addHeader('ws-b-pinned')
  addSeat('p-idle')
  addSeat('p-running', true)
  addHeader('ws-c')
  addSeat('c-running', true)
  addSeat('c-idle')

  installed()
  await frames(2)

  const sequence = [...list.children].map((child) => {
    const header = child.getAttribute('data-test-header')
    if (header !== null) return header
    const row = child.querySelector(`[${SESSION_ROW_KEY_ATTRIBUTE}]`)
    return row?.getAttribute(SESSION_ROW_KEY_ATTRIBUTE) ?? '?'
  })
  expect(sequence).toEqual([
    'ws-a',
    'session:a-idle',
    'ws-b',
    'session:b-running',
    'session:b-idle',
    'ws-b-pinned',
    'session:p-running',
    'session:p-idle',
    'ws-c',
    'session:c-running',
    'session:c-idle',
  ])
  // No running seat ever crossed a workspace header: it stays inside the boxes
  // that stand between two headers.
  expect(boxes.get('b-running')!.nextElementSibling).toBe(boxes.get('b-idle'))
  expect(boxes.get('p-running')!.nextElementSibling).toBe(boxes.get('p-idle'))

  // A continuous state flip stays inside its own segment.
  rows.get('b-idle')?.append(phaseDot())
  rows.get('b-running')?.querySelector(SESSION_ONGOING_SELECTOR)?.remove()
  await frames(3)
  expect(order(list)).toEqual(['a-idle', 'b-idle', 'b-running', 'p-running', 'p-idle', 'c-running', 'c-idle'])
})
