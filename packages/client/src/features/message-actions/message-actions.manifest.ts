import {
  REWIND_STORAGE_LIMIT_1GB,
  REWIND_STORAGE_LIMIT_256MB,
  REWIND_STORAGE_LIMIT_2GB,
  REWIND_STORAGE_LIMIT_512MB,
} from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'messageActions',
  order: 231,
  load: 'deferred',
  contracts: ['boot.rewind-entry', 'boot.rewind-sheet', 'chat.answer-row', 'chat.flow', 'chat.message-actions', 'chat.message-clock', 'chat.node-key', 'chat.phase', 'chat.turn-attribute', 'chat.turn-tail', 'chat.inherited-history', 'chat.user-kind', 'chat.user-row', 'conversation.session-attribute', 'session.row', 'session.row-key'],
  pref: 'messageActions',
  stylesheets: [{ file: 'message-actions.css', rank: 155 }],
  settingsRows: [{
    tab: 'conversation',
    rank: 25,
    pref: 'messageActions',
    title: 'actionsTitle',
    // dsh-rewind takes the four write actions; the switch still governs revision history (D111).
    sharedWith: { plugin: 'dsh-rewind', note: 'rewindPeerNote' },
  }, {
    tab: 'conversation',
    rank: 26,
    pref: 'rewindCheckpoints',
    parent: 'messageActions',
    title: 'rewindCheckpointsTitle',
    desc: 'rewindCheckpointsDesc',
    sharedWith: { plugin: 'dsh-rewind', note: 'rewindPeerNote' },
  }, {
    tab: 'conversation',
    rank: 27,
    pref: 'rewindStorageLimit',
    parent: 'rewindCheckpoints',
    title: 'rewindStorageLimitTitle',
    desc: 'rewindStorageLimitDesc',
    choiceLabels: {
      [REWIND_STORAGE_LIMIT_256MB]: 'rewindStorageLimit256mb',
      [REWIND_STORAGE_LIMIT_512MB]: 'rewindStorageLimit512mb',
      [REWIND_STORAGE_LIMIT_1GB]: 'rewindStorageLimit1gb',
      [REWIND_STORAGE_LIMIT_2GB]: 'rewindStorageLimit2gb',
    },
    sharedWith: { plugin: 'dsh-rewind', note: 'rewindPeerNote' },
  }, {
    tab: 'conversation',
    rank: 28,
    pref: 'rewindStorageDir',
    parent: 'rewindCheckpoints',
    title: 'rewindStorageDirTitle',
    desc: 'rewindStorageDirDesc',
    control: 'rewind-storage-dir',
    controlLayout: 'inline',
    sharedWith: { plugin: 'dsh-rewind', note: 'rewindPeerNote' },
  }],
  cases: [],
  scenarios: ['messageActions', 'messageAnswerActions', 'messageRewindFiles'],
} satisfies FeatureManifest
