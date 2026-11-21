import * as React from 'react'
import { reportFeatureFailure } from '@dsh-claude-style/engine/scheduler'
import { ClaudeStyleSwitch } from '../../shared/settings-switch'
import type { SettingsControlsOf, SettingsRowView } from '../../core/feature'
import { copy } from './copy'
import { notificationPermission } from './display'
import type manifest from './attention-notifications.manifest'

export const controls: SettingsControlsOf<typeof manifest> = { 'notification-switch': NotificationSwitch }

function NotificationSwitch({ prefs, write, disabled }: SettingsRowView) {
  const [permission, setPermission] = React.useState(notificationPermission)
  const [requesting, setRequesting] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const mounted = React.useRef(false)
  React.useEffect(() => {
    mounted.current = true
    const refresh = () => { setPermission(notificationPermission()); setFailed(false) }
    window.addEventListener('focus', refresh)
    return () => { mounted.current = false; window.removeEventListener('focus', refresh) }
  }, [])

  async function pick(on: boolean) {
    if (!on) { write({ systemNotifications: false }); return }
    const current = notificationPermission()
    setPermission(current)
    setFailed(false)
    if (current === 'unsupported' || current === 'denied') return
    setRequesting(true)
    try {
      // Browsers require user activation here. The stored preference changes only after consent.
      const result = current === 'granted' ? current : await Notification.requestPermission()
      if (!mounted.current) return
      setPermission(result)
      if (result === 'granted') write({ systemNotifications: true })
    } catch (error) {
      // Keep the settings usable and give the failure to both the reader and diagnostics (D12).
      reportFeatureFailure('systemNotifications', error)
      if (mounted.current) setFailed(true)
    } finally {
      if (mounted.current) setRequesting(false)
    }
  }
  const blocked = permission === 'unsupported' || permission === 'denied'
  const message = failed ? copy('requestFailed') : permission === 'granted' ? null : copy(permission)
  return React.createElement('div', { className: 'dsh-claude-settings-inline-control' },
    React.createElement(ClaudeStyleSwitch, {
      label: copy('notificationsTitle'), on: prefs.systemNotifications,
      onPick: pick, disabled: disabled || requesting || (!prefs.systemNotifications && blocked),
    }),
    message === null ? null : React.createElement('div', { role: 'status' }, message),
  )
}
