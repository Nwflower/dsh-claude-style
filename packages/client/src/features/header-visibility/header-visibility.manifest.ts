import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'headerVisibility',
  order: 254,
  ungated: '更多操作始终跟随标题，开关只控制其余工具的自动显隐（D76）',
  contracts: [
    'api.window-controls', 'chat.content', 'chat.main-slot', 'header.corner', 'header.element', 'header.more-trigger', 'header.title', 'header.utilities', 'shell.fullscreen',
    'shell.header-slot', 'shell.phase', 'shell.platform', 'shell.sidebar-root', 'shell.top-clearance', 'shell.windows-titlebar',
  ],
  stylesheets: [{ file: 'header-visibility.css', rank: 77 }],
  settingsRows: [{
    tab: 'conversation',
    rank: 55,
    pref: 'hideToolbarOutsideConversation',
    title: 'hideToolbarOutsideConversationTitle',
    desc: 'hideToolbarOutsideConversationDesc',
  }],
  cases: ['settings'],
  scenarios: ['sessionPanel'],
} satisfies FeatureManifest
