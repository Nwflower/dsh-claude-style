import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'viewTabs',
  order: 250,
  pref: 'viewTabs',
  stylesheets: [{ file: 'view-tabs.css', rank: 60 }],
  switchRow: {
    tab: 'conversation',
    rank: 50,
    title: { key: 'viewTabsTitle', fallback: 'Chat / Trajectory tabs' },
    desc: { key: 'viewTabsDesc', fallback: 'Redraw the Chat / Trajectory tab strip at the top of the conversation, lifted onto the title\'s line when it fits. Off restores the host\'s tab strip.' },
  },
  cases: ['view-tabs', 'switches'],
  description: {
    zh: {
      title: '对话 / 轨迹标签条',
      text: '对话区顶部的对话 / 轨迹标签条重画成分段控件，放得下时抬到标题那一行。',
    },
    en: {
      title: 'Chat / Trajectory tabs',
      text: 'The Chat / Trajectory tab strip at the top of the conversation is redrawn as a segmented control and lifted onto the title\'s line when it fits.',
    },
  },
} satisfies FeatureManifest
