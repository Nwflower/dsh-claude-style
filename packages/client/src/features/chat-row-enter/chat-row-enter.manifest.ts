import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'chatRowEnter',
  order: 226,
  contracts: ['chat.user-row', 'chat.tool-call-kind', 'chat.context-kind', 'chat.assistant-step-kind', 'chat.group-part', 'chat.group-part-reasoning', 'chat.node', 'chat.turn-attribute', 'chat.running', 'chat.running-holding', 'chat.scroller'],
  pref: 'chatAnimations',
  stylesheets: [{ file: 'row-enter.css', rank: 196 }],
  cases: [],
} satisfies FeatureManifest
