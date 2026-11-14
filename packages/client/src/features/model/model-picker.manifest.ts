import { ANY_COMPOSER_REQUIRES } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'model',
  order: 80,
  reads: ['composer', 'peakrate'],
  // The seat stands in the page's main composer card; a sub-agent's docked
  // conversation draws one of its own (engine/host.ts::findPrimaryModelSlot).
  contracts: ['composer.model-slot', 'sidebar.chat'],
  pref: 'modelPicker',
  stylesheets: [{ file: 'model-picker.css', rank: 260 }],
  settingsRows: [{
    tab: 'composer',
    rank: 30,
    pref: 'modelPicker',
    title: 'pickerTitle',
    desc: 'pickerDesc',
    // The menu is drawn into the restyled composer.
    requires: ANY_COMPOSER_REQUIRES,
  }, {
    tab: 'composer',
    rank: 34,
    pref: 'modelOrder',
    parent: 'modelPicker',
    title: 'modelOrderTitle',
    desc: 'modelOrderDesc',
    choiceLabels: { id: 'modelOrderId', brand: 'modelOrderBrand', catalog: 'modelOrderCatalog', custom: 'modelOrderCustom' },
  }, {
    // The catalog's own description lines, which the picker draws, under it.
    tab: 'composer',
    rank: 35,
    pref: 'modelDescriptions',
    parent: 'modelPicker',
    title: 'modelDescriptionsTitle',
    desc: 'modelDescriptionsDesc',
  }],
  cases: ['brand', 'composer', 'settings', 'sync-fault', 'model-meter', 'model-account']
} satisfies FeatureManifest
