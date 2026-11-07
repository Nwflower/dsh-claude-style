import { MASCOT_BRAND, MASCOT_CRAB, MASCOT_DEEPY, MASCOT_WHALEGIRL } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'mascot',
  order: 40,
  load: 'deferred',
  reads: ['composer', 'contextStats'],
  contracts: ['chat.think-running', 'composer.fallback-panel', 'composer.seat', 'composer.stack', 'conversation.session', 'conversation.session-attribute'],
  pref: 'mascot',
  prefValues: [MASCOT_BRAND, MASCOT_CRAB, MASCOT_DEEPY, MASCOT_WHALEGIRL],
  stylesheets: [
    { file: 'mascot-frame.css', rank: 345 },
    { file: 'crab.css', rank: 350 },
    { file: 'whale.css', rank: 360 },
    { file: 'whale-girl.css', rank: 365 },
    { file: 'mascot-bubble.css', rank: 367 },
  ],
  settingsRows: [{
    tab: 'appearance',
    rank: 30,
    pref: 'mascot',
    title: 'mascotTitle',
    desc: 'mascotDesc',
    choiceLabels: { brand: 'mascotBrand', crab: 'mascotCrab', deepy: 'mascotDeepy', whalegirl: 'mascotWhaleGirl', off: 'mascotOff' },
  }, {
    // It belongs to the mascot switch above it.
    tab: 'appearance',
    rank: 40,
    pref: 'mascotScope',
    parent: 'mascot',
    title: 'mascotScopeTitle',
    choiceLabels: { home: 'mascotScopeHome', all: 'mascotScopeAll' },
  }],
  cases: ['crab-states', 'deepy', 'whalegirl', 'hero', 'studio']
} satisfies FeatureManifest
