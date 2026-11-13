import { CHAT_REVEAL_ON } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'chatReveal',
  order: 210,
  contracts: ['api.highlight', 'api.highlight-constructor', 'chat.streaming', 'chat.streaming-attribute', 'conversation.session', 'conversation.session-attribute', 'shell.phase'],
  pref: 'chatReveal',
  prefValues: [CHAT_REVEAL_ON],
  yieldsTo: 'dsh-chat-ux',
  stylesheets: [{ generated: 'reveal-steps', rank: 180 }],
  settingsRows: [{
    tab: 'motion',
    rank: 20,
    pref: 'chatReveal',
    title: 'chatRevealTitle',
    control: 'reveal-preview',
    stillWhenReduced: true,
  }],
  cases: ['chat-reveal'],
  scenarios: ['reasoningStream', 'reasoningContinuous'],
} satisfies FeatureManifest
