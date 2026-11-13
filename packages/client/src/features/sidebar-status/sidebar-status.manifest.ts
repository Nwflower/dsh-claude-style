import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'sidebarStatus',
  order: 153,
  ungated: '侧栏原生状态显示在行首或行尾，状态本身仍由宿主管理',
  contracts: ['shell.sidebar-slot', 'session.row-key', 'session.phase', 'session.workspace-row', 'session.workspace-expanded', 'workspace.leading-outlet'],
  stylesheets: [{ file: 'sidebar-status.css', rank: 117 }],
  /**
   * The Motion tab's Ongoing conversations row chooses the look; where that
   * look stands belongs to the row it stands in, so this control sits in that
   * row's title line.
   */
  settingsRows: [{
    tab: 'motion',
    rank: 45,
    pref: 'ongoingIndicatorSide',
    parent: 'ongoingIndicator',
    placement: 'header',
    title: 'sideTitle',
    choiceLabels: { left: 'sideLeft', right: 'sideRight' },
  }],
  cases: [],
} satisfies FeatureManifest
