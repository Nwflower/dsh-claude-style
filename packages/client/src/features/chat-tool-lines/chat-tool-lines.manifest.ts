import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'chatToolLines',
  order: 225,
  contracts: ['chat.tool-output-row'],
  pref: 'chatAnimations',
  stylesheets: [{ file: 'tool-lines.css', rank: 195 }],
  cases: ['chat-tool-lines'],
} satisfies FeatureManifest
