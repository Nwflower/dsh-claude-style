import { WHALE_GIRL_FRAME_MS, WHALE_GIRL_SHEETS } from './sheets'
import { createMascotPlayer } from './mascot-player'
import { createRoutedSheetAdapter } from './routed-sheets'
import { WHALE_GIRL_SHEET_URLS } from 'virtual:dsh-claude-style/generated'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './mascot.manifest'

/**
 * Whalegirl, the pixel whale girl of the emoji set shipped with the mascot
 * (packages/client/src/features/mascot/mascot-player.ts plays her; packages/client/src/features/mascot/
 * mascot.ts decides which mascot is out).
 *
 * Her animations share Deepy's and the crab's keys, so the one state machine
 * drives all three (WHALE_GIRL_SHEETS). She keeps the set's own pacing: each
 * frame carries its duration, so the player steps through them instead of at
 * one frame time. The sheets are served from the host half and fetched the
 * first time an animation is wanted (routed-sheets.ts), so the deferred mascot
 * chunk carries no art.
 *
 * @param ui - shared handle table (`ui.composer`).
 * @returns `{ sync, release, onActivity, dispose }`.
 */
export function createMascotWhaleGirl(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  return createMascotPlayer(ctx, ui, {
    name: 'whalegirl',
    sheets: WHALE_GIRL_SHEETS,
    frameMs: WHALE_GIRL_FRAME_MS,
    extras: ['idle-look', 'idle-spout'],
    createSheets: createRoutedSheetAdapter(WHALE_GIRL_SHEET_URLS, 'Whalegirl'),
  })
}
