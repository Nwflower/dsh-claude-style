import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'manualUnread',
  order: 154,
  pref: 'manualUnread',
  contracts: ['shell.sidebar-slot', 'session.row-key'],
  stylesheets: [{ file: 'manual-unread.css', rank: 116 }],
  settingsRows: [{ tab: 'sidebar', rank: 34, pref: 'manualUnread', title: 'unreadTitle', desc: 'unreadDesc' }],
  cases: [],
} satisfies FeatureManifest
