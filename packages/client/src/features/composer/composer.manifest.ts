import { COMPOSER_GAP_COMPACT, COMPOSER_GAP_ROOMY, COMPOSER_GAP_THEME, COMPOSER_SCOPE_ALL, COMPOSER_SCOPE_CONVERSATION, COMPOSER_SCOPE_HERO, CONVERSATION_COMPOSER_REQUIRES } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'composer',
  order: 20,
  contracts: ['chat.question-reply', 'chat.scroller', 'composer.activity-slot', 'composer.attachment-rail', 'composer.bar', 'composer.composing', 'composer.dialog-trigger', 'composer.input', 'composer.mobile-portrait', 'composer.placeholder', 'composer.placeholder-attribute', 'composer.question-card', 'composer.question-option', 'composer.seat', 'composer.stack', 'composer.variant', 'header.conversation-tabs', 'shell.phase'],
  pref: 'composerScope',
  prefValues: [COMPOSER_SCOPE_HERO, COMPOSER_SCOPE_CONVERSATION, COMPOSER_SCOPE_ALL],
  stylesheets: [
    { file: 'vars.css', rank: 78 },
    { file: 'card.css', rank: 80, gate: true },
    { file: 'inline.css', rank: 90, gate: true },
    { file: 'inline-bar.css', rank: 100, gate: true },
    { file: 'bottom-gap.css', rank: 101, gate: true },
  ],
  settingsRows: [{
    tab: 'composer',
    rank: 10,
    pref: 'composerScope',
    title: 'composerTitle',
    choiceLabels: { off: 'scopeOff', hero: 'scopeHero', conversation: 'scopeConversation', all: 'scopeAll' },
  }, {
    tab: 'composer',
    // Right under the restyle it depends on, before the picker rows (rank 30).
    rank: 11,
    pref: 'composerBottomGap',
    parent: 'composerScope',
    title: 'composerBottomGapTitle',
    desc: 'composerBottomGapDesc',
    choiceLabels: {
      [COMPOSER_GAP_COMPACT]: 'gapCompact',
      [COMPOSER_GAP_THEME]: 'gapTheme',
      [COMPOSER_GAP_ROOMY]: 'gapRoomy',
    },
    requires: CONVERSATION_COMPOSER_REQUIRES,
  }],
  cases: ['composer', 'sync-fault', 'hero', 'late-forms']
} satisfies FeatureManifest
