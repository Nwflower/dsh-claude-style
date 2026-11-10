import { HOME_LAYOUT_CLASSIC, HOME_LAYOUT_STUDIO } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'homeLayout',
  order: 30,
  contracts: ['composer.stack', 'shell.phase'],
  pref: 'homeLayout',
  // Off leaves the host's home page as the host draws it.
  prefValues: [HOME_LAYOUT_CLASSIC, HOME_LAYOUT_STUDIO],
  stylesheets: [
    { file: 'home-preview.css', rank: 317 },
    { file: 'home-panel.css', rank: 320 },
    { file: 'home-overview.css', rank: 330 },
    { generated: 'heat-levels', rank: 335 },
    { file: 'home-models.css', rank: 340 },
  ],
  settingsRows: [{
    tab: 'appearance',
    rank: 25,
    pref: 'homeLayout',
    title: 'homeTitle',
    desc: 'homeDesc',
    control: 'layout-preview',
  }],
  cases: ['hero', 'studio', 'late-forms', 'hdsl', 'hdsl-noskin', 'hdsl-broken'],
  scenarios: ['mobileHome', 'systemTypography'],
} satisfies FeatureManifest
