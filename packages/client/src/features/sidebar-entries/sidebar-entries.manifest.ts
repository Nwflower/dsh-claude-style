import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'sidebarEntries',
  order: 157,
  contracts: ['shell.menu'],
  pref: 'sidebarEntries',
  stylesheets: [{ file: 'sidebar-entries.css', rank: 113 }],
  settingsRows: [{
    tab: 'sidebar',
    rank: 30,
    pref: 'sidebarEntries',
    title: 'entriesTitle',
  }],
  cases: [],
} satisfies FeatureManifest
