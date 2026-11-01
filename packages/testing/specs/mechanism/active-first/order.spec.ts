/**
 * A session that is running stands at the head of the list it belongs to, the
 * waiting rows behind it: each partition keeps the order it came in, and a list
 * already standing that way is left untouched.
 *
 * @capability active-first
 * @features active-first
 * @risk A session works quietly in the middle of the list while the reader reads an older conversation, and the row he wants is the one he has to hunt for.
 */
import { afterEach, expect, test } from 'vitest'
import { SESSION_ONGOING_STATE, SESSION_ONGOING_SELECTOR, SESSION_PHASE_ATTRIBUTE, SESSION_ROW_KEY_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { installActiveFirst } from '@dsh-claude-style/client/pure'

/** Every teardown a case registered. */
const cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  document.body.replaceChildren()
})

/** Wait for the browser to run `count` frames. */
async function frames(count: number) {
  for (let at = 0; at < count; at += 1) await new Promise(resolve => requestAnimationFrame(resolve))
}

function installed() {
  const stop = installActiveFirst()
  cleanups.push(stop)
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
    row.dataset.seat = seat.id
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
  return [...list.querySelectorAll<HTMLElement>('[data-seat]')].map(row => row.dataset.seat ?? '')
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
