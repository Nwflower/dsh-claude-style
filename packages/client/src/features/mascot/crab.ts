import { CRAB_FRAME_MS, CRAB_GUTTER, CRAB_SHEETS } from './sheets'
import { createMascotPlayer } from './mascot-player'
import { CRAB_SHEET_URLS } from 'virtual:dsh-claude-style/generated'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './mascot.manifest'

/**
 * The composer crab — Claude Code's pixel crab — as a mascot character
 * (packages/client/src/features/mascot/mascot-player.ts plays it; packages/client/src/features/mascot/
 * mascot.ts decides which mascot is out).
 *
 * Its animations share Deepy's keys, so the one state machine drives both
 * (CRAB_SHEETS, drawn by scripts/draw-crab.py). Between jobs it looks
 * around, waves, or now and then pulls out its laptop and types for a
 * while — Claude Code's own routine, whole. The sheets ride the bundle
 * as data URIs (CRAB_SHEET_URLS): each animation is a sheet in the crab's
 * colours and an ink mask the stylesheet fills with the theme's quiet ink
 * (the laptop, the bubble wand and its bubbles, letters, notes, the hat),
 * so every sheet is ready the moment it is wanted.
 *
 * @param ui - shared handle table (`ui.composer`).
 * @returns `{ sync, release, onActivity, dispose }`.
 */
export function createMascotCrab(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  return createMascotPlayer(ctx, ui, {
    name: 'crab',
    sheets: CRAB_SHEETS,
    frameMs: CRAB_FRAME_MS,
    gutter: CRAB_GUTTER,
    extras: ['idle-look', 'idle-wave', 'idle-laptop'],
    createSheets() {
      return {
        ready: key => Object.prototype.hasOwnProperty.call(CRAB_SHEET_URLS, key),
        failed: () => false,
        paint(style, key) {
          style.setProperty('--dsh-claude-mascot-sheet', `url("${CRAB_SHEET_URLS[key].body}")`)
          style.setProperty('--dsh-claude-crab-ink', `url("${CRAB_SHEET_URLS[key].ink}")`)
        },
        dispose() {},
      }
    },
  })
}
