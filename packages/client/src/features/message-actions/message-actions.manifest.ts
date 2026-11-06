import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'messageActions',
  order: 231,
  load: 'deferred',
  contracts: ['chat.message-actions', 'chat.message-clock', 'chat.node-key', 'chat.turn-attribute', 'chat.user-kind', 'chat.user-row', 'conversation.session-attribute'],
  pref: 'messageActions',
  stylesheets: [{ file: 'message-actions.css', rank: 155 }],
  settingsRows: [{
    tab: 'conversation',
    rank: 25,
    pref: 'messageActions',
    title: 'actionsTitle',
  }],
  cases: [],
} satisfies FeatureManifest
