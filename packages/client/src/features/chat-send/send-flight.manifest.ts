import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'chatSend',
  order: 230,
  contracts: ['chat.flow', 'chat.user-kind', 'composer.card', 'composer.echo', 'composer.input', 'composer.scroll', 'shell.slot-anchor'],
  pref: 'chatAnimations',
  yieldsTo: 'dsh-chat-ux',
  stylesheets: [{ file: 'send-flight.css', rank: 200 }],
  cases: ['chat-send'],
  description: {
    zh: {
      title: '聊天气泡动效',
      text: '提交消息时输入卡片原样浮起、一路收成那条气泡，草稿里的字跟着形状重新排，落地正好接上真实的消息行：真实气泡在下面先显示出来，飞行的那份淡出，文字逐渐变清晰。',
    },
    en: {
      title: 'Send flight',
      text: 'On submission the composer card lifts as it is and narrows into the bubble as it travels, its words re-flowing into the shape, landing on the message row: the real bubble shows underneath and the flying copy fades out, so the words sharpen into place.',
    },
  },
} satisfies FeatureManifest
