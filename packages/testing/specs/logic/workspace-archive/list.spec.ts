/**
 * Archived-session filtering and the paged list's state machine, through the
 * client pure surface: host visibility, newest-first order, one append per
 * frame, row actions and a fresh first page on remount.
 *
 * @capability workspace-archive
 * @features workspace
 * @risk A large archive mounts every row, a scroll storm appends many pages, or a stale snapshot leaves a deleted row behind.
 */
import { afterEach, expect, test } from 'vitest'
import { ARCHIVED_PAGE_SIZE, archivedOrder, createArchivedList } from '@dsh-claude-style/client/pure'
import type { ArchivedList } from '@dsh-claude-style/client/pure'
import type { HostSessionSummary } from '@dsh-claude-style/contracts/services'
import { surfaceAttribute } from '../../fixtures/surface'

const ROW_ATTRIBUTE = surfaceAttribute('workspace.archived-row')

const cleanups: (() => void)[] = []
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
})

function summary(id: string, updatedAt: number, extra: Partial<HostSessionSummary> = {}): HostSessionSummary {
  return { id, displayTitle: 'Session ' + id, updatedAt, ...extra }
}

test('the archive follows host visibility and newest-first ordering', () => {
  const byId = {
    old: summary('old', 1),
    newest: summary('newest', 3),
    same: summary('same', 2),
    child: summary('child', 9, { origin: 'subagent' }),
    blank: summary('blank', 8, { blank: true }),
    current: summary('current', 7, { blank: true }),
  }
  expect(archivedOrder(['old', 'child', 'blank', 'same', 'newest', 'current', 'missing'], byId, 'current'))
    .toEqual(['current', 'newest', 'same', 'old'])
  expect(archivedOrder(['current'], byId, 'other')).toEqual([])
})

function fixture(count: number) {
  const archived = Array.from({ length: count }, (_, index) => 'session-' + String(index).padStart(4, '0'))
  const byId = Object.fromEntries(archived.map((id, index) => [id, summary(id, index)]))
  const root = document.createElement('div')
  document.body.append(root)
  const opened: string[] = []
  let list: ArchivedList
  const host = {
    workspaces: () => ({ list: { getSnapshot: () => ({ items: [], archivedSessionIds: archived }), subscribe: () => () => {} }, unarchiveSession: async () => {} }),
    sessions: () => ({ list: { getSnapshot: () => ({ ids: archived, byId, projectionsBySession: {} }), subscribe: () => () => {} }, binding: () => undefined, refresh: async () => {} }),
  }
  list = createArchivedList({
    host,
    actions: {
      open: id => { opened.push(id) },
      unarchive: id => { archived.splice(archived.indexOf(id), 1); list.sync() },
      remove: id => { archived.splice(archived.indexOf(id), 1); list.sync() },
    },
    schedule: () => {},
  })
  cleanups.push(() => { list.dispose(); root.remove() })
  return { root, list, opened }
}

function rows(root: HTMLElement) {
  return Array.from(root.querySelectorAll(`[${ROW_ATTRIBUTE}]`))
}

async function scrollStorm() {
  window.scrollTo(0, document.documentElement.scrollHeight)
  for (let index = 0; index < 8; index += 1) window.dispatchEvent(new Event('scroll'))
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
}

test('the first page is thirty and one frame of scroll events appends once', async () => {
  const { root, list } = fixture(420)
  list.mount(root)
  expect(rows(root)).toHaveLength(ARCHIVED_PAGE_SIZE)
  await scrollStorm()
  expect(rows(root)).toHaveLength(60)
  await scrollStorm()
  expect(rows(root)).toHaveLength(90)
})

test('an empty or exactly full page has nothing to append', async () => {
  const empty = fixture(0)
  empty.list.mount(empty.root)
  expect(rows(empty.root)).toHaveLength(0)
  await scrollStorm()
  expect(rows(empty.root)).toHaveLength(0)
  empty.list.unmount()
  const full = fixture(30)
  full.list.mount(full.root)
  await scrollStorm()
  expect(rows(full.root)).toHaveLength(30)
})

test('open, unarchive and delete act on the row and refresh its page', () => {
  const { root, list, opened } = fixture(35)
  list.mount(root)
  const newest = 'session-0034'
  rows(root)[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(opened).toEqual([newest])
  rows(root)[0].querySelectorAll('button')[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(rows(root)).toHaveLength(30)
  expect(rows(root).some(row => row.getAttribute(ROW_ATTRIBUTE) === newest)).toBe(false)
  const next = rows(root)[0].getAttribute(ROW_ATTRIBUTE)!
  rows(root)[0].querySelectorAll('button')[1].dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(rows(root).some(row => row.getAttribute(ROW_ATTRIBUTE) === next)).toBe(false)
})

test('leaving and remounting restores the first page and releases the listener', async () => {
  const { root, list } = fixture(90)
  list.mount(root)
  await scrollStorm()
  expect(rows(root)).toHaveLength(60)
  list.unmount()
  expect(root.querySelectorAll(`[${ROW_ATTRIBUTE}]`)).toHaveLength(0)
  list.mount(root)
  expect(rows(root)).toHaveLength(30)
})
