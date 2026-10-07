import { expect, test } from 'vitest'
import { mascotLevel } from './mascot-signals'
import type { MascotReading } from './mascot-signals'
import type { HostSessionListSnapshot } from '@dsh-claude-style/contracts/services'

type Status = { running?: boolean, pendingInteraction?: unknown }

/** A session list holding these sessions, with the subagents each one started. */
function list(sessions: { id: string, running?: boolean, origin?: string, subagents?: string[] }[]): HostSessionListSnapshot {
  return {
    ids: sessions.map(session => session.id),
    byId: Object.fromEntries(sessions.map(session => [session.id, { id: session.id, running: session.running, origin: session.origin, displayTitle: session.id, updatedAt: 0 }])),
    projectionsBySession: Object.fromEntries(sessions.map(session => [session.id, { values: { subagentCatalog: (session.subagents ?? []).map(id => ({ id })) } }])),
  }
}

function reading(fields: Partial<MascotReading> & { statuses?: Record<string, Status> }): MascotReading {
  return {
    sessionId: fields.sessionId ?? null,
    status: fields.statuses === undefined ? null : new Map(Object.entries(fields.statuses)),
    list: fields.list ?? null,
    compacting: fields.compacting ?? false,
    phase: fields.phase ?? null,
  }
}

test('the home page reads the whole workspace: a question anywhere, else the crowd at work', () => {
  const sessions = list([{ id: 'a', running: true }, { id: 'b', running: true }, { id: 'c', running: true }, { id: 's', running: true, origin: 'subagent' }])
  expect(mascotLevel(reading({ list: sessions })).animation).toBe('building')
  expect(mascotLevel(reading({ list: list([{ id: 'a', running: true }, { id: 'b', running: true }]) })).animation).toBe('music')
  expect(mascotLevel(reading({ list: list([{ id: 'a', running: true }]) })).animation).toBe('typing')
  expect(mascotLevel(reading({ list: list([{ id: 'a' }]) })).state).toBe('idle')
  expect(mascotLevel(reading({ list: sessions, statuses: { c: { pendingInteraction: {} } } })).state).toBe('notification')
})

test('a session waits on the reader when it or one of its subagents asks', () => {
  const sessions = list([{ id: 'a', running: true, subagents: ['k'] }, { id: 'k', origin: 'subagent' }])
  expect(mascotLevel(reading({ sessionId: 'a', list: sessions, statuses: { k: { pendingInteraction: {} } } })).state).toBe('notification')
  expect(mascotLevel(reading({ sessionId: 'a', list: sessions, statuses: { a: { pendingInteraction: {} } }, compacting: true })).state).toBe('notification')
})

test('a compaction shows over the subagents and the turn', () => {
  const sessions = list([{ id: 'a', running: true, subagents: ['k'] }, { id: 'k', running: true, origin: 'subagent' }])
  expect(mascotLevel(reading({ sessionId: 'a', list: sessions, compacting: true, phase: 'working' })).animation).toBe('compacting')
})

test('running subagents juggle: one plays music, two conduct', () => {
  const one = list([{ id: 'a', running: true, subagents: ['k', 'l'] }, { id: 'k', running: true, origin: 'subagent' }, { id: 'l', origin: 'subagent' }])
  expect(mascotLevel(reading({ sessionId: 'a', list: one, phase: 'working' }))).toEqual({ state: 'juggling', animation: 'music', priority: 4 })
  const two = list([{ id: 'a', running: true, subagents: ['k', 'l'] }, { id: 'k', running: true, origin: 'subagent' }, { id: 'l', running: true, origin: 'subagent' }])
  expect(mascotLevel(reading({ sessionId: 'a', list: two })).animation).toBe('conducting')
})

test('the turn\'s phase decides between work and thought; a running session with no turn yet is thinking', () => {
  const sessions = list([{ id: 'a', running: true }])
  expect(mascotLevel(reading({ sessionId: 'a', list: sessions, phase: 'working' })).animation).toBe('typing')
  expect(mascotLevel(reading({ sessionId: 'a', list: sessions, phase: 'thinking' })).state).toBe('thinking')
  expect(mascotLevel(reading({ sessionId: 'a', list: sessions })).state).toBe('thinking')
  expect(mascotLevel(reading({ sessionId: 'a', list: list([{ id: 'a' }]) })).state).toBe('idle')
})

test('the live status outranks the list\'s summary of whether a session runs', () => {
  const sessions = list([{ id: 'a', running: true }])
  expect(mascotLevel(reading({ sessionId: 'a', list: sessions, statuses: { a: { running: false } } })).state).toBe('idle')
})
