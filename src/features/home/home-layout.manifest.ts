import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'homeLayout',
  order: 30,
  pref: 'homeLayout',
  stylesheets: [
    { file: 'home-panel.css', rank: 320 },
    { file: 'home-overview.css', rank: 330 },
    { file: 'home-models.css', rank: 340 },
  ],
  cases: ['hero', 'studio', 'late-forms', 'hdsl', 'hdsl-noskin', 'hdsl-broken'],
  description: {
    zh: {
      title: '首页版面',
      text: '「经典」是居中的问候语与输入卡片；「工作室」把问候语移到左上角、输入卡片贴着窗口底边，中间是用量面板：近期的用量热力图、各模型的用量与费用。',
    },
    en: {
      title: 'Home layout',
      text: 'Classic is the centred greeting over the input card. Studio moves the greeting to the top left, pins the input card to the window\'s bottom edge and fills the space between with a usage panel: a heat map of recent usage and the usage and cost of each model.',
    },
  },
} satisfies FeatureManifest
