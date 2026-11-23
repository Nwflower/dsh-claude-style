import { COMPOSER_SCOPE_ALL, COMPOSER_SCOPE_CONVERSATION } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'meterRing',
  // After the context statistics (70), which answer the occupancy this ring
  // draws, and before the settings page's own rows: the two features of this
  // directory are one surface's halves — the ring in the row, the panel above
  // it — and a pass draws the ring with the reading the same pass handed it.
  order: 72,
  // The ring stands in the composer toolbar row whenever the composer restyle
  // covers the conversation (D112).
  pref: 'composerScope',
  prefValues: [COMPOSER_SCOPE_CONVERSATION, COMPOSER_SCOPE_ALL],
  reads: ['model'],
  contracts: ['composer.card', 'composer.dialog-trigger', 'composer.model-slot'],
  stylesheets: [{ file: 'meter-ring.css', rank: 105 }],
  cases: [],
} satisfies FeatureManifest
