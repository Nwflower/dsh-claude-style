import { ANY_COMPOSER_REQUIRES } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'permissions',
  order: 60,
  reads: ['composer'],
  contracts: ['composer.access-slot', 'composer.access-trigger', 'composer.card', 'sidebar.chat'],
  pref: 'permissionsControl',
  stylesheets: [{ file: 'permissions.css', rank: 230 }],
  settingsRows: [{
    tab: 'composer',
    // After the restyle and its gap, ahead of the model picker and the rows under it.
    rank: 20,
    pref: 'permissionsControl',
    title: 'permissionsTitle',
    // The segments are drawn into the restyled composer.
    requires: ANY_COMPOSER_REQUIRES,
  }],
  cases: ['permissions', 'permissions-locale', 'automode', 'automode-current', 'automode-hero', 'automode-roundtrip', 'no-auto-review', 'sync-fault', 'switches', 'switches-off']
} satisfies FeatureManifest
