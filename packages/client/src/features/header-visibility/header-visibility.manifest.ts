import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'headerVisibility',
  order: 254,
  ungated: '更多操作始终跟随标题，开关只控制其余工具的自动显隐（D76）',
  contracts: [
    'chat.content', 'chat.main-slot', 'fold.toggle', 'header.corner', 'header.element', 'header.more-trigger', 'header.title', 'header.utilities',
    'shell.header-slot', 'shell.menu-trigger', 'shell.phase', 'shell.rightbar-column', 'shell.rightbar-handle',
  ],
  stylesheets: [{ file: 'header-visibility.css', rank: 77 }],
  settingsRows: [{
    tab: 'conversation-header',
    rank: 55,
    pref: 'hideToolbarOutsideConversation',
    title: 'hideToolbarOutsideConversationTitle',
  }],
  cases: ['settings'],
  scenarios: ['sessionPanel'],
} satisfies FeatureManifest
