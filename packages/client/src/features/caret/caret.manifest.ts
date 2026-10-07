import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'caret',
  order: 240,
  contracts: ['composer.input', 'composer.textarea'],
  pref: 'caretMotion',
  yieldsTo: 'dsh-chat-ux',
  stylesheets: [{ file: 'caret.css', rank: 220 }],
  cases: ['caret'],
  description: {
    zh: {
      title: '输入框插入符动效',
      text: '输入框里的光标由插件自己绘制，移动时滑过去；提问卡片的作答框与排队消息的行内编辑框同样覆盖。设置页的「对话」页有三档：每一格（默认）、只在移动时、关闭。',
    },
    en: {
      title: 'Composer caret motion',
      text: 'The composer\'s text caret is drawn by the plugin and glides when it moves; a question card\'s answer box and a queued message\'s inline editor are covered as well. The Conversation tab offers Every move (the default), Explicit moves and Off.',
    },
  },
} satisfies FeatureManifest
