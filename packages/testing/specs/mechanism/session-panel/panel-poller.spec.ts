/**
 * The rail's poll loop under a session switch and a visibility flip: one ask in
 * flight, the newer ask supersedes the older, and only the ask still in flight
 * may deliver its answer, clear the controller or schedule the next poll.
 *
 * @capability session-panel
 * @features session-panel
 * @risk A superseded ask's cleanup clears the newer ask's controller and
 *   schedules a second timer, two polls run side by side, an older answer
 *   overwrites a newer one, a failed ask is read as an answer, or a hidden page
 *   keeps asking.
 */
import { expect, test } from 'vitest'
import { createPanelPoller } from '@dsh-claude-style/client/pure'
import type { PanelPoller, PanelPollerDeps } from '@dsh-claude-style/client/pure'
import type { SessionPanelAnswer } from '@dsh-claude-style/contracts/session-panel'

interface Harness {
  poller: PanelPoller
  answers: { answer: SessionPanelAnswer | null, failed: boolean }[]
  timers: Map<number, () => void>
  fetchCount(): number
  resolve(at: number, answer?: SessionPanelAnswer): Promise<void>
  reject(at: number, error?: unknown): Promise<void>
  runTimers(): Promise<void>
  setHidden(hidden: boolean): void
}

function harness(): Harness {
  let hidden = false
  let nextId = 1
  const timers = new Map<number, () => void>()
  const answers: Harness['answers'] = []
  const asks: { resolve: (value: SessionPanelAnswer) => void, reject: (error: unknown) => void }[] = []
  const deps: PanelPollerDeps = {
    url: () => '/dsh-claude-style/session-panel?id=s',
    fetch: (_url, signal) => new Promise<SessionPanelAnswer>((resolve, reject) => {
      asks.push({ resolve, reject })
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
    }),
    hidden: () => hidden,
    setTimeout: (run) => {
      const id = nextId
      nextId += 1
      timers.set(id, run)
      return id
    },
    clearTimeout: (id) => { timers.delete(id) },
    answer: (answer, failed) => { answers.push({ answer, failed }) },
    pollMs: 2500,
  }
  const flush = () => new Promise(resolve => setTimeout(resolve, 0))
  return {
    poller: createPanelPoller(deps),
    answers,
    timers,
    fetchCount: () => asks.length,
    async resolve(at, answer = { ok: true } as unknown as SessionPanelAnswer) {
      asks[at].resolve(answer)
      await flush()
    },
    async reject(at, error = new Error('HTTP 500')) {
      asks[at].reject(error)
      await flush()
    },
    async runTimers() {
      const due = [...timers.values()]
      timers.clear()
      for (const run of due) run()
      await flush()
    },
    setHidden(next) { hidden = next },
  }
}

test('one ask in flight, then exactly one timer for the next', async () => {
  const h = harness()
  h.poller.start()
  expect(h.fetchCount()).toBe(1)
  await h.resolve(0)
  expect(h.answers).toHaveLength(1)
  expect(h.timers.size).toBe(1)
  await h.runTimers()
  expect(h.fetchCount()).toBe(2)
})

test('a visibility flip supersedes the ask in flight without doubling the timer', async () => {
  const h = harness()
  h.poller.start()
  h.poller.wake()
  expect(h.fetchCount()).toBe(2)
  // The superseded ask's cleanup must not clear the newer controller or schedule.
  await h.resolve(0)
  await h.reject(0)
  expect(h.answers).toHaveLength(0)
  await h.resolve(1)
  expect(h.answers).toHaveLength(1)
  expect(h.timers.size).toBe(1)
})

test('a failed ask reports a failure, and the loop keeps polling', async () => {
  const h = harness()
  h.poller.start()
  await h.reject(0)
  expect(h.answers).toEqual([{ answer: null, failed: true }])
  expect(h.timers.size).toBe(1)
})

test('a hidden page asks nothing until it is visible again', async () => {
  const h = harness()
  h.setHidden(true)
  h.poller.start()
  expect(h.fetchCount()).toBe(0)
  expect(h.timers.size).toBe(1)
  h.poller.wake()
  expect(h.fetchCount()).toBe(0)
  h.setHidden(false)
  h.poller.wake()
  expect(h.fetchCount()).toBe(1)
})

test('a stopped loop delivers nothing and leaves no timer', async () => {
  const h = harness()
  h.poller.start()
  h.poller.stop()
  await h.resolve(0)
  await h.reject(0)
  expect(h.answers).toHaveLength(0)
  expect(h.timers.size).toBe(0)
})
