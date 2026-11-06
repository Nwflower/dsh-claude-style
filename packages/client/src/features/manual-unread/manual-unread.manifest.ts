import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'manualUnread',
  order: 154,
  ungated: '未读标记是会话菜单里的一项操作，标记跟着配置保存，页面上不另设开关',
  contracts: ['shell.sidebar-slot', 'session.row-key'],
  stylesheets: [{ file: 'manual-unread.css', rank: 116 }],
  cases: [],
} satisfies FeatureManifest
