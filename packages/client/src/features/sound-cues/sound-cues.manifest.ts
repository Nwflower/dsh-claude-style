import { SOUND_LEVEL_CLEAR, SOUND_LEVEL_SOFT } from '@dsh-claude-style/contracts/sound'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'soundCues',
  order: 50,
  contracts: [],
  pref: 'soundCues',
  // Off is a level like the other two: the feature is not installed, so a
  // silenced page subscribes to nothing and starts no player (D89).
  prefValues: [SOUND_LEVEL_SOFT, SOUND_LEVEL_CLEAR],
  stylesheets: [],
  settingsRows: [{
    tab: 'general',
    rank: 60,
    pref: 'soundCues',
    title: 'soundCuesTitle',
    desc: 'soundCuesDesc',
    choiceLabels: { off: 'soundLevelOff', soft: 'soundLevelSoft', clear: 'soundLevelClear' },
  }],
  cases: ['settings'],
} satisfies FeatureManifest
