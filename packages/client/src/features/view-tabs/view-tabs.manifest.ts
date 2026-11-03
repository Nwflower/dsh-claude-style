import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'viewTabs',
  order: 250,
  contracts: ['api.window-controls', 'shell.fullscreen', 'shell.platform', 'shell.top-clearance', 'shell.windows-titlebar', 'header.conversation-tabs', 'header.view-tabs-list'],
  pref: 'viewTabs',
  stylesheets: [{ file: 'view-tabs.css', rank: 60 }],
  settingsRows: [{
    tab: 'conversation',
    rank: 50,
    pref: 'viewTabs',
    title: 'viewTabsTitle',
  }],
  cases: ['view-tabs', 'view-tabs-row', 'switches']
} satisfies FeatureManifest
