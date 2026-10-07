/**
 * The mascot sheet tables: which frames each animation holds, the box each
 * frame is cropped to and the frame shown under reduced motion. `scripts/build.mjs`
 * reads them to rebuild every sheet as the vector the browser plays and the
 * host half serves under the assets route (D38), so a face and its animation
 * cannot drift apart.
 */

/**
 * Deepy's animations (features/mascot/whale.ts), one sheet each under
 * packages/assets/src/mascot/deepy/. The browser loads a sheet the first time
 * its animation plays and never while another brand is on.
 *
 * The whale is drawn on a 52×52 grid of logical pixels, five device pixels
 * to one in the sheets. A sheet holds its animation's frames eight to a
 * row, each cropped to `box` — `[x, y, width, height]` in logical pixels,
 * the smallest box that holds every frame — and every frame lasts
 * DEEPY_FRAME_MS. `still` is the frame shown for the animation when the
 * reader asks for reduced motion.
 */
export const DEEPY_FRAME_MS = 50
/** Deepy's sheets' resolution: device pixels to a logical pixel (packages/assets/assets.mjs rebuilds them). */
export const DEEPY_SCALE = 5
/**
 * The transparent margin, in logical pixels, that every frame keeps on all
 * four sides in the vector the build produces (packages/assets/assets.mjs, D24).
 *
 * The sheets stack their frames edge to edge, and the browser draws the
 * rebuilt vector scaled down — from five pixels a logical pixel in the
 * sheet to two on the sprite. That downscale samples a little way past a
 * frame's edge, and the pixel it finds there is the bottom row of the
 * frame above: the soft tail of the whale's shadow. On the page it reads
 * as a one-device-pixel grey line across the top of the frame. A margin
 * wide enough for that reach leaves the sampling nothing but transparency,
 * and a whole logical pixel keeps every strip offset a whole CSS pixel.
 */
export const DEEPY_GUTTER = 1
export const DEEPY_SHEETS: Record<string, { frames: number, box: number[], still: number }> = {
  'idle': { frames: 48, box: [12, 26, 36, 24], still: 0 },
  'idle-look': { frames: 68, box: [11, 11, 37, 39], still: 0 },
  'idle-spout': { frames: 64, box: [8, 17, 39, 33], still: 0 },
  'thinking': { frames: 48, box: [0, 6, 47, 44], still: 20 },
  'typing': { frames: 48, box: [0, 17, 52, 33], still: 16 },
  'music': { frames: 32, box: [2, 10, 48, 40], still: 0 },
  'conducting': { frames: 48, box: [1, 0, 51, 50], still: 6 },
  'building': { frames: 48, box: [2, 0, 50, 50], still: 0 },
  'error': { frames: 48, box: [4, 17, 45, 33], still: 24 },
  'happy': { frames: 52, box: [0, 5, 52, 45], still: 44 },
  'notification': { frames: 32, box: [3, 7, 47, 43], still: 12 },
  'compacting': { frames: 56, box: [2, 14, 46, 36], still: 20 },
  'sleeping': { frames: 64, box: [2, 2, 44, 48], still: 10 },
  'waking': { frames: 30, box: [8, 4, 44, 46], still: 29 },
  'poke-left': { frames: 40, box: [1, 16, 50, 34], still: 0 },
  'poke-right': { frames: 40, box: [8, 16, 44, 34], still: 0 },
  'tickle': { frames: 48, box: [9, 17, 43, 33], still: 0 },
  'drag': { frames: 24, box: [10, 4, 41, 46], still: 0 },
}

/**
 * The composer crab's animations (features/mascot/crab.ts), drawn by
 * scripts/draw-crab.py into packages/assets/src/mascot/crab/: one sheet in the
 * crab's colours and one ink mask per animation, inlined by the build as
 * CRAB_SHEET_URLS.
 *
 * The crab is drawn on a 52×36 grid of cells at 2px a cell, feet on the
 * bottom row, the right claw four cells in from the right edge. A sheet
 * holds its animation's frames eight to a row, each cropped to `box` —
 * `[x, y, width, height]` in cells — and every frame lasts CRAB_FRAME_MS,
 * the pace of Claude Code's own crab. `still` is the frame shown for the
 * animation when the reader asks for reduced motion. The keys are Deepy's,
 * so the two share one state machine; `idle-wave` and `idle-laptop` (Claude
 * Code's laptop routine, whole) are the crab's own idle extras.
 */
export const CRAB_FRAME_MS = 80
export const CRAB_SHEETS: Record<string, { frames: number, box: number[], still: number }> = {
  'idle': { frames: 24, box: [24, 20, 24, 16], still: 0 },
  'idle-look': { frames: 31, box: [24, 20, 24, 16], still: 0 },
  'idle-wave': { frames: 12, box: [24, 15, 24, 21], still: 0 },
  'idle-laptop': { frames: 43, box: [14, 13, 34, 23], still: 0 },
  'thinking': { frames: 32, box: [14, 4, 34, 32], still: 18 },
  'typing': { frames: 6, box: [15, 22, 28, 14], still: 0 },
  'music': { frames: 16, box: [22, 1, 30, 35], still: 0 },
  'conducting': { frames: 24, box: [24, 12, 27, 24], still: 0 },
  'building': { frames: 6, box: [15, 19, 28, 17], still: 0 },
  'error': { frames: 24, box: [23, 11, 26, 25], still: 4 },
  'happy': { frames: 32, box: [18, 6, 34, 30], still: 3 },
  'notification': { frames: 16, box: [24, 8, 24, 28], still: 0 },
  'compacting': { frames: 20, box: [21, 20, 30, 16], still: 3 },
  'sleeping': { frames: 32, box: [23, 3, 29, 33], still: 0 },
  'waking': { frames: 12, box: [24, 4, 24, 32], still: 11 },
  'poke-left': { frames: 10, box: [24, 20, 27, 16], still: 0 },
  'poke-right': { frames: 10, box: [21, 20, 27, 16], still: 0 },
  'tickle': { frames: 16, box: [23, 18, 26, 18], still: 0 },
  'drag': { frames: 8, box: [23, 12, 26, 22], still: 0 },
}
