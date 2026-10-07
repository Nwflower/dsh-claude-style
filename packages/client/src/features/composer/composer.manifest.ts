import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'composer',
  order: 20,
  contracts: ['chat.scroller', 'composer.input', 'composer.placeholder', 'composer.seat', 'composer.stack', 'composer.variant'],
  pref: 'composerScope',
  stylesheets: [
    { file: 'card.css', rank: 80, gate: true },
    { file: 'inline.css', rank: 90, gate: true },
    { file: 'inline-bar.css', rank: 100, gate: true },
  ],
  cases: ['composer', 'sync-fault'],
  description: {
    zh: {
      title: '输入区',
      text: '新会话页与对话页的输入卡片按 Claude Code Desktop 的样子重画：附件排成一行缩略图，上下文用量是工具栏里的一个圆环，点卡片的空白处就能开始输入，卡片变高时停在底部的对话跟着上移。设置页「输入区」可以选只改新会话页、只改对话页、两处都改或关闭。',
    },
    en: {
      title: 'Composer',
      text: 'The input card on the new-conversation page and in conversations is redrawn after Claude Code Desktop: attachments sit in one row of tiles, the context usage is a ring in the toolbar, a press anywhere on the card starts typing, and a conversation resting at the bottom moves up with the card as it grows. The Composer tab chooses the home page alone, the conversation alone, both, or neither.',
    },
  },
} satisfies FeatureManifest
