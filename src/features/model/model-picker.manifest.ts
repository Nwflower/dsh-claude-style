import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'model',
  order: 80,
  pref: 'modelPicker',
  stylesheets: [{ file: 'model-picker.css', rank: 260 }],
  switchRow: {
    tab: 'composer',
    rank: 30,
    title: { key: 'pickerTitle', fallback: 'Redraw the model picker' },
    desc: { key: 'pickerDesc', fallback: 'Replace the composer\'s model menu with the two-level Claude-style menu. Off restores the host\'s model menu.' },
  },
  cases: ['composer', 'settings', 'sync-fault'],
  description: {
    zh: {
      title: '模型选择器',
      text: '输入区的模型菜单换成两级卡片：第一级是官方服务与你挑的快捷供应商，每个模型带厂商标志与一句说明，第二级是其余模型。',
    },
    en: {
      title: 'Model picker',
      text: 'The composer\'s model menu becomes a two-level card: the first level holds the official service and the quick providers you picked, each model with its vendor mark and a line of description; the second level holds the rest.',
    },
  },
} satisfies FeatureManifest
