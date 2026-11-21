import { reportFeatureFailure } from '@dsh-claude-style/engine/scheduler'
import type { AttentionChange } from '../sound-cues/attention'
import { copy } from './copy'

export function notificationPermission(browser: { Notification?: typeof Notification } = window): NotificationPermission | 'unsupported' {
  const api = browser.Notification
  if (typeof api !== 'function' || typeof api.requestPermission !== 'function') return 'unsupported'
  return api.permission
}

/** Each page owns the notifications it opened, including the ones still in the system tray. */
export function createNotificationDisplay() {
  const open = new Set<Notification>()
  function release(note: Notification) {
    note.onclick = null
    note.onclose = null
    note.onerror = null
    open.delete(note)
  }
  function close(note: Notification) {
    release(note)
    note.close()
  }
  return {
    show(change: AttentionChange) {
      const permission = notificationPermission()
      if (permission !== 'granted') {
        reportFeatureFailure('systemNotifications', new Error(`Notification permission: ${permission}`))
        return null
      }
      try {
        const note = new Notification(copy('notificationTitle'), {
          body: copy(change.event), tag: `dsh-claude-style:attention:${change.sessionId}`, silent: true,
        })
        open.add(note)
        note.onclick = () => { close(note); window.focus() }
        note.onclose = () => { release(note) }
        note.onerror = () => {
          release(note)
          reportFeatureFailure('systemNotifications', new Error('The browser could not display the notification'))
        }
        return note
      } catch (error) {
        // Some platforms expose Notification but reject page-created notifications (D12).
        reportFeatureFailure('systemNotifications', error)
        return null
      }
    },
    clear() { for (const note of open) close(note) },
  }
}
