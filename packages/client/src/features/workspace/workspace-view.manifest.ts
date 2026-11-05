import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'workspace',
  order: 150,
  contracts: [],
  pref: 'workspaceView',
  stylesheets: [{ file: 'workspace.css', rank: 120 }],
  settingsRows: [{
    tab: 'sidebar',
    // Under the entries above the list (30): the view switch stands on the list itself.
    rank: 32,
    pref: 'workspaceView',
    title: 'workspaceTitle',
    desc: 'workspaceDesc',
  }],
  cases: ['switches', 'popovers']
} satisfies FeatureManifest
