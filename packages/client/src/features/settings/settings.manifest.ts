import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'settings',
  handle: 'settingsNav',
  order: 260,
  load: 'deferred',
  reads: ['quickProviders'],
  contracts: ['shell.dark-theme', 'shell.windows-titlebar'],
  ungated: '设置页本身，以及随它一起装上的主题翻转抑制',
  stylesheets: [
    { file: 'settings.css', rank: 310 },
    { file: 'settings-cards.css', rank: 315 },
    { file: 'settings-brand-lockup.css', rank: 316 },
    { file: 'settings-zoom.css', rank: 311 },
    { file: 'theme-flip.css', rank: 370 },
  ],
  cases: ['settings', 'late-forms', 'host-palette', 'skin-center-handoff', 'skin-center-arrival']
} satisfies FeatureManifest
