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
  // The three picks are drawn by the feature's own control
  // (features/sound-cues/sound-cues.settings.ts), which also sounds each level
  // as it is picked: a gain has to be heard to be chosen, and the row names the
  // levels itself.
  settingsRows: [{
    tab: 'general',
    rank: 60,
    pref: 'soundCues',
    title: 'soundCuesTitle',
    desc: 'soundCuesDesc',
    control: 'sound-levels',
    controlLayout: 'inline',
  }],
  cases: ['settings'],
} satisfies FeatureManifest
