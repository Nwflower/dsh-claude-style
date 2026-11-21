/**
 * @capability active-first
 * @features active-first
 * @risk A manual drag is undone, a finished session stays ahead of the host's latest rows, or the keyboard reaches a different session than the visual order suggests.
 */
import { beforeEach, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { ACTIVE_FIRST_SHEET, installActiveFirst } from '@dsh-claude-style/client/pure'
import { SESSION_ONGOING_STATE, SESSION_PHASE_ATTRIBUTE, SESSION_ROW_KEY_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import type { HostSessionGroupBy, HostSessionOrderBy } from '@dsh-claude-style/contracts/services'
import type { HostContext } from '@dsh-claude-style/engine/host'
import { surfaceAttribute } from '../../fixtures/surface'
import { cleanupWith, frames } from '../../fixtures/teardown'

const ROOT = surfaceAttribute('skin.root')
const PART = surfaceAttribute('skin.part')
const DATE = surfaceAttribute('date-groups.mode')

beforeEach(() => {
  document.body.setAttribute(ROOT, '')
  const style = document.createElement('style')
  style.textContent = '.workspace-rows > * { display:block; height:24px } .workspace-rows > * + * { margin-top:2px }' + ACTIVE_FIRST_SHEET
  document.head.append(style)
  cleanupWith(() => { style.remove(); document.body.removeAttribute(ROOT); document.body.removeAttribute(DATE) })
})

/** The view menu and workspace registry are host boundaries (D92). Both publish through native events. */
function host(groupBy: HostSessionGroupBy = 'flat', orderBy: HostSessionOrderBy | undefined = 'updated') {
  const viewEvents = new EventTarget()
  const registryEvents = new EventTarget()
  const registry = { phase: 'ready', pinnedSessionIds: [] as string[], archivedSessionIds: [] as string[] }
  const changes = (events: EventTarget) => (listener: () => void) => {
    events.addEventListener('change', listener)
    return () => events.removeEventListener('change', listener)
  }
  const selection: { groupBy: HostSessionGroupBy, orderBy: HostSessionOrderBy | undefined, archivedFilter: string } = { groupBy, orderBy, archivedFilter: 'default' }
  const view = {
    getSnapshot: () => selection,
    subscribe: changes(viewEvents),
    actions: {
      setGroupBy(mode: HostSessionGroupBy) { selection.groupBy = mode; viewEvents.dispatchEvent(new Event('change')) },
      setArchivedFilter(value: string) { selection.archivedFilter = value; viewEvents.dispatchEvent(new Event('change')) },
    },
  }
  const list = { getSnapshot: () => registry, subscribe: changes(registryEvents) }
  const services = new Map<string, unknown>([
    ['workspaces', { list }], ['slots', { entries: (key: string) => key === 'sidebar.workspaces' ? [{ store: { create: () => view } }] : [] }],
  ])
  return {
    ctx: { get: (name: string) => services.get(name) } as HostContext,
    order(mode: HostSessionOrderBy | undefined) { selection.orderBy = mode; viewEvents.dispatchEvent(new Event('change')) },
    pins(pinned: string[], archived: string[] = []) {
      registry.pinnedSessionIds = pinned
      registry.archivedSessionIds = archived
      registryEvents.dispatchEvent(new Event('change'))
    },
  }
}

function installed(ctx: HostContext) {
  const stop = installActiveFirst(ctx)
  cleanupWith(stop)
  return stop
}

function session(id: string, running = false) {
  const box = document.createElement('span')
  box.id = id
  const row = document.createElement('div')
  row.setAttribute(SESSION_ROW_KEY_ATTRIBUTE, 'session:' + id)
  row.tabIndex = 0
  const phase = document.createElement('span')
  if (running) phase.setAttribute(SESSION_PHASE_ATTRIBUTE, SESSION_ONGOING_STATE)
  row.append(phase)
  box.append(row)
  return { box, row, run() { phase.setAttribute(SESSION_PHASE_ATTRIBUTE, SESSION_ONGOING_STATE) }, finish() { phase.removeAttribute(SESSION_PHASE_ATTRIBUTE) } }
}

function owner(part = 'list') {
  const list = document.createElement('div')
  list.className = 'workspace-rows'
  list.setAttribute(PART, part)
  document.body.append(list)
  return list
}

function marker(id: string) {
  const element = document.createElement('div')
  element.id = id
  return element
}

function expectOrder(list: Element, dom: string[], visual = dom) {
  const children = [...list.children]
  expect(children.map(child => child.id)).toEqual(dom)
  expect(children.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top).map(child => child.id)).toEqual(visual)
}

for (const group of ['flat', 'workspace', 'workspace-tree'] as const) {
  test(group + ' preserves a manual order throughout activity', async () => {
    const h = host(group, 'manual')
    const list = owner(group === 'flat' ? 'list' : 'group-section')
    const a = session('a'), b = session('b'), c = session('c', true)
    list.append(a.box, b.box, c.box)
    installed(h.ctx)
    b.run()
    list.prepend(b.box)
    await frames(2)
    expectOrder(list, ['b', 'a', 'c'])
    c.finish()
    await frames(2)
    expectOrder(list, ['b', 'a', 'c'])
    expect(getComputedStyle(list).display).toBe('block')
  })
}

test('running sessions follow effective pins, keep host tie order and release the blank after the last finishes', async () => {
  const h = host()
  const list = owner()
  const blank = session('blank'), pin = session('pinned'), archive = session('archived'), a = session('a'), b = session('b')
  const dom = [blank, pin, archive, a, b].map(item => item.box.id)
  list.append(blank.box, pin.box, archive.box, a.box, b.box)
  h.pins(['pinned', 'archived'], ['archived'])
  installed(h.ctx)
  a.run(); b.run()
  await frames(2)
  expectOrder(list, dom, ['pinned', 'a', 'b', 'blank', 'archived'])
  a.finish()
  await frames(2)
  expectOrder(list, dom, ['pinned', 'b', 'blank', 'archived', 'a'])
  h.pins(['archived'])
  await frames(2)
  expectOrder(list, dom, ['archived', 'b', 'blank', 'pinned', 'a'])
  b.finish()
  await frames(2)
  expectOrder(list, dom)
  expect(getComputedStyle(list).display).toBe('block')
})

test('new rows, removed rows, host moves and store-only mode changes use the live seats', async () => {
  const h = host()
  const list = owner()
  const a = session('a'), b = session('b'), c = session('c', true), d = session('d')
  list.append(a.box, b.box, c.box)
  installed(h.ctx)
  expectOrder(list, ['a', 'b', 'c'], ['c', 'a', 'b'])
  b.box.remove(); list.prepend(d.box); list.append(a.box)
  await frames(2)
  expectOrder(list, ['d', 'c', 'a'], ['c', 'd', 'a'])
  expect(b.box.style.length).toBe(0)
  h.order('manual')
  await frames(2)
  expectOrder(list, ['d', 'c', 'a'])
  h.order('updated')
  await frames(2)
  expectOrder(list, ['d', 'c', 'a'], ['c', 'd', 'a'])
  h.order(undefined)
  await frames(2)
  expectOrder(list, ['d', 'c', 'a'])
})

test('the visual leader inherits the first slot, all gaps hold and Tab follows the visual rows', async () => {
  const h = host()
  const before = document.createElement('button')
  document.body.append(before)
  const list = owner()
  const a = session('a'), b = session('b'), c = session('c')
  list.append(a.box, b.box, c.box)
  const tops = [a, b, c].map(item => item.box.getBoundingClientRect().top)
  installed(h.ctx)
  c.row.focus(); c.run()
  await frames(2)
  expectOrder(list, ['a', 'b', 'c'], ['c', 'a', 'b'])
  expect([c, a, b].map(item => item.box.getBoundingClientRect().top)).toEqual(tops)
  expect(document.activeElement).toBe(c.row)
  before.focus()
  for (const seat of [c, a, b]) {
    await userEvent.tab()
    expect(document.activeElement).toBe(seat.row)
  }
})

test('headings and dividers retain their slots and bound each running partition', async () => {
  const h = host('workspace')
  const list = owner('group-section')
  const first = marker('header'), line = marker('divider'), more = marker('more')
  const a = session('a'), b = session('b', true), c = session('c'), d = session('d', true)
  list.append(first, a.box, b.box, line, c.box, d.box, more)
  const dom = ['header', 'a', 'b', 'divider', 'c', 'd', 'more']
  const slots = [...list.children].map(child => child.getBoundingClientRect().top)
  installed(h.ctx)
  expectOrder(list, dom, ['header', 'b', 'a', 'divider', 'd', 'c', 'more'])
  expect([first, b.box, a.box, line, d.box, c.box, more].map(child => child.getBoundingClientRect().top)).toEqual(slots)
  list.insertBefore(line, b.box)
  await frames(2)
  expectOrder(list, ['header', 'a', 'divider', 'b', 'c', 'd', 'more'], ['header', 'a', 'divider', 'b', 'd', 'c', 'more'])
})

test('date mode, list replacement and teardown release every surviving or detached seat', async () => {
  const h = host()
  const list = owner()
  const a = session('a'), b = session('b', true)
  list.append(a.box, b.box)
  const stop = installed(h.ctx)
  expectOrder(list, ['a', 'b'], ['b', 'a'])
  document.body.setAttribute(DATE, '')
  await frames(2)
  expectOrder(list, ['a', 'b'])
  expect([a.box, b.box].every(child => child.style.length === 0)).toBe(true)
  document.body.removeAttribute(DATE)
  await frames(2)
  expectOrder(list, ['a', 'b'], ['b', 'a'])
  list.remove()
  const next = owner()
  const c = session('c'), d = session('d', true)
  next.append(c.box, d.box)
  await frames(2)
  expectOrder(next, ['c', 'd'], ['d', 'c'])
  expect([a.box, b.box].every(child => child.style.length === 0)).toBe(true)
  stop()
  expectOrder(next, ['c', 'd'])
  expect([c.box, d.box].every(child => child.style.length === 0)).toBe(true)
  h.order('manual'); h.order('updated')
  await frames(2)
  expectOrder(next, ['c', 'd'])
})

test('an unrelated surface using session keys retains its own layout', () => {
  const list = owner('third-party-list')
  list.append(session('a').box, session('b', true).box)
  installed(host().ctx)
  expectOrder(list, ['a', 'b'])
  expect(getComputedStyle(list).display).toBe('block')
})
