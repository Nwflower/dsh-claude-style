import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'search',
  order: 160,
  load: 'deferred',
  contracts: ['shell.sidebar-search', 'shell.sidebar-brand', 'shell.sidebar-new-session'],
  pref: 'sidebarSearch',
  stylesheets: [{ file: 'search.css', rank: 130 }],
  settingsRows: [{
    tab: 'sidebar',
    rank: 20,
    pref: 'sidebarSearch',
    title: 'searchTitle',
    desc: 'searchDesc',
  }, {
    // The button's own style, under the switch that turns the panel on.
    tab: 'sidebar',
    rank: 25,
    pref: 'searchStyle',
    parent: 'sidebarSearch',
    title: 'searchStyleTitle',
    choiceLabels: { icon: 'searchStyleIcon', standalone: 'searchStyleStandalone' },
  }],
  cases: ['search', 'switches']
} satisfies FeatureManifest
