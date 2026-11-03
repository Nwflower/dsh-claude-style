import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'sidebarPeek',
  order: 155,
  contracts: ['shell.sidebar-toggle', 'shell.sidebar-root', 'shell.sidebar-collapsed', 'shell.rightbar-collapsed', 'shell.sidebar-beside-rightbar', 'shell.windows-menu-start', 'shell.foreground', 'shell.sidebar-drawer'],
  pref: 'sidebarPeek',
  stylesheets: [{ file: 'sidebar-peek.css', rank: 112 }],
  settingsRows: [{
    tab: 'sidebar',
    rank: 35,
    pref: 'sidebarPeek',
    title: 'peekTitle',
    desc: 'peekDesc',
  }],
  cases: [],
} satisfies FeatureManifest
