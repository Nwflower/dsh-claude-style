import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'messageActions',
  order: 231,
  load: 'deferred',
  contracts: ['chat.answer-row', 'chat.flow', 'chat.message-actions', 'chat.message-clock', 'chat.node-key', 'chat.phase', 'chat.turn-attribute', 'chat.turn-tail', 'chat.inherited-history', 'chat.user-kind', 'chat.user-row', 'conversation.session-attribute', 'session.row', 'session.row-key'],
  pref: 'messageActions',
  stylesheets: [{ file: 'message-actions.css', rank: 155 }],
  settingsRows: [{
    tab: 'conversation',
    rank: 25,
    pref: 'messageActions',
    title: 'actionsTitle',
  }],
  cases: [],
  scenarios: ['messageActions', 'messageAnswerActions', 'messageRewindFiles'],
} satisfies FeatureManifest
