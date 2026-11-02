import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'activeShelf',
  order: 264,
  contracts: ['shell.sidebar-logo-row', 'shell.sidebar-toggle', 'session.row-key'],
  ungated: '侧栏顶行多一个铃铛，按下去是此刻正在运行的会话列表：列表本身用的还是宿主自己的会话数据，页面上没有它的时候铃铛只显示一个数',
  stylesheets: [{ file: 'active-shelf.css', rank: 132 }],
  cases: [],
} satisfies FeatureManifest
