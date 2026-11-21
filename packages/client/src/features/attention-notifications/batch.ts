import type { AttentionChange } from '../sound-cues/attention'

export function notificationsInBackground(hidden: boolean, focused: boolean) {
  return hidden || !focused
}

/** The first change starts the 200 ms window. A prompt takes precedence across sessions (D89). */
export function createNotificationBatch(deliver: (change: AttentionChange) => void) {
  let timer: number | null = null
  let pending: AttentionChange | null = null
  function clear() {
    if (timer !== null) window.clearTimeout(timer)
    timer = null
    pending = null
  }
  return {
    add(change: AttentionChange) {
      if (pending === null || (pending.event === 'finished' && change.event === 'permission')) pending = change
      if (timer !== null) return
      timer = window.setTimeout(() => {
        const next = pending
        clear()
        if (next !== null) deliver(next)
      }, 200)
    },
    clear,
  }
}
