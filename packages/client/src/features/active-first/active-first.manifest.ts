import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'activeFirst',
  order: 262,
  contracts: ['session.row-key', 'session.row', 'session.phase', 'session.ongoing-state', 'session.ongoing'],
  ungated: '正在运行的会话排在它所在那一列的开头，行本身还是宿主画的那些行，只是顺序跟着状态走；读者看到哪几个会话在跑，顺序就跟着变，不必再设一个开关',
  stylesheets: [],
  cases: [],
} satisfies FeatureManifest