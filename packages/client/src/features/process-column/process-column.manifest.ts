import { PROCESS_ROWS_COLUMN } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'processColumn',
  order: 202,
  contracts: ['chat.generic-tool-row', 'chat.group-part', 'chat.group-part-reasoning', 'chat.group-part-response', 'chat.think-preview', 'chat.think-row', 'chat.user-row', 'fold.disclosure', 'fold.disclosure-header', 'fold.expandable', 'fold.expanded', 'fold.shimmer-decoration', 'fold.toggle', 'process.body', 'process.content', 'process.group'],
  pref: 'processRows',
  // The flat layout is the host's own and needs nothing installed.
  prefValues: [PROCESS_ROWS_COLUMN],
  yieldsTo: 'dsh-chat-ux',
  stylesheets: [{ file: 'process-column.css', rank: 172 }],
  settingsRows: [{
    tab: 'conversation',
    // After the Windows title-bar band (rank 60): the rows below it are the transcript's.
    rank: 70,
    pref: 'processRows',
    title: 'processRowsTitle',
    control: 'process-rows-preview',
  }],
  cases: [],
  scenarios: ['processSummary'],
} satisfies FeatureManifest
