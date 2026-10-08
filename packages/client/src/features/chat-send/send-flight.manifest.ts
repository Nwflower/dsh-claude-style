import { CHAT_ANIMATIONS_ENHANCED, CHAT_ANIMATIONS_REDRAW } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'chatSend',
  order: 230,
  load: 'deferred',
  contracts: ['chat.flow', 'chat.user-kind', 'chat.user-row', 'composer.card', 'composer.echo', 'composer.input', 'composer.scroll', 'shell.slot-anchor'],
  pref: 'chatAnimations',
  prefValues: [CHAT_ANIMATIONS_ENHANCED, CHAT_ANIMATIONS_REDRAW],
  yieldsTo: 'dsh-chat-ux',
  stylesheets: [{ file: 'send-flight.css', rank: 200 }],
  cases: ['chat-send'],
  description: {
    zh: {
      title: '聊天气泡动效',
      text: '提交消息时输入卡片浮起、一路收成那条气泡：飞行的这一份从第一帧就是气泡的颜色，草稿里的字跟着形状重新排，最后接上真实的消息行——真实气泡在下面先显示出来，飞行的那份淡出，文字逐渐变清晰。',
    },
    en: {
      title: 'Send flight',
      text: 'On submission the composer card lifts and narrows into the bubble as it travels, the flying copy carrying the bubble\'s colour from its first frame and its words re-flowing into the shape; it meets the message row, where the real bubble shows underneath and the flying copy fades out, so the words sharpen into place.',
    },
  },
} satisfies FeatureManifest
