import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'dateGroups',
  // 排在「正在运行的会话在前」之后：同一个列表，先把在跑的抬到本段开头，再交给日期分段。
  order: 266,
  contracts: ['session.row', 'session.row-key'],
  pref: 'dateGroups',
  stylesheets: [{ file: 'date-groups.css', rank: 134 }],
  settingsRows: [{
    tab: 'sidebar',
    rank: 34,
    pref: 'dateGroups',
    title: 'groupsTitle',
    desc: 'groupsDesc',
  }],
  cases: [],
} satisfies FeatureManifest
