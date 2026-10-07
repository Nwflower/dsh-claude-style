import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'chatFiles',
  order: 220,
  contracts: ['chat.think-running'],
  pref: 'chatAnimations',
  yieldsTo: 'dsh-chat-ux',
  stylesheets: [{ file: 'chat-files.css', rank: 190 }],
  cases: ['chat-files', 'peer-chat-ux'],
  description: {
    zh: {
      title: '文件变更行',
      text: 'run_code 程序里派发出去的写入与编辑带上行尾的 `+n -m` 与可展开的改动卡片，路径可点开文件；失败与中断的行保留裁决信息。',
    },
    en: {
      title: 'File change rows',
      text: 'A write or edit dispatched from inside a run_code program carries the `+n -m` tail and an expandable diff card, and its path opens the file; a failed or interrupted row keeps its verdict.',
    },
  },
} satisfies FeatureManifest
