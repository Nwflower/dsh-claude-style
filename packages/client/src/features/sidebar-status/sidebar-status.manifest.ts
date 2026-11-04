import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'sidebarStatus',
  order: 153,
  ungated: '侧栏原生状态显示在末端，状态本身仍由宿主管理',
  contracts: ['shell.sidebar-slot', 'session.phase', 'workspace.leading-outlet'],
  stylesheets: [{ file: 'sidebar-status.css', rank: 117 }],
  cases: [],
} satisfies FeatureManifest
