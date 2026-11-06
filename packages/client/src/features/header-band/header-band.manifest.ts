import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'headerBand',
  order: 255,
  contracts: [
    'api.window-controls', 'shell.fullscreen', 'shell.platform', 'shell.top-clearance', 'shell.windows-titlebar', 'shell.windows-menu',
    'shell.rightbar-toggle',
    'header.row', 'header.title', 'header.utilities', 'header.corner', 'header.element', 'header.view-tabs',
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
