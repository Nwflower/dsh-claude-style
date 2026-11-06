import { MANUAL_UNREAD_ID_LIMIT, MANUAL_UNREAD_LIMIT } from '@dsh-claude-style/contracts/prefs'
import { notifyAll } from '@dsh-claude-style/engine/notify'

function validateId(id: string): void {
  if (typeof id !== 'string' || id.length === 0) throw new TypeError('Unread conversation id must be nonempty')
  if (id.length > MANUAL_UNREAD_ID_LIMIT) throw new RangeError('Unread conversation id is too long')
}

function checkedIds(ids: readonly string[]): string[] {
  for (const id of ids) validateId(id)
  const unique = [...new Set(ids)]
  if (unique.length > MANUAL_UNREAD_LIMIT) throw new RangeError('Too many unread conversations')
  return unique
}

/** Conversation ids are opaque: whitespace, case and encoding are significant. */
export function setUnreadMark(ids: readonly string[], id: string, unread: boolean): string[] {
  validateId(id)
  const next = checkedIds(ids)
  if (unread === false) return next.filter(value => value !== id)
  if (next.includes(id)) return next
  if (next.length === MANUAL_UNREAD_LIMIT) throw new RangeError('Too many unread conversations')
  return [...next, id]
}

export function createUnreadVisitTracker(initialId: string | null = null): {
  activity(): void
  baseline(id: string | null): void
  observe(id: string | null): string | null
} {
  let current = initialId
  let active = false
  return {
    activity() { active = true },
    baseline(id) { if (id !== '') current = id },
    observe(id) {
      if (id === '' || id === current) return null
      current = id
      return active && id !== null && id.length > 0 ? id : null
    },
  }
}

type Write = {
  id: string
  unread: boolean
  resolve(): void
  reject(error: unknown): void
}

/** Serializes logical changes against the latest snapshot; savePrefs owns transport and revisions (D75). */
export function createUnreadWriter(
  read: () => readonly string[],
  save: (ids: string[]) => Promise<readonly string[] | null>,
): {
  set(id: string, unread: boolean): Promise<void>
  pending(): number
  subscribe(fn: () => void): () => void
  dispose(): void
} {
  const queue: Write[] = []
  const listeners: (() => void)[] = []
  let running = false
  let disposed = false

  function startNext(): void {
    if (disposed || running) return
    const request = queue.shift()
    if (request === undefined) return
    running = true
    void perform(request)
  }

  async function perform(request: Write): Promise<void> {
    try {
      const before = read()
      const next = setUnreadMark(before, request.id, request.unread)
      if (disposed) throw new Error('Unread writer is disposed')
      if (next.length === before.length && next.every((id, index) => id === before[index])) {
        request.resolve()
        return
      }
      const saved = await save(next)
      if (saved === null) throw new Error('Unread preference was not saved')
      const persisted = checkedIds(saved)
      if (persisted.includes(request.id) !== request.unread) throw new Error('Unread preference did not retain the requested mark')
      request.resolve()
    } catch (error) {
      // Report this action at its caller while independent queued actions continue.
      request.reject(error)
    } finally {
      running = false
      if (disposed === false) {
        notifyAll(listeners)
        startNext()
      }
    }
  }

  return {
    set(id, unread) {
      if (disposed) return Promise.reject(new Error('Unread writer is disposed'))
      const result = new Promise<void>((resolve, reject) => queue.push({ id, unread, resolve, reject }))
      notifyAll(listeners)
      startNext()
      return result
    },
    pending() { return queue.length + Number(running) },
    subscribe(fn) {
      if (disposed) return () => {}
      listeners.push(fn)
      return () => {
        const index = listeners.indexOf(fn)
        if (index >= 0) listeners.splice(index, 1)
      }
    },
    dispose() {
      disposed = true
      listeners.length = 0
      for (const request of queue.splice(0)) request.reject(new Error('Unread writer is disposed'))
    },
  }
}
