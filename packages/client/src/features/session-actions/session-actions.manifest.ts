import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'sessionActions',
  order: 156,
  ungated: '右键与菜单键复用会话行原有的省略号入口；行内按钮与原生菜单都保持宿主的样子',
  contracts: ['shell.sidebar-slot'],
  stylesheets: [],
  cases: [],
} satisfies FeatureManifest
