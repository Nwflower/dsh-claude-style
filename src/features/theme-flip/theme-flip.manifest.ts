import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'themeFlip',
  order: 140,
  contracts: ['shell.dark-theme'],
  ungated: '修主题切换瞬间的颜色跳变，不改变功能',
  stylesheets: [{ file: 'theme-flip.css', rank: 370 }],
  cases: [],
  description: {
    zh: {
      title: '亮暗切换一步到位',
      text: '切换亮色与暗色时，边框、阴影与底色在同一帧换好，不会先换颜色、再慢慢补上边框。',
    },
    en: {
      title: 'One-frame theme switch',
      text: 'Switching between light and dark changes borders, shadows and fills in the same frame, instead of the colours first and the borders easing in after.',
    },
  },
} satisfies FeatureManifest
