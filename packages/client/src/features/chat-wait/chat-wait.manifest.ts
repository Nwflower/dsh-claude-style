import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'chatWait',
  order: 205,
  contracts: ['chat.flow', 'chat.following-tail-attribute', 'chat.running', 'chat.running-holding', 'chat.running-icon', 'chat.running-text', 'conversation.session', 'conversation.session-attribute'],
  pref: 'chatWait',
  yieldsTo: 'dsh-chat-ux',
  stylesheets: [{ file: 'chat-wait.css', rank: 175 }],
  // The line has its own switch on the Motion tab, with the paint it wears as
  // the option under it (settings-tab-motion.ts): the row says what the switch
  // turns on and off, and the cards show the two paints.
  settingsRows: [{
    tab: 'motion',
    rank: 15,
    pref: 'chatWait',
    title: 'statusMotionTitle',
  }, {
    // The line's detail choice: on writes the specifics a moment carries, off
    // the bare states alone. It belongs to the switch above it.
    tab: 'motion',
    rank: 16,
    pref: 'statusDetail',
    parent: 'chatWait',
    title: 'statusDetailTitle',
  }, {
    // The option under the line's own switch: the two paints as preview cards.
    tab: 'motion',
    rank: 17,
    pref: 'statusMotion',
    control: 'status-paint',
    stillWhenReduced: true,
  }],
  cases: ['chat-wait']
} satisfies FeatureManifest
