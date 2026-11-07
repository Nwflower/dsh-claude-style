import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'dateGroups',
  // 排在「正在运行的会话在前」之后：同一个列表，先把在跑的抬到本段开头，再交给日期分段。
  order: 266,
  contracts: ['session.row', 'session.row-key'],
  ungated: '日期视图默认关着：侧栏按宿主自己的分组排，按下标题行的铃铛才排成日期段落，这次选择不跨刷新保留；列表本身仍是宿主画的那一张',
  stylesheets: [{ file: 'date-groups.css', rank: 134 }],
  cases: [],
} satisfies FeatureManifest
