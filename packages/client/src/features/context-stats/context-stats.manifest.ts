import { CONVERSATION_COMPOSER_REQUIRES, FOOTER_TOKEN_DIGITS, FOOTER_TOKEN_UNITS } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'contextStats',
  order: 70,
  load: 'deferred',
  contracts: ['chat.call', 'chat.call-tool', 'chat.call-tool-attribute', 'chat.streaming', 'composer.card', 'composer.dialog-trigger', 'composer.dock', 'composer.meter-fill', 'composer.stat', 'composer.trailing', 'shell.dark-theme'],
  // The ring of the same directory draws the row's reading, and the panel this
  // feature owns hangs from it (features/context-stats/meter-ring.ts).
  reads: ['meterRing', 'model'],
  ungated: '上下文弹层统计、会话面板实时读数与费用聚合在对话期间常驻运行',
  stylesheets: [
    { file: 'inline-bar.css', rank: 104, gate: true },
    { file: 'footer-layout.css', rank: 106, gate: true },
    { file: 'stats-bar-settings.css', rank: 318 },
    { file: 'context-ramp-settings.css', rank: 324 },
    { file: 'billing-table.css', rank: 326 },
  ],
  settingsRows: [{
    tab: 'statistics',
    rank: 46,
    pref: 'contextDisplay',
    title: 'contextDisplayTitle',
    control: 'context-display',
    requires: CONVERSATION_COMPOSER_REQUIRES,
  }, {
    tab: 'statistics',
    rank: 48,
    pref: 'statsPosition',
    title: 'statsPositionTitle',
    desc: 'statsPositionDesc',
    asideControl: 'stats-bar-toggle',
    control: 'stats-bar-picker',
    requires: CONVERSATION_COMPOSER_REQUIRES,
  }, {
    // Independent of whether the composer restyle or statistics bar is on: these
    // unit and billing choices reach the session panel, context popover, home
    // usage dashboard, mascot bubble and composer bar alike (D113).
    tab: 'billing',
    rank: 55,
    pref: 'statsFooterTokenFormat',
    title: 'statsFooterTokenFormatTitle',
    choiceLabels: {
      [FOOTER_TOKEN_DIGITS]: 'statsFooterTokenDigitsSample',
      [FOOTER_TOKEN_UNITS]: 'statsFooterTokenUnitsSample',
    },
  }, {
    tab: 'billing',
    rank: 57,
    pref: 'billingCurrency',
    title: 'billingCurrencyTitle',
    choiceLabels: { off: 'billingCurrencyOff', CNY: 'billingCurrencyCny', USD: 'billingCurrencyUsd' },
  }, {
    tab: 'billing',
    rank: 58,
    pref: 'billingTable',
    parent: 'billingCurrency',
    title: 'billingTableTitle',
    control: 'billing-table',
    controlLayout: 'inline',
  }],
  cases: ['context-stats', 'stats-compact', 'stats-inline'],
  scenarios: ['statsPosition', 'statsOverlay', 'statsFooter'],
} satisfies FeatureManifest
