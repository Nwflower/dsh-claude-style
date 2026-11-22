import { CARET_MOTION_TYPING } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'caret',
  order: 240,
  contracts: ['composer.input', 'composer.textarea'],
  pref: 'caretMotion',
  prefValues: [CARET_MOTION_TYPING],
  yieldsTo: 'dsh-chat-ux',
  stylesheets: [{ file: 'caret.css', rank: 220 }],
  // The two cards are the two answers: each names its answer over the sample
  // the caret walks, and picking one writes it.
  settingsRows: [{
    tab: 'motion',
    // After the chat area's rows (10–26): the caret is the composer's.
    rank: 30,
    pref: 'caretMotion',
    title: 'caretTitle',
    control: 'caret-preview',
    stillWhenReduced: true,
  }],
  cases: ['caret']
} satisfies FeatureManifest
