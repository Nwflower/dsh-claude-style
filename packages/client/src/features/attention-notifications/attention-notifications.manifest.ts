import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'systemNotifications',
  order: 51,
  contracts: [],
  pref: 'systemNotifications',
  stylesheets: [],
  settingsRows: [{
    tab: 'general', rank: 61, pref: 'systemNotifications',
    title: 'notificationsTitle', desc: 'notificationsDesc', control: 'notification-switch', controlLayout: 'inline',
  }],
  cases: ['settings'],
} satisfies FeatureManifest
