import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'footer',
  order: 120,
  reads: ['ban'],
  contracts: ['shell.account-trigger', 'shell.foot-area', 'shell.footer-actions', 'shell.menu', 'shell.menu-list', 'shell.modal-dialog', 'shell.settings-button', 'footer.plugin-entry-part', 'footer.plugin-entry-owner', 'footer.plugin-entry-update'],
  pref: 'collapseFooter',
  stylesheets: [
    { file: 'account-footer.css', rank: 240 },
    { file: 'footer-takeover.css', rank: 290 },
  ],
  settingsRows: [{
    tab: 'sidebar',
    rank: 10,
    pref: 'collapseFooter',
    title: 'collapseTitle',
    desc: 'collapseDesc',
  }],
  cases: ['account', 'desktop', 'markup', 'install-fault']
} satisfies FeatureManifest
