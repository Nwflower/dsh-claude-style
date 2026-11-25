import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'composerMarkdown',
  order: 22,
  contracts: ['composer.card', 'composer.input', 'composer.scroll'],
  pref: 'composerMarkdown',
  stylesheets: [{ file: 'composer-markdown.css', rank: 103 }],
  settingsRows: [{
    tab: 'composer',
    rank: 12,
    pref: 'composerMarkdown',
    title: 'composerMarkdownTitle',
    desc: 'composerMarkdownDesc',
    experimental: true,
  }],
  cases: ['composer', 'late-forms'],
} satisfies FeatureManifest
