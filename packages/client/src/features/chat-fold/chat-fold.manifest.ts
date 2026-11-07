import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'chatFold',
  order: 200,
  contracts: ['chat.assistant-step-kind', 'chat.flow', 'chat.follow-threshold', 'chat.group-part', 'chat.group-part-reasoning', 'chat.message-bubble', 'chat.motion-scope', 'chat.phase', 'chat.process-member', 'chat.reasoning-text', 'chat.scroller', 'chat.shimmer', 'chat.shimmer-attribute', 'chat.streaming-attribute', 'chat.think-row', 'chat.think-running', 'chat.tool-call-kind', 'chat.turn-attribute', 'chat.user-kind', 'chat.user-row', 'composer.composing', 'composer.echo', 'fold.disclosure', 'fold.disclosure-header', 'fold.expanded', 'fold.skipped', 'fold.toggle', 'process.activity', 'process.body', 'process.expanded-mode', 'process.group', 'process.header-label'],
  pref: 'chatAnimations',
  yieldsTo: 'dsh-chat-ux',
  stylesheets: [
    { file: 'fold.css', rank: 170 },
    { file: 'message-fold.css', rank: 205 },
    { file: 'fold-motion.css', rank: 210 },
  ],
  settingsRows: [{
    tab: 'motion',
    // 排在动效页末尾：这一行说的是思考文字怎么出现，与上面那些开关不属于同一类调整。
    rank: 50,
    pref: 'reasoningDisplay',
    title: 'reasoningDisplayTitle',
    desc: 'reasoningDisplayDesc',
    choiceLabels: {
      continuous: 'reasoningDisplayContinuous',
      stepped: 'reasoningDisplayStepped',
    },
  }],
  cases: ['chat-fold', 'peer-chat-ux']
} satisfies FeatureManifest
