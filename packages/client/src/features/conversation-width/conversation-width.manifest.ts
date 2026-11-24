import { CONVERSATION_WIDTH_FULL, CONVERSATION_WIDTH_HALF, CONVERSATION_WIDTH_THREE_QUARTERS } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'conversationWidth',
  order: 259,
  contracts: ['chat.content', 'chat.content-width', 'composer.card-max-width', 'shell.phase'],
  pref: 'conversationWidth',
  // The full width is the host's own and needs nothing installed.
  prefValues: [CONVERSATION_WIDTH_THREE_QUARTERS, CONVERSATION_WIDTH_HALF],
  stylesheets: [{ file: 'conversation-width.css', rank: 76 }],
  settingsRows: [{
    tab: 'conversation',
    // Between the message navigator (rank 20) and the view tabs (rank 50).
    rank: 30,
    pref: 'conversationWidth',
    title: 'conversationWidthTitle',
    choiceLabels: {
      [CONVERSATION_WIDTH_FULL]: 'conversationWidthFull',
      [CONVERSATION_WIDTH_THREE_QUARTERS]: 'conversationWidthThreeQuarters',
      [CONVERSATION_WIDTH_HALF]: 'conversationWidthHalf',
    },
  }],
  cases: [],
} satisfies FeatureManifest
