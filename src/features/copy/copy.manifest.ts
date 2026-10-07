import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'copy',
  order: 50,
  contracts: ['composer.input'],
  ungated: '提示语跟随输入框改造的范围，问候语跟随首页版面',
  stylesheets: [],
  cases: ['hero', 'late-forms'],
  description: {
    zh: {
      title: '问候语与提示语',
      text: '新会话页的问候语按时段换着说，带上你的名字；输入框的空白提示换成 Claude 的那一句。',
    },
    en: {
      title: 'Greeting and hint',
      text: 'The new-conversation page greets you by name with a line that changes with the time of day, and the empty composer shows Claude\'s own hint.',
    },
  },
} satisfies FeatureManifest
