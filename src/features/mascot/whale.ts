import { DEEPY_FRAME_MS, DEEPY_GUTTER, DEEPY_SHEETS } from '../../constants'
import { createMascotPlayer } from './mascot-player'
import { createMascotWhaleSheets } from './whale-sheets'
import type { HostContext } from '../../core/host'
import type { Ui } from '../../core/scheduler'

/**
 * Deepy, the DeepSeek brand's pixel whale, as a mascot character
 * (src/features/mascot/mascot-player.ts plays it; src/features/mascot/
 * mascot.ts decides which mascot is out).
 *
 * Its animations are Deepy's Clawd on Desk theme (DEEPY_SHEETS): between
 * jobs it looks around or spouts now and then. The sheets are too large to
 * ride the bundle, so each loads from the host half the first time its
 * animation is wanted, rebuilt as a vector and cached (whale-sheets.ts).
 *
 * @param ctx - client context.
 * @param ui - shared handle table (`ui.composer`).
 * @returns `{ sync, release, onActivity, dispose }`.
 */
export function createMascotWhale(ctx: HostContext, ui: Ui) {
  return createMascotPlayer(ctx, ui, {
    name: 'deepy',
    sheets: DEEPY_SHEETS,
    frameMs: DEEPY_FRAME_MS,
    gutter: DEEPY_GUTTER,
    extras: ['idle-look', 'idle-spout'],
    createSheets(onReady) {
      const sheets = createMascotWhaleSheets(onReady, DEEPY_GUTTER)
      return {
        ready: sheets.ready,
        failed: sheets.failed,
        paint(style, key) {
          style.setProperty('--dsh-claude-deepy-sheet', `url("${sheets.url(key)}")`)
        },
        dispose: sheets.dispose,
      }
    },
  })
}
