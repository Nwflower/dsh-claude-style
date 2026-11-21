import { CHAT_REVEAL_ON } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'chatReveal',
  order: 210,
  contracts: ['api.highlight', 'api.highlight-constructor', 'chat.streaming', 'chat.streaming-attribute', 'conversation.session', 'conversation.session-attribute', 'shell.phase'],
  pref: 'chatReveal',
  prefValues: [CHAT_REVEAL_ON],
  yieldsTo: 'dsh-chat-ux',
  stylesheets: [{ generated: 'reveal-steps', rank: 180, scope: 'feature' }],
  // The row's two answers are the two states themselves: each card names its
  // answer over its own sample and picking it writes that answer, so a card is
  // the answer the row can stand in rather than a picture of one.
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
