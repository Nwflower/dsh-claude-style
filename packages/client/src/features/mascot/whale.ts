import { DEEPY_FRAME_MS, DEEPY_GUTTER, DEEPY_SHEETS } from './sheets'
import { createMascotPlayer } from './mascot-player'
import { createRoutedSheetAdapter } from './routed-sheets'
import { DEEPY_SHEET_URLS } from 'virtual:dsh-claude-style/generated'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './mascot.manifest'

/**
 * Deepy, the DeepSeek brand's pixel whale, as a mascot character
 * (packages/client/src/features/mascot/mascot-player.ts plays it; packages/client/src/features/mascot/
 * mascot.ts decides which mascot is out).
 *
 * Its animations are Deepy's Clawd on Desk theme (DEEPY_SHEETS): between
 * jobs it looks around or spouts now and then. The sheets are too large to
 * ride the bundle, so each is fetched from the host half the first time its
 * animation is wanted (routed-sheets.ts).
 *
 * @param ui - shared handle table (`ui.composer`).
 * @returns `{ sync, release, onActivity, dispose }`.
 */
export function createMascotWhale(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  return createMascotPlayer(ctx, ui, {
    name: 'deepy',
    sheets: DEEPY_SHEETS,
    frameMs: DEEPY_FRAME_MS,
    gutter: DEEPY_GUTTER,
    extras: ['idle-look', 'idle-spout'],
    createSheets: createRoutedSheetAdapter(DEEPY_SHEET_URLS, 'Deepy'),
  })
}
