import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'sessionPanel',
  order: 267,
  pref: 'sessionPanel',
  // The sections live in the host's session panel; the page mark follows that
  // panel, the header's work chips step aside while it shows (D113), and the
  // sections carry skin-side folding while the host's section contract holds (D113).
  contracts: ['conversation.session-panel', 'conversation.session-panel-section', 'conversation.session-panel-section-actions', 'header.action-chips'],
  // The two figures tables print the statistics feature's live reading, the same
  // one the composer's line prints (features/session-panel/session-panel-figures.ts).
  reads: ['contextStats'],
  stylesheets: [{ file: 'session-panel.css', rank: 122 }, { file: 'session-panel-context.css', rank: 124 }],
  settingsRows: [{
    tab: 'sidebar',
    rank: 60,
    pref: 'sessionPanel',
    title: 'sessionPanelTitle',
    desc: 'sessionPanelDesc',
  }],
  cases: [],
  scenarios: ['sessionPanel'],
} satisfies FeatureManifest
