import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'surface',
  order: 265,
  contracts: ['shell.sidebar-root', 'shell.sidebar-brand', 'shell.sidebar-toggle', 'shell.windows-menu', 'ds-bot.return', 'ds-bot.account', 'ds-bot.account-menu', 'ds-bot.agent-item', 'ds-bot.sidebar-top'],
  ungated: '只在装有 ds-bot 时出现：没有它，宿主只有一种界面，开关无处可切',
  stylesheets: [{ file: 'surface.css', rank: 380, scope: 'surface' }],
  // The stand-in page has no ds-bot; the lane's dsBot scenario walks the switch beside the real one (D86).
  cases: []
} satisfies FeatureManifest
