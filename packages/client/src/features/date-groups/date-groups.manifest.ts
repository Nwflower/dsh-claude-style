import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'dateGroups',
  // 排在「正在运行的会话在前」之后：同一个列表，先把在跑的抬到本段开头，再交给日期分段。
  order: 266,
  contracts: ['session.row', 'session.row-key'],
  ungated: '按日期分段是侧栏列表的默认排法，铃铛随时在工作区视图与日期视图之间换；列表本身仍是宿主画的那一张，不另设开关',
  stylesheets: [{ file: 'date-groups.css', rank: 134 }],
  cases: [],
} satisfies FeatureManifest
