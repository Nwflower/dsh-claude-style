/**
 * @capability manual-unread
 * @features manual-unread
 * @risk Reloading clears a deliberate unread mark, navigation consumes the wrong mark, or concurrent writes lose marks and report failures as successful saves.
 */
import { expect, test } from 'vitest'
import { createUnreadVisitTracker, createUnreadWriter, setUnreadMark } from '@dsh-claude-style/client/pure'

const CAPACITY = 2048
const ID_LENGTH = 1024

function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Promise was not initialized') }
  let reject: (error: unknown) => void = () => { throw new Error('Promise was not initialized') }
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

/** Only the asynchronous preference service boundary is controlled here. */
function writerHarness(initial: readonly string[] = []) {
  let stored = initial
  const writes: { ids: string[]; result: ReturnType<typeof deferred<readonly string[] | null>> }[] = []
  const writer = createUnreadWriter(() => stored, ids => {
    const result = deferred<readonly string[] | null>()
    writes.push({ ids, result })
    return result.promise.then(saved => {
      if (saved !== null) stored = saved
      return saved
    })
  })
  return { writer, writes, replace(ids: readonly string[]) { stored = ids } }
}

function markList(length: number): string[] {
  return Array.from({ length }, (_, index) => `conversation-${index}`)
}

test('marking and clearing preserve opaque ids, stable order and the input', () => {
  const ids = Object.freeze(['a', 'a ', 'A', '%61', 'session/a', '__proto__', ' '])
  expect(setUnreadMark(ids, 'a', true)).toEqual(ids)
  expect(setUnreadMark(ids, ' a', true)).toEqual([...ids, ' a'])
  expect(setUnreadMark(ids, 'a', false)).toEqual(ids.slice(1))
  expect(setUnreadMark(ids, 'absent', false)).toEqual(ids)
  expect(ids[0]).toBe('a')
  expect(setUnreadMark(['a', 'b', 'a'], 'c', true)).toEqual(['a', 'b', 'c'])
  expect(setUnreadMark(['a', 'b', 'a'], 'a', false)).toEqual(['b'])
})

test('invalid ids and capacity overflow fail without truncation', () => {
  for (const id of ['', 'x'.repeat(ID_LENGTH + 1)]) {
    for (const unread of [true, false]) expect(() => setUnreadMark([], id, unread)).toThrow()
    expect(() => setUnreadMark([id], 'valid', true)).toThrow()
  }
  const longest = 'x'.repeat(ID_LENGTH)
  expect(setUnreadMark([], longest, true)).toEqual([longest])
  const full = Object.freeze(markList(CAPACITY))
  expect(setUnreadMark(full, full[0], true)).toEqual(full)
  expect(setUnreadMark(full, full[0], false)).toEqual(full.slice(1))
  expect(() => setUnreadMark(full, 'overflow', true)).toThrow(RangeError)
  expect(() => setUnreadMark(markList(CAPACITY + 1), 'valid', true)).toThrow(RangeError)
  expect(full.length).toBe(CAPACITY)
})

test('startup and reload navigation record the restored conversation without consuming marks', () => {
  for (const initial of [null, 'opening']) {
    const visits = createUnreadVisitTracker(initial)
    for (const id of [null, 'restored', null, 'latest', 'latest']) expect(visits.observe(id)).toBeNull()
    visits.activity()
    expect(visits.observe('latest')).toBeNull()
    expect(visits.observe('restored')).toBe('restored')
  }
})

test('marking the current conversation survives observation and clears after switching away and back', () => {
  const visits = createUnreadVisitTracker('before-menu')
  visits.activity()
  visits.baseline('marked-current')
  expect(visits.observe('marked-current')).toBeNull()
  expect(visits.observe('other')).toBe('other')
  expect(visits.observe('other')).toBeNull()
  expect(visits.observe('marked-current')).toBe('marked-current')
})

test('leaving for home records the departure and returning consumes the conversation once', () => {
  const visits = createUnreadVisitTracker('current')
  visits.activity()
  expect(visits.observe(null)).toBeNull()
  expect(visits.observe(null)).toBeNull()
  expect(visits.observe('current')).toBe('current')
  expect(visits.observe('current')).toBeNull()
  visits.baseline(null)
  expect(visits.observe('current')).toBe('current')
  const empty = createUnreadVisitTracker()
  empty.activity()
  expect(empty.observe('first')).toBe('first')
})

test('queued writes merge the latest read and remain pending until persistence confirms each mark', async () => {
  const { writer, writes, replace } = writerHarness(Object.freeze(['kept']))
  const first = writer.set('a', true)
  const second = writer.set('b', true)
  const third = writer.set('a', false)
  expect(writer.pending()).toBe(3)
  expect(writes.map(write => write.ids)).toEqual([['kept', 'a']])
  writes[0].result.resolve(['kept', 'a', 'outside'])
  await first
  expect(writer.pending()).toBe(2)
  expect(writes[1].ids).toEqual(['kept', 'a', 'outside', 'b'])
  writes[1].result.resolve(writes[1].ids)
  await second
  expect(writes[2].ids).toEqual(['kept', 'outside', 'b'])
  writes[2].result.resolve(writes[2].ids)
  await third
  replace(['external'])
  const latest = writer.set('c', true)
  expect(writes[3].ids).toEqual(['external', 'c'])
  writes[3].result.resolve(writes[3].ids)
  await latest
  expect(writer.pending()).toBe(0)
})

test('save rejection, null and mismatched membership reject callers while later requests continue', async () => {
  for (const failure of ['rejected', 'null', 'membership'] as const) {
    for (const unread of [true, false]) {
      const initial = unread ? ['kept'] : ['kept', 'target']
      const { writer, writes } = writerHarness(initial)
      const failed = writer.set('target', unread)
      const rejection = expect(failed).rejects.toThrow()
      const next = writer.set('later', true)
      if (failure === 'rejected') writes[0].result.reject(new Error('service failure'))
      else writes[0].result.resolve(failure === 'null' ? null : unread ? [] : ['target'])
      await rejection
      expect(writer.pending()).toBe(1)
      const previous = failure === 'membership' ? unread ? [] : ['target'] : initial
      expect(writes[1].ids).toEqual([...previous, 'later'])
      writes[1].result.resolve(writes[1].ids)
      await next
      expect(writer.pending()).toBe(0)
    }
  }
})

test('validation errors do not call save and synchronous service errors leave the queue usable', async () => {
  const { writer, writes, replace } = writerHarness(markList(CAPACITY))
  await expect(writer.set('overflow', true)).rejects.toThrow(RangeError)
  await expect(writer.set('', false)).rejects.toThrow()
  expect(writes).toHaveLength(0)
  replace([])
  const valid = writer.set('valid', true)
  writes[0].result.resolve(['valid'])
  await valid
  let reads = 0
  const throwing = createUnreadWriter(() => {
    reads += 1
    if (reads === 1) throw new Error('read failed')
    return []
  }, () => { throw new Error('save failed') })
  await expect(throwing.set('a', true)).rejects.toThrow('read failed')
  await expect(throwing.set('b', true)).rejects.toThrow('save failed')
  expect(throwing.pending()).toBe(0)
})

test('malformed persistence results reject even when they contain the requested mark', async () => {
  for (const returned of [['a', ''], ['a', 'x'.repeat(ID_LENGTH + 1)], ['a', ...markList(CAPACITY)]]) {
    const { writer, writes } = writerHarness()
    const result = writer.set('a', true)
    const rejection = expect(result).rejects.toThrow()
    writes[0].result.resolve(returned)
    await rejection
    expect(writer.pending()).toBe(0)
  }
})

test('subscribers observe pending transitions and unsubscribe removes only that subscriber', async () => {
  const { writer, writes } = writerHarness()
  const first: number[] = []
  const second: number[] = []
  const unsubscribe = writer.subscribe(() => first.push(writer.pending()))
  writer.subscribe(() => second.push(writer.pending()))
  const active = writer.set('a', true)
  const queued = writer.set('b', true)
  unsubscribe()
  writes[0].result.resolve(['a'])
  await active
  writes[1].result.resolve(['a', 'b'])
  await queued
  expect(first).toEqual([1, 2])
  expect(second).toEqual([1, 2, 1, 0])
})

test('dispose rejects queued and new requests without cancelling an already issued write or notifying', async () => {
  for (const succeeds of [true, false]) {
    const { writer, writes } = writerHarness()
    const notifications: number[] = []
    writer.subscribe(() => notifications.push(writer.pending()))
    const active = writer.set('issued', true)
    const activeOutcome = succeeds ? expect(active).resolves.toBeUndefined() : expect(active).rejects.toThrow('service failure')
    const queued = writer.set('queued', true)
    const queueOutcome = expect(queued).rejects.toThrow('disposed')
    writer.dispose()
    writer.dispose()
    writer.subscribe(() => { throw new Error('disposed subscriber ran') })
    await queueOutcome
    await expect(writer.set('new', true)).rejects.toThrow('disposed')
    expect(writer.pending()).toBe(1)
    expect(writes).toHaveLength(1)
    if (succeeds) writes[0].result.resolve(['issued'])
    else writes[0].result.reject(new Error('service failure'))
    await activeOutcome
    expect(writer.pending()).toBe(0)
    expect(writes).toHaveLength(1)
    expect(notifications).toEqual([1, 2])
  }
})

test('disposal during an enqueue notification prevents the queued request from starting', async () => {
  const { writer, writes } = writerHarness()
  writer.subscribe(() => writer.dispose())
  await expect(writer.set('never-started', true)).rejects.toThrow('disposed')
  expect(writes).toHaveLength(0)
  expect(writer.pending()).toBe(0)
})

test('an empty navigation id never consumes a mark or replaces the known conversation', () => {
  const visits = createUnreadVisitTracker('known')
  visits.activity()
  visits.baseline('')
  expect(visits.observe('')).toBeNull()
  expect(visits.observe('known')).toBeNull()
  expect(visits.observe('changed')).toBe('changed')
})

test('disposal during the latest preference read prevents issuing a save request', async () => {
  let dispose = () => {}
  let saves = 0
  const writer = createUnreadWriter(() => {
    dispose()
    return []
  }, async ids => {
    saves += 1
    return ids
  })
  dispose = writer.dispose
  await expect(writer.set('not-issued', false)).rejects.toThrow('disposed')
  expect(saves).toBe(0)
  expect(writer.pending()).toBe(0)
})

test('unchanged marks skip persistence immediately and after a queued action changes the latest read', async () => {
  const { writer, writes } = writerHarness(Object.freeze(['marked']))
  await writer.set('marked', true)
  await writer.set('missing', false)
  expect(writes).toHaveLength(0)
  const added = writer.set('new', true)
  const duplicate = writer.set('new', true)
  const absent = writer.set('missing', false)
  expect(writer.pending()).toBe(3)
  writes[0].result.resolve(['marked', 'new'])
  await Promise.all([added, duplicate, absent])
  expect(writes).toHaveLength(1)
  expect(writer.pending()).toBe(0)
})
