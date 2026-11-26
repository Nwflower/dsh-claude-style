/**
 * @capability sidebar-status
 * @features sidebar-status
 * @risk Per-row observation makes every mutation batch and observer re-attachment grow with the session count, while a shared watch can miss row changes or a replaced sidebar.
 */
import { afterEach, expect, test, vi } from 'vitest'
import { installSidebarStatus } from '@dsh-claude-style/client/mechanisms'
import { SESSION_PHASE_ATTRIBUTE, SESSION_TITLE_CLIPPED_ATTRIBUTE, SESSION_TITLE_SCROLLED_ATTRIBUTE, SIDEBAR_SLOT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { hostElement } from '../../fixtures/host-markup'
import { surfaceAttribute } from '../../fixtures/surface'
import { frames } from '../../fixtures/frames'
import { CHANNEL_ATTRIBUTE, CHANNEL_TEXT_ATTRIBUTE, installChannelTitleSheet } from '../../fixtures/channel-title'

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

  // The new title reports its initial size after rendering; finish that delivery
  // before counting whether mutations of the detached root schedule anything.
  await frames(2)
  const beforeOldRoot = feature.calls()
  current.rows[0].title.textContent = ''
  current.rows[0].dot.setAttribute(SESSION_PHASE_ATTRIBUTE, 'idle')
  await frames(2)
  expect(feature.calls()).toBe(beforeOldRoot)

  const before = feature.calls()
  next.rows[0].dot.setAttribute(SESSION_PHASE_ATTRIBUTE, 'idle')
  await settle()
  expect(feature.calls()).toBeGreaterThan(before)
  feature.sync()
  expect(next.rows[0].row.getAttribute(STATUS)).toBe('idle')
})

/** Whether a change to the page asked the feature for a pass once its records arrived. */
async function scheduledBy(feature: ReturnType<typeof installed>, change: () => void) {
  const before = feature.calls()
  change()
  await settle()
  return feature.calls() > before
}

/** dsh-im taking a title's glyphs over with its own generated title. */
function takeOver(title: HTMLElement) {
  title.setAttribute(CHANNEL_ATTRIBUTE, 'feishu')
  title.setAttribute(CHANNEL_TEXT_ATTRIBUTE, '配置书')
}

/** dsh-im handing the title back. */
function release(title: HTMLElement) {
  title.removeAttribute(CHANNEL_ATTRIBUTE)
  title.removeAttribute(CHANNEL_TEXT_ATTRIBUTE)
}

/** One frame of the host's title marquee: both fade marks rewritten, changed or not. */
function marqueeFrame(title: HTMLElement) {
  title.setAttribute(SESSION_TITLE_SCROLLED_ATTRIBUTE, '')
  title.setAttribute(SESSION_TITLE_CLIPPED_ATTRIBUTE, '')
}

test('title-only plugin attributes invalidate generated titles without scheduling unrelated row attributes', async () => {
  const current = sidebar(['ongoing'])
  cleanups.push(installChannelTitleSheet())
  const feature = installed()
  const { row, title } = current.rows[0]
  await frames(2)
  expect(await scheduledBy(feature, () => takeOver(title))).toBe(true)
  feature.sync()
  expect(row.hasAttribute(RUNNING_TITLE)).toBe(false)

  expect(await scheduledBy(feature, () => title.setAttribute(CHANNEL_TEXT_ATTRIBUTE, '新标题'))).toBe(true)
  feature.sync()
  expect(getComputedStyle(title, '::after').content).toContain('新标题')
  expect(row.hasAttribute(RUNNING_TITLE)).toBe(false)

  expect(await scheduledBy(feature, () => release(title))).toBe(true)
  feature.sync()
  expect(row.hasAttribute(RUNNING_TITLE)).toBe(true)

  await frames(2)
  expect(await scheduledBy(feature, () => { row.id = 'external-session-row' })).toBe(false)
})

test('the host title marquee schedules no pass on a running or an idle title', async () => {
  const current = sidebar(['ongoing', 'idle'])
  const feature = installed()
  await frames(2)
  const before = feature.calls()
  for (let frame = 0; frame < 6; frame += 1) {
    for (const { title } of current.rows) marqueeFrame(title)
    await frames(1)
  }
  for (const { title } of current.rows) {
    title.removeAttribute(SESSION_TITLE_SCROLLED_ATTRIBUTE)
    title.removeAttribute(SESSION_TITLE_CLIPPED_ATTRIBUTE)
  }
  await settle()
  expect(feature.calls()).toBe(before)
})

test('title attributes schedule a pass only while the title runs, through a takeover and its release', async () => {
  const current = sidebar(['idle'])
  cleanups.push(installChannelTitleSheet())
  const feature = installed()
  const { row, dot, title } = current.rows[0]
  await frames(2)

  expect(await scheduledBy(feature, () => takeOver(title))).toBe(false)
  release(title)
  await settle()

  expect(await scheduledBy(feature, () => dot.setAttribute(SESSION_PHASE_ATTRIBUTE, 'ongoing'))).toBe(true)
  feature.sync()
  expect(row.hasAttribute(RUNNING_TITLE)).toBe(true)

  // A taken-over title is still the one the row holds: its attributes keep
  // scheduling, and the marquee's marks pass it by.
  expect(await scheduledBy(feature, () => takeOver(title))).toBe(true)
  feature.sync()
  expect(row.hasAttribute(RUNNING_TITLE)).toBe(false)
  await frames(2)
  const beforeMarquee = feature.calls()
  for (let frame = 0; frame < 3; frame += 1) {
    marqueeFrame(title)
    await frames(1)
  }
  expect(feature.calls()).toBe(beforeMarquee)
  expect(await scheduledBy(feature, () => release(title))).toBe(true)
  feature.sync()
  expect(row.hasAttribute(RUNNING_TITLE)).toBe(true)

  dot.setAttribute(SESSION_PHASE_ATTRIBUTE, 'idle')
  await settle()
  feature.sync()
  await frames(2)
  expect(await scheduledBy(feature, () => takeOver(title))).toBe(false)
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
  expect(options?.attributes).toBe(true)
  expect(options?.attributeFilter).toBeUndefined()

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
