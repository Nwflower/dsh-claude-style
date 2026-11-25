import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'turnNav',
  order: 180,
  load: 'deferred',
  contracts: ['boot.peer-sheet', 'chat.scroller', 'chat.turn-attribute', 'conversation.session', 'conversation.session-attribute', 'shell.foreground', 'turn.rail', 'turn.rail-current', 'turn.rail-inset', 'turn.rail-mark', 'turn.rail-pitch', 'turn.rail-scroller'],
  ungated: '消息导航随主题常驻开启，不再提供设置开关',
  stylesheets: [{ file: 'turn-nav.css', rank: 150 }],
  cases: ['turn-nav']
} satisfies FeatureManifest
