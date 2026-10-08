import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'peakrate',
  order: 75,
  pref: 'peakrate',
  stylesheets: [{ file: 'peakrate.css', rank: 265 }],
  cases: ['composer', 'settings', 'model-meter'],
  contracts: [],
  description: {
    zh: {
      title: '峰谷电表',
      text: '模型选择器的每一行标出该模型此刻的峰谷：峰价、谷价与限时活动三种状态各有自己的图标，颜色表示贵还是便宜，并跟上距离切换还有多久；悬停读到完整的一条，讲出此刻的判定与切换后的状态。各家供应商按各自时区的作息判定，法定节假日整日算谷价，跨零点与夏令时都按真实时刻计算。',
    },
    en: {
      title: 'Peak rate meter',
      text: 'Every row of the model picker carries the rate in force for that model right now: peak, off-peak and a dated promotion each get their own mark, the colour says expensive or cheap, and the countdown says how long it lasts; hovering reads the whole judgement, the state in force and what it becomes and when. Each provider is judged on its own clock, public holidays are off-peak in full, and windows crossing midnight and daylight-saving changes are resolved against real instants.',
    },
  },
} satisfies FeatureManifest
