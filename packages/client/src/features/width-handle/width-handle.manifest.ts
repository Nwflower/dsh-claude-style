import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'widthHandle',
  order: 263,
  contracts: ['shell.width-handle'],
  ungated: '宽度手柄的亮线等指针停住再出现：读者从对话区边缘掠过时不闪出这条线，按下时立刻看见，拖动全程都在；这是手柄本身的悬停手感，不交给读者开关',
  stylesheets: [{ file: 'width-handle.css', rank: 44 }],
  cases: [],
} satisfies FeatureManifest
