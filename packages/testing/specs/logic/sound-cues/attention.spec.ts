/**
 * @capability sound-cues
 * @features sound-cues
 * @risk A prompt already pending at load cues again, a subagent's finish reads as the task's finish, or a repeated status publication plays the same cue twice.
 */
import { expect, test } from 'vitest'
import { attentionEvents, attentionReading } from '@dsh-claude-style/client/pure'
import type { AttentionReading } from '@dsh-claude-style/client/pure'
import type { HostSessionListSnapshot, HostSessionStatusSnapshot } from '@dsh-claude-style/contracts/services'

interface Reading { pending?: boolean, running?: boolean, topLevel?: boolean }

function readings(entries: Record<string, Reading>): Map<string, AttentionReading> {
  return new Map(Object.entries(entries).map(([id, entry]) => [id, {
    pending: entry.pending === true,
    running: entry.running === true,
    topLevel: entry.topLevel !== false,
  }]))
}

function status(entries: Record<string, { running?: boolean, pendingInteraction?: unknown }>): HostSessionStatusSnapshot {
  return new Map(Object.entries(entries)) as unknown as HostSessionStatusSnapshot
}

function list(ids: string[], rows: Record<string, { running?: boolean, origin?: string }>): HostSessionListSnapshot {
  return {
    phase: 'ready',
    ids,
    byId: Object.fromEntries(ids.map(id => [id, { id, displayTitle: id, updatedAt: 1, ...rows[id] }])),
    projectionsBySession: {},
  }
}

test('the first reading is the baseline', () => {
  expect(attentionEvents(readings({}), readings({ a: { pending: true, running: true } }))).toEqual([])
  expect(attentionEvents(readings({ a: { running: true } }), readings({ a: { pending: true, running: true } }))).toEqual(['permission'])
})

test('a pending prompt cues once and stays quiet while it stays pending', () => {
  const before = readings({ a: { running: true } })
  const waiting = readings({ a: { pending: true, running: true } })
  expect(attentionEvents(before, waiting)).toEqual(['permission'])
  expect(attentionEvents(waiting, waiting)).toEqual([])
  expect(attentionEvents(waiting, readings({ a: { running: true } }))).toEqual([])
  expect(attentionEvents(readings({ a: { running: true } }), waiting)).toEqual(['permission'])
})

test('a top-level session stopping cues; a subagent stopping does not', () => {
  expect(attentionEvents(readings({ a: { running: true, topLevel: true } }), readings({ a: { running: false, topLevel: true } }))).toEqual(['finished'])
  expect(attentionEvents(readings({ s: { running: true, topLevel: false } }), readings({ s: { running: false, topLevel: false } }))).toEqual([])
})

test('a session that starts waiting as it stops answers both events; the cue window keeps one', () => {
  const events = attentionEvents(readings({ a: { running: true } }), readings({ a: { pending: true, running: false } }))
  expect(events).toEqual(['permission', 'finished'])
})

test('a session appearing for the first time is a baseline too', () => {
  expect(attentionEvents(readings({ a: { running: true } }), readings({ a: { running: true }, b: { running: false } }))).toEqual([])
})

test('the reading lays the live status over the list and leaves unknown sessions below top level', () => {
  const snapshot = attentionReading(
    status({ a: { running: false }, s: { running: true, pendingInteraction: { kind: 'permission' } } }),
    list(['a', 'b'], { a: { running: true }, b: { running: true, origin: 'subagent' } }),
  )
  expect(snapshot.get('a')).toEqual({ pending: false, running: false, topLevel: true })
  expect(snapshot.get('b')).toEqual({ pending: false, running: true, topLevel: false })
  expect(snapshot.get('s')).toEqual({ pending: true, running: true, topLevel: false })
})

test('a missing list keeps the live status, and a missing status reads the list', () => {
  expect(attentionReading(status({ a: { running: true, pendingInteraction: {} } }), null).get('a')).toEqual({ pending: true, running: true, topLevel: false })
  expect(attentionReading(null, list(['a'], { a: { running: true } })).get('a')).toEqual({ pending: false, running: true, topLevel: true })
  expect(attentionReading(null, null).size).toBe(0)
})
