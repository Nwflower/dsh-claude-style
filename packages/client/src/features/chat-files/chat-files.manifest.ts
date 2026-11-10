import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'chatFiles',
  order: 220,
  contracts: ['chat.call', 'chat.flow-block', 'chat.think-running', 'process.content'],
  pref: 'chatAnimations',
  yieldsTo: 'dsh-chat-ux',
  stylesheets: [{ file: 'chat-files.css', rank: 190 }],
  cases: ['chat-files', 'peer-chat-ux'],
  scenarios: ['fileMerge'],
} satisfies FeatureManifest
