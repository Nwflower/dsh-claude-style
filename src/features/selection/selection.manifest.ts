import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'selection',
  order: 10,
  contracts: [],
  ungated: '修宿主失焦时的选区颜色，不改变功能',
  stylesheets: [],
  cases: [],
  description: {
    zh: {
      title: '失焦时的选区颜色',
      text: '窗口失去焦点时，选中的文字换成失焦的配色，回到窗口时换回来，与系统里别的程序一致。',
    },
    en: {
      title: 'Selection colour while unfocused',
      text: 'Selected text takes the unfocused colours while the window is in the background and the focused ones when it comes back, as other applications do.',
    },
  },
} satisfies FeatureManifest
