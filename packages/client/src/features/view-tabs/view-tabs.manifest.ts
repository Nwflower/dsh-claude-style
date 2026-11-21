import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'viewTabs',
  order: 250,
  contracts: ['header.conversation-tabs', 'header.conversation-active-tab', 'header.conversation-tab', 'header.corner', 'header.element', 'header.row', 'header.utilities', 'header.view-tabs-list', 'shell.header-slot'],
  pref: 'viewTabs',
  stylesheets: [{ file: 'view-tabs.css', rank: 60 }],
  settingsRows: [{
    tab: 'conversation',
    rank: 50,
    pref: 'viewTabs',
    title: 'viewTabsTitle',
  }],
  cases: ['view-tabs', 'switches'],
  scenarios: ['sessionPanel'],
} satisfies FeatureManifest
