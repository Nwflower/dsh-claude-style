import { HOME_LAYOUT_CLASSIC, HOME_LAYOUT_STUDIO, HOME_SESSION_SCOPE_ACTIVE, HOME_SESSION_SCOPE_ALL, HOME_SESSION_SCOPE_WORKSPACE } from '../../constants'
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
  }, {
    tab: 'appearance',
    rank: 26,
    pref: 'homeSessionScope',
    parent: 'homeLayout',
    title: 'homeSessionScopeTitle',
    desc: 'homeSessionScopeDesc',
    choiceLabels: {
      [HOME_SESSION_SCOPE_ACTIVE]: 'homeSessionScopeActive',
      [HOME_SESSION_SCOPE_WORKSPACE]: 'homeSessionScopeWorkspace',
      [HOME_SESSION_SCOPE_ALL]: 'homeSessionScopeAll',
    },
    requires: {
      pref: 'homeLayout',
      values: [HOME_LAYOUT_STUDIO],
      note: 'homeSessionScopeRequired',
    },
  }],
  cases: ['hero', 'studio', 'late-forms', 'hdsl', 'hdsl-noskin', 'hdsl-broken'],
  scenarios: ['mobileHome', 'systemTypography'],
} satisfies FeatureManifest
