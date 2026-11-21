import { createAttentionFeed } from '../sound-cues/attention-feed'
import { createNotificationBatch, notificationsInBackground } from './batch'
import { createNotificationDisplay } from './display'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './attention-notifications.manifest'

export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const background = () => notificationsInBackground(document.hidden, document.hasFocus())
  const display = createNotificationDisplay()
  const batch = createNotificationBatch(change => {
    if (background()) display.show(change)
  })
  const feed = createAttentionFeed(ctx, (event, sessionId) => {
    if (background()) batch.add({ event, sessionId })
  })
  function clear() {
    batch.clear()
    display.clear()
  }
  function onVisibility() {
    if (!background()) clear()
  }
  window.addEventListener('focus', onVisibility)
  document.addEventListener('visibilitychange', onVisibility)
  ui.systemNotifications = {}
  return () => {
    window.removeEventListener('focus', onVisibility)
    document.removeEventListener('visibilitychange', onVisibility)
    feed.dispose()
    clear()
    delete ui.systemNotifications
  }
}
