/**
 * @capability sidebar-status
 * @features sidebar-status
 * @risk Per-row observation makes every mutation batch and observer re-attachment grow with the session count, while a shared watch can miss row changes or a replaced sidebar.
 */
import { afterEach, expect, test, vi } from 'vitest'
import { installSidebarStatus } from '@dsh-claude-style/client/pure'
import { SESSION_PHASE_ATTRIBUTE, SIDEBAR_SLOT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { hostElement } from '../../fixtures/host-markup'
import { surfaceAttribute } from '../../fixtures/surface'

const PART = surfaceAttribute('skin.part')
const STATUS = surfaceAttribute('sidebar-status.row')
const cleanups: (() => void)[] = []
const settle = () => new Promise(resolve => setTimeout(resolve, 0))

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
  vi.restoreAllMocks()
  document.body.replaceChildren()
})

interface SessionRow {
  row: HTMLElement
  dot: HTMLElement
}

/** A sidebar root and its native session rows, using the host contract's naming. */
function sidebar(states: string[]) {
  const slot = hostElement(SIDEBAR_SLOT_SELECTOR)
  const root = document.createElement('div')
  root.setAttribute(PART, 'sidebar-root')
  slot.append(root)
  document.body.append(slot)
  const rows: SessionRow[] = states.map(state => {
    const row = document.createElement('div')
    row.setAttribute(PART, 'session-row')
    const seat = document.createElement('div')
    seat.setAttribute(PART, 'row-slot')
    const dot = document.createElement('span')
    dot.setAttribute(SESSION_PHASE_ATTRIBUTE, state)
    seat.append(dot)
    row.append(seat)
    root.append(row)
    return { row, dot }
  })
  return { slot, root, rows }
}

interface TestUi {
  schedule(): void
  sidebarStatus?: { sync(): void }
}

function installed() {
  let calls = 0
  const ui: TestUi = { schedule() { calls += 1 } }
  const stop = installSidebarStatus(undefined as never, ui as never)
  cleanups.push(stop)
  const sync = () => ui.sidebarStatus?.sync()
  sync()
  return { sync, calls: () => calls }
}

test('one root watch covers every row without observing each session row', async () => {
  const current = sidebar(Array.from({ length: 12 }, () => 'ongoing'))
  // cost: D40 — observed row targets measure the subscription growth this watch must avoid.
  const observe = vi.spyOn(MutationObserver.prototype, 'observe')
  const feature = installed()

  const rowTargets = observe.mock.calls.filter(([target]) => target instanceof Element && target.getAttribute(PART) === 'session-row')
  expect(rowTargets).toEqual([])
  expect(observe.mock.calls.some(([target]) => target === current.root)).toBe(true)

  const beforeAttribute = feature.calls()
  current.rows[11].dot.setAttribute(SESSION_PHASE_ATTRIBUTE, 'idle')
  await settle()
  expect(feature.calls()).toBeGreaterThan(beforeAttribute)
  feature.sync()
  expect(current.rows[11].row.getAttribute(STATUS)).toBe('idle')
  expect(current.rows[0].row.getAttribute(STATUS)).toBe('active')

  const beforeRemoval = feature.calls()
  current.rows[1].dot.remove()
  await settle()
  expect(feature.calls()).toBeGreaterThan(beforeRemoval)
  feature.sync()
  expect(current.rows[1].row.getAttribute(STATUS)).toBe('idle')
})

test('the shared watch follows a host replacement of the sidebar root', async () => {
  const current = sidebar(['ongoing'])
  const feature = installed()
  const next = sidebar(['ongoing'])
  current.slot.replaceWith(next.slot)
  await settle()
  feature.sync()
  expect(next.rows[0].row.getAttribute(STATUS)).toBe('active')

  const before = feature.calls()
  next.rows[0].dot.setAttribute(SESSION_PHASE_ATTRIBUTE, 'idle')
  await settle()
  expect(feature.calls()).toBeGreaterThan(before)
  feature.sync()
  expect(next.rows[0].row.getAttribute(STATUS)).toBe('idle')
})

test('teardown stops the shared watch', async () => {
  const current = sidebar(['ongoing'])
  const feature = installed()
  const stop = cleanups.pop()
  stop?.()

  const before = feature.calls()
  current.rows[0].dot.setAttribute(SESSION_PHASE_ATTRIBUTE, 'idle')
  current.rows[0].dot.remove()
  await settle()
  expect(feature.calls()).toBe(before)
})
