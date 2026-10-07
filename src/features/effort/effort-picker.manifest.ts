import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'effort',
  order: 90,
  pref: 'modelPicker',
  stylesheets: [{ file: 'effort-picker.css', rank: 270 }],
  cases: [],
  description: {
    zh: {
      title: '工作强度',
      text: '模型旁边有一个自己的工作强度按钮，点开是一条滑杆；它跟着模型选择器一起开关，因为宿主把工作强度放在自己的模型菜单里。',
    },
    en: {
      title: 'Effort',
      text: 'The reasoning effort gets a trigger of its own beside the model, opening a slider. It switches with the model picker, since the host keeps the effort inside its own model menu.',
    },
  },
} satisfies FeatureManifest
