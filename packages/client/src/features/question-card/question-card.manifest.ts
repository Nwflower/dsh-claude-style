import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'questionCard',
  order: 21,
  contracts: ['chat.content', 'chat.flow-slot', 'chat.question-reply', 'chat.scroller', 'composer.fallback-panel', 'composer.question-body', 'composer.question-card', 'composer.question-option', 'composer.seat'],
  pref: 'questionCard',
  stylesheets: [{ file: 'question-card.css', rank: 81 }],
  settingsRows: [{
    tab: 'composer',
    // After the restyle and its gap: the card stands apart from the composer's own look.
    rank: 12,
    pref: 'questionCard',
    title: 'questionCardTitle',
    desc: 'questionCardDesc',
  }],
  cases: ['composer'],
} satisfies FeatureManifest
