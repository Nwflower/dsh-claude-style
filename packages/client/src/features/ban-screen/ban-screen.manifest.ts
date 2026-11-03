import { BAN_LOCALE_EN, BAN_LOCALE_ZH } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'ban',
  order: 130,
  load: 'deferred',
  contracts: ['dsh-video-skin.boot', 'api.window-controls', 'shell.fullscreen', 'shell.platform', 'shell.top-clearance', 'shell.windows-titlebar'],
  // The page's language is the switch: `off` is the third value of that row,
  // which stands under the footer takeover whose popover holds the account row.
  pref: 'banLocale',
  prefValues: [BAN_LOCALE_EN, BAN_LOCALE_ZH],
  stylesheets: [{ file: 'ban-screen.css', rank: 250 }],
  settingsRows: [{
    tab: 'sidebar',
    rank: 15,
    pref: 'banLocale',
    parent: 'collapseFooter',
    title: 'banLocaleTitle',
    desc: 'banLocaleDesc',
    choiceLabels: { off: 'banLocaleOff', zh: 'banLocaleZh', en: 'banLocaleEn' },
  }],
  cases: ['desktop', 'settings']
} satisfies FeatureManifest
