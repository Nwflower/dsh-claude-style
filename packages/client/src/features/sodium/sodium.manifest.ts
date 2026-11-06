import { SODIUM_OFF, SODIUM_ON } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'sodium',
  order: 5,
  contracts: ['chat.node', 'chat.flow-slot', 'chat.flow-block', 'chat.running', 'composer.echo', 'chat.pending-steering', 'chat.process-answer', 'chat.turn-process-kind', 'chat.group-part', 'chat.group-part-response', 'chat.user-row', 'chat.steering-batch', 'head.plugin-sheets', 'head.plugin-sheet-owner', 'head.plugin-sheet-path', 'boot.release'],
  ungated: 'the switch starts undecided and the probe runs while it is; the feature follows the switch itself (D78)',
  stylesheets: [{ file: 'sodium.css', rank: 255 }],
  settingsRows: [{
    tab: 'general',
    rank: 50,
    pref: 'sodium',
    title: 'sodiumTitle',
    desc: 'sodiumDesc',
    switch: { on: SODIUM_ON, off: SODIUM_OFF },
    status: 'sodium-rules',
    experimental: true,
  }],
  cases: ['settings'],
} satisfies FeatureManifest
