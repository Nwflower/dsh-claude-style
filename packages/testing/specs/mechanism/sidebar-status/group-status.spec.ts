/**
 * The group mark's reading of the host: which rows are closed workspaces, who
 * runs under them, and the pass a moving status asks for. Each host list
 * stands in at the boundary the feature reads, the way the real host hands a
 * source out and replaces it (the sync-fault smoke case tears one down).
 *
 * @capability sidebar-status
 * @features sidebar-status
 * @risk A closed workspace with a running session goes unmarked, an open or unrelated row gains a mark, a status change never repaints, or a torn-down host source takes the whole feature down.
 */
import { expect, test } from 'vitest'
import { WorkspaceGroupStatus, createAttentionFeed } from '@dsh-claude-style/client/pure'
import { SESSION_ROW_KEY_ATTRIBUTE, WORKSPACE_ROW_EXPANDED_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import type { HostContext } from '@dsh-claude-style/engine/host'
import { surfaceAttribute } from '../../fixtures/surface'
import { PART, removeAfterTest } from './fixture'

const RUNNING = surfaceAttribute('sidebar-status.workspace-running')

/** One list source as the host hands it out: a snapshot plus subscribers. */
function source(snapshot: () => unknown) {
  const listeners = new Set<() => void>()
  return {
    getSnapshot: snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    listeners,
    publish() { for (const listener of [...listeners]) listener() },
  }
}

function harness(options: { withStatus?: boolean, phase?: string, broken?: boolean } = {}) {
  const running = new Set<string>()
  const status = source(() => ({ get: (id: string) => ({ running: running.has(id) }) }))
  const sessions = source(() => ({
    phase: 'ready',
    ids: ['s1', 'sub'],
    byId: {
      s1: { running: options.withStatus === false, origin: 'session' },
      sub: { running: true, origin: 'subagent' },
    },
  }))
  const workspaces = source(() => ({
    phase: options.phase ?? 'ready',
    items: [{ workspaceId: 'app', path: 'C:/work/app', sessionIds: ['s1'] }],
    archivedSessionIds: [],
  }))
  if (options.broken) {
    status.getSnapshot = () => { throw new Error('torn down') }
    status.subscribe = () => { throw new Error('torn down') }
  }
  const view = { getSnapshot: () => ({ groupBy: 'workspace' }), actions: { setArchivedFilter() {}, setGroupBy() {} } }
  const services: Record<string, unknown> = {
    sessions: { list: sessions },
    workspaces: { list: workspaces },
    slots: { entries: (name: string) => name === 'sidebar.workspaces' ? [{ store: { create: () => view } }] : [] },
  }
  if (options.withStatus !== false) services.uiSession = { sessionStatus: status }
  const ctx = { get: (name: string) => services[name] } as unknown as HostContext
  return { ctx, running, status, sessions, workspaces }
}

function mountRow(key: string, expanded = 'false') {
  const row = document.createElement('div')
  row.setAttribute(PART, 'project-row')
  row.setAttribute(SESSION_ROW_KEY_ATTRIBUTE, key)
  row.setAttribute(WORKSPACE_ROW_EXPANDED_ATTRIBUTE, expanded)
  document.body.append(row)
  removeAfterTest(row)
  return row
}

function mount(h: ReturnType<typeof harness>) {
  const closed = mountRow('workspace:app')
  const open = mountRow('workspace:app', 'true')
  const foreign = mountRow('workspace:other')
  const session = mountRow('session:s1')
  let passes = 0
  const groups = new WorkspaceGroupStatus(h.ctx, () => [closed, open, foreign, session], () => { passes += 1 })
  return { closed, open, foreign, session, groups, passes: () => passes }
}

/** One pass over the rows, answering whether the closed workspace is marked. */
function marked(view: ReturnType<typeof mount>): boolean {
  view.groups.measure()
  view.groups.sync()
  return view.closed.hasAttribute(RUNNING)
}

test('only the closed workspace holding the running session is marked', () => {
  const h = harness()
  h.running.add('s1')
  const view = mount(h)
  expect(marked(view)).toBe(true)
  expect(view.open.hasAttribute(RUNNING)).toBe(false)
  expect(view.foreign.hasAttribute(RUNNING)).toBe(false)
  expect(view.session.hasAttribute(RUNNING)).toBe(false)
  view.groups.dispose()
})

test('a status change asks for a pass and the next sync follows it', () => {
  const h = harness()
  h.running.add('s1')
  const view = mount(h)
  view.groups.measure()
  view.groups.sync()
  expect(view.closed.hasAttribute(RUNNING)).toBe(true)
  h.running.delete('s1')
  h.status.publish()
  expect(view.passes()).toBeGreaterThan(0)
  view.groups.measure()
  view.groups.sync()
  expect(view.closed.hasAttribute(RUNNING)).toBe(false)
  expect(view.closed.querySelector('*')).toBeNull()
  view.groups.dispose()
  expect(h.status.listeners.size).toBe(0)
  expect(h.sessions.listeners.size).toBe(0)
  expect(h.workspaces.listeners.size).toBe(0)
})

test('a running subagent session marks nothing', () => {
  const h = harness()
  h.running.add('sub')
  const view = mount(h)
  expect(marked(view)).toBe(false)
  view.groups.dispose()
})

test('a workspace list still pending marks nothing', () => {
  const h = harness({ phase: 'pending' })
  h.running.add('s1')
  const view = mount(h)
  expect(marked(view)).toBe(false)
  view.groups.dispose()
})

test('without the live status service the list summary answers', () => {
  const h = harness({ withStatus: false })
  const view = mount(h)
  expect(marked(view)).toBe(true)
  view.groups.dispose()
})

test('a torn-down source reads as no mark and never throws into the feature', () => {
  const h = harness({ broken: true })
  h.running.add('s1')
  const view = mount(h)
  expect(() => { view.groups.measure(); view.groups.sync() }).not.toThrow()
  expect(view.closed.hasAttribute(RUNNING)).toBe(false)
  view.groups.dispose()
})

function standaloneStatusSetup(attachImmediately: boolean) {
  const h = harness({ withStatus: false })
  let liveRunning = true
  const liveStatus = source(() => new Map([['s1', { running: liveRunning }]]))
  const uiSession = new Proxy({}, {
    get(target, prop) {
      if (prop === 'sessionStatus') throw new Error('cannot get property "uiSession.sessionStatus" without inject')
      return Reflect.get(target, prop)
    },
    has(target, prop) {
      return prop === 'sessionStatus' ? false : Reflect.has(target, prop)
    },
  })
  const services: Record<string, unknown> = {
    sessions: { list: h.sessions },
    workspaces: { list: h.workspaces },
    slots: h.ctx.get('slots'),
    uiSession,
  }
  if (attachImmediately) services['uiSession.sessionStatus'] = liveStatus
  const fibers: Array<{ deps: readonly string[], callback: (scope: HostContext) => void, disposed: boolean }> = []
  const ctx = {
    get: (name: string) => services[name],
    inject(deps: readonly string[], callback: (scope: HostContext) => void) {
      const record = { deps, callback, disposed: false }
      fibers.push(record)
      return { dispose() { record.disposed = true } }
    },
  } as unknown as HostContext
  return {
    h,
    ctx,
    services,
    fibers,
    liveStatus,
    setRunning(value: boolean) {
      liveRunning = value
      liveStatus.publish()
    },
  }
}

test('resolves standalone uiSession.sessionStatus without reading an uninjected uiSession property', () => {
  const setup = standaloneStatusSetup(true)
  const view = mount({ ...setup.h, ctx: setup.ctx })
  expect(() => marked(view)).not.toThrow()
  expect(view.closed.hasAttribute(RUNNING)).toBe(true)
  setup.setRunning(false)
  expect(view.passes()).toBeGreaterThan(0)
  expect(marked(view)).toBe(false)
  view.groups.dispose()
  expect(setup.liveStatus.listeners.size).toBe(0)
})

test('createAttentionFeed accepts late uiSession.sessionStatus injection and cleans up both fibers', () => {
  const setup = standaloneStatusSetup(false)
  const events: string[] = []
  const feed = createAttentionFeed(setup.ctx, (event) => { events.push(event) })
  expect(setup.fibers.map((item) => item.deps)).toEqual([
    ['uiSession', 'sessions'],
    ['uiSession.sessionStatus', 'sessions'],
  ])

  expect(() => setup.fibers[0].callback(setup.ctx)).not.toThrow()
  expect(events).toEqual([])

  setup.services['uiSession.sessionStatus'] = setup.liveStatus
  setup.fibers[1].callback(setup.ctx)
  expect(events).toEqual([])

  setup.setRunning(false)
  expect(events).toEqual(['finished'])

  feed.dispose()
  setup.setRunning(true)
  expect(events).toEqual(['finished'])
  expect(setup.liveStatus.listeners.size).toBe(0)
  expect(setup.fibers.every((item) => item.disposed)).toBe(true)
})
