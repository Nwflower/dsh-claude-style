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
const RUNNING_TITLE = surfaceAttribute('sidebar-status.running-title')
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
  title: HTMLElement
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
    const title = document.createElement('span')
    title.setAttribute(PART, 'row-title')
    title.textContent = 'Native running session'
    row.append(seat, title)
    root.append(row)
    return { row, dot, title }
  })
  return { slot, root, rows }
}

interface TestUi {
  schedule(): void
  sidebarStatus?: { measure(): void; sync(): void }
}

function installed() {
  let calls = 0
  const ui: TestUi = { schedule() { calls += 1 } }
  const stop = installSidebarStatus(undefined as never, ui as never)
  cleanups.push(stop)
  const measure = () => ui.sidebarStatus?.measure()
  const write = () => ui.sidebarStatus?.sync()
  const sync = () => { measure(); write() }
  sync()
  return { sync, measure, write, calls: () => calls }
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
  expect(next.rows[0].row.hasAttribute(RUNNING_TITLE)).toBe(true)
  expect(current.rows[0].row.hasAttribute(STATUS)).toBe(false)
  expect(current.rows[0].row.hasAttribute(RUNNING_TITLE)).toBe(false)

  const beforeOldRoot = feature.calls()
  current.rows[0].title.textContent = ''
  current.rows[0].dot.setAttribute(SESSION_PHASE_ATTRIBUTE, 'idle')
  await settle()
  expect(feature.calls()).toBe(beforeOldRoot)

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
  expect(current.rows[0].row.hasAttribute(STATUS)).toBe(false)
  expect(current.rows[0].row.hasAttribute(RUNNING_TITLE)).toBe(false)

  const before = feature.calls()
  current.rows[0].dot.setAttribute(SESSION_PHASE_ATTRIBUTE, 'idle')
  current.rows[0].dot.remove()
  current.rows[0].title.style.opacity = '0'
  await settle()
  expect(feature.calls()).toBe(before)
})

test('the shared watch invalidates title reads while the write phase never measures geometry', async () => {
  const current = sidebar(['ongoing'])
  // cost: D40 — the root subscription must cover title invalidation without per-row observers.
  const observe = vi.spyOn(MutationObserver.prototype, 'observe')
  const feature = installed()
  const { row, title } = current.rows[0]
  expect(row.hasAttribute(RUNNING_TITLE)).toBe(true)
  const options = observe.mock.calls.find(([target]) => target === current.root)?.[1]
  expect(options?.characterData).toBe(true)
  expect(options?.attributeFilter).toEqual(expect.arrayContaining([
    SESSION_PHASE_ATTRIBUTE, PART, 'hidden', 'aria-hidden', 'contenteditable', 'style', 'class',
  ]))

  // cost: D40 — geometry belongs to the measure phase, never the DOM-writing phase.
  const bounds = vi.spyOn(title, 'getBoundingClientRect')
  feature.measure()
  expect(bounds).toHaveBeenCalled()
  const reads = bounds.mock.calls.length
  feature.write()
  expect(bounds.mock.calls).toHaveLength(reads)

  const text = title.firstChild as Text
  const beforeText = feature.calls()
  text.data = ''
  await settle()
  expect(feature.calls()).toBeGreaterThan(beforeText)
  feature.measure()
  expect(row.hasAttribute(RUNNING_TITLE)).toBe(true)
  feature.write()
  expect(row.hasAttribute(RUNNING_TITLE)).toBe(false)

  text.data = 'Native running session'
  await settle()
  feature.sync()
  expect(row.hasAttribute(RUNNING_TITLE)).toBe(true)

  const beforeStyle = feature.calls()
  title.style.opacity = '0'
  await settle()
  expect(feature.calls()).toBeGreaterThan(beforeStyle)
  feature.sync()
  expect(row.hasAttribute(RUNNING_TITLE)).toBe(false)
})
