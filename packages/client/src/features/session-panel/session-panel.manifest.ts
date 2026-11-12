import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'sessionPanel',
  order: 267,
  pref: 'sessionPanel',
  // The rail mounts its own root on the page; it joins the first frames so a
  // late chunk cannot land inside a settled page's quiet window (D94).
  contracts: ['conversation.session-attribute', 'conversation.session', 'sidebar.chat', 'chat.scroller', 'chat.user-row', 'header.action-chips', 'shell.rightbar-column', 'shell.rightbar-toggle', 'shell.bottom-panel'],
  stylesheets: [{ file: 'session-panel.css', rank: 122 }],
  settingsRows: [{
    tab: 'conversation',
    rank: 85,
    pref: 'sessionPanel',
    title: 'sessionPanelTitle',
    desc: 'sessionPanelDesc',
  }],
  cases: [],
  scenarios: ['sessionPanel'],
} satisfies FeatureManifest
