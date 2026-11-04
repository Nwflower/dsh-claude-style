import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'sessionActions',
  order: 156,
  ungated: '会话操作集中在原生菜单；右键与菜单键复用省略号入口',
  contracts: ['shell.sidebar-slot'],
  stylesheets: [],
  cases: [],
} satisfies FeatureManifest
