import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'soundCues',
  order: 50,
  contracts: [],
  pref: 'soundCues',
  stylesheets: [],
  settingsRows: [{
    tab: 'general',
    rank: 60,
    pref: 'soundCues',
    title: 'soundCuesTitle',
    desc: 'soundCuesDesc',
  }, {
    tab: 'general',
    rank: 61,
    pref: 'soundPermission',
    parent: 'soundCues',
    title: 'soundPermissionTitle',
    desc: 'soundPermissionDesc',
  }, {
    tab: 'general',
    rank: 62,
    pref: 'soundCompletion',
    parent: 'soundCues',
    title: 'soundCompletionTitle',
    desc: 'soundCompletionDesc',
  }, {
    tab: 'general',
    rank: 63,
    pref: 'soundVolume',
    parent: 'soundCues',
    title: 'soundVolumeTitle',
    choiceLabels: { quiet: 'soundVolumeQuiet', subtle: 'soundVolumeSubtle', clear: 'soundVolumeClear' },
  }],
  cases: ['settings'],
} satisfies FeatureManifest
