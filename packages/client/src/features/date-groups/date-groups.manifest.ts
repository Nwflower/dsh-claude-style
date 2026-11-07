import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'dateGroups',
  // 排在「正在运行的会话在前」之后：同一个列表，先把在跑的抬到本段开头，再交给日期分段。
  order: 266,
  contracts: ['session.row', 'session.row-key'],
  // 日期分段是默认排法，但读者可以关掉它，回到宿主自己的分组（按工作区 / 工作区树 / 扁平）；
  // 关掉后本特性整个卸载，铃铛也不再响应。
  pref: 'dateGroups',
  stylesheets: [{ file: 'date-groups.css', rank: 134 }],
  settingsRows: [{
    tab: 'sidebar',
    // 排在视图切换（32）与侧栏若干开关之后：日期分段是把列表重新分段，站在列表的排法一侧。
    rank: 40,
    pref: 'dateGroups',
    title: 'dateGroupsTitle',
    desc: 'dateGroupsDesc',
  }],
  cases: [],
} satisfies FeatureManifest
