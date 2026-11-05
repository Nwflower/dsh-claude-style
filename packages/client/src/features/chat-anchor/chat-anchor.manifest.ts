import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'chatAnchor',
  order: 195,
  // The answer row is the assistant step the turn's process does not hold
  // (TURN_PROCESS_ANSWER_SELECTOR), and the mark that says its own text is
  // arriving is the markdown layer's streaming mark inside it.
  contracts: ['chat.follow-threshold', 'chat.process-answer', 'chat.scroller', 'chat.streaming'],
  pref: 'answerAnchor',
  // dsh-chat-ux moves the reader at the same moment for the same reason; one of
  // the two has to own the position.
  yieldsTo: 'dsh-chat-ux',
  stylesheets: [],
  settingsRows: [{
    // The main window's conversation group, after the transcript's own rows.
    tab: 'conversation',
    rank: 80,
    pref: 'answerAnchor',
    title: 'answerAnchorTitle',
    desc: 'answerAnchorDesc',
  }],
  cases: ['chat-anchor'],
} satisfies FeatureManifest
