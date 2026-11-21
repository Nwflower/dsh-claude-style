import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'activeFirst',
  order: 262,
  contracts: ['session.row-key', 'session.row', 'session.phase', 'session.ongoing-state', 'session.ongoing'],
  ungated: '按更新时间排序时，正在运行的会话临时显示在本段置顶会话之后；手动排序和日期视图保留各自的顺序',
  stylesheets: [{ file: 'active-first.css', rank: 133 }],
  cases: [],
} satisfies FeatureManifest
