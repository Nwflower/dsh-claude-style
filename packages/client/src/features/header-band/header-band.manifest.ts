import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'headerBand',
  order: 255,
  reads: ['viewTabs'],
  contracts: [
    'api.window-controls', 'shell.fullscreen', 'shell.platform', 'shell.top-clearance', 'shell.windows-titlebar', 'shell.windows-menu',
    'shell.rightbar-toggle', 'shell.rightbar-toggle-control', 'shell.rightbar-panel', 'shell.rightbar-open',
    'header.row', 'header.title', 'header.actions', 'header.utilities', 'header.corner', 'header.element', 'header.more-trigger',
  ],
  pref: 'headerBand',
  stylesheets: [{ file: 'header-band.css', rank: 75 }],
  settingsRows: [{
    tab: 'conversation',
    rank: 60,
    pref: 'headerBand',
    title: 'headerBandTitle',
    desc: 'headerBandDesc',
    windowsOnly: true,
  }],
  cases: ['header-band', 'switches']
} satisfies FeatureManifest
