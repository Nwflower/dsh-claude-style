import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'turnStatus',
  order: 170,
  pref: 'turnStatus',
  stylesheets: [{ file: 'turn-status.css', rank: 140 }],
  switchRow: {
    tab: 'conversation',
    rank: 10,
    title: { key: 'turnStatusTitle', fallback: 'Turn status line' },
    desc: { key: 'turnStatusDesc', fallback: 'Move the status of a running, stopped or failed turn to the end of the turn\'s work, with the elapsed time, the output tokens and what the model is doing. Off restores the host\'s turn status.' },
  },
  cases: ['turn-status', 'switches'],
  description: {
    zh: {
      title: '轮次状态行',
      text: '进行中、已停止与失败的轮次，状态移到这一轮工作的末尾：用时、输出的 tokens，以及模型此刻在做什么（或已停止、处理失败）。',
    },
    en: {
      title: 'Turn status line',
      text: 'A running, stopped or failed turn shows its status at the end of the turn\'s work: the elapsed time, the output tokens and what the model is doing now (or that it stopped or failed).',
    },
  },
} satisfies FeatureManifest
