import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'turnStatus',
  order: 170,
  contracts: ['chat.flow', 'chat.running', 'chat.turn-attribute', 'chat.user-row', 'conversation.session', 'conversation.session-attribute', 'turn.process'],
  pref: 'turnStatus',
  stylesheets: [{ file: 'turn-status.css', rank: 140 }],
  switchRow: {
    tab: 'conversation',
    rank: 10,
    title: { key: 'turnStatusTitle', fallback: 'Turn status line' },
    desc: { key: 'turnStatusDesc', fallback: 'Move the status of a running, stopped or failed turn to the end of the turn\'s work, with the elapsed time, the output tokens and what the model is doing; while a turn runs that line is pinned above the composer, so appended content does not drag it around. Off restores the host\'s turn status.' },
  },
  cases: ['turn-status', 'switches'],
  description: {
    zh: {
      title: '轮次状态行',
      text: '进行中、已停止与失败的轮次，状态移到这一轮工作的末尾：用时、输出的 tokens，以及模型此刻在做什么（或已停止、处理失败）；进行中时这一行钉在输入框上方，内容不断追加时不再跟着上下移动。',
    },
    en: {
      title: 'Turn status line',
      text: 'A running, stopped or failed turn shows its status at the end of the turn\'s work: the elapsed time, the output tokens and what the model is doing now (or that it stopped or failed); while the turn runs the line is pinned above the composer, so content arriving below no longer drags it around.',
    },
  },
} satisfies FeatureManifest
