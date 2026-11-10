/**
 * Where one caption-row pass puts the title, the cluster beside it, the two
 * control clusters and the tab strip, decided from numbers alone. The cases
 * walk the thresholds on both sides: a title that just fits and one that does
 * not, a cluster whose need just fits and one that does not, and a name that
 * grew back past the width an earlier pass handed it.
 *
 * @capability header-band
 * @features header-band
 * @risk The cluster is judged by a width something capped rather than the width
 *   it needs, a title that grew back keeps the trail placed against its old
 *   name, a piece whose room falls below the threshold is lifted anyway, or the
 *   strip is centred in a run the title and the controls no longer leave.
 */
import { expect, test } from 'vitest'
import { placeCaptionRow } from '@dsh-claude-style/client/pure'
import type { CaptionInputs } from '@dsh-claude-style/client/pure'

/** A 1280px window with the desktop shell's 140px caption buttons and a match for the band's own air. */
function inputs(patch: Partial<CaptionInputs> = {}): CaptionInputs {
  return {
    width: 1280,
    bandHeight: 40,
    controls: 140,
    rowLeft: 200,
    menuRight: null,
    strip: { width: 152, inBand: true },
    title: { present: true, width: 300, natural: 300 },
    trail: { present: true, width: 60, need: 60 },
    utilities: { present: true, width: 114 },
    corner: { present: true, width: 28 },
    row: { top: 60, applied: 0 },
    titleHeight: 28,
    ...patch,
  }
}

test('the caption row takes both sides and the pieces take one place each', () => {
  const placed = placeCaptionRow(inputs())
  expect(placed.lift).toEqual({ title: true, trail: true, actions: true })
  expect(placed.title).toEqual({ left: 200, max: 546, top: 20 })
  expect(placed.trail).toEqual({ left: 508, top: 20 })
  expect(placed.utilitiesRight).toBe(184)
  expect(placed.cornerRight).toBe(148)
})

test('the row rises to the lower edge of the title box it no longer holds', () => {
  const placed = placeCaptionRow(inputs())
  expect(placed.rowTop).toBe(34)
  expect(placed.rowLift).toBe(26)
  // The lift already applied is taken back out, so the next pass asks for none.
  expect(placeCaptionRow(inputs({ row: { top: 60, applied: 26 } })).rowLift).toBe(0)
})

test('a title that just fits the room is lifted, and one a pixel short stays in the row', () => {
  const fits = placeCaptionRow(inputs({ rowLeft: 694 }))
  expect(fits.lift.title).toBe(true)
  expect(fits.title?.max).toBe(120)
  expect(fits.lift.trail).toBe(false)
  const short = placeCaptionRow(inputs({ rowLeft: 695 }))
  expect(short.lift.title).toBe(false)
  expect(short.title).toBeNull()
  expect(short.rowLift).toBe(0)
})

test('the cluster is judged by the width it needs, not by the box a limit left it with', () => {
  const needed = placeCaptionRow(inputs({ trail: { present: true, width: 60, need: 700 } }))
  expect(needed.lift.trail).toBe(false)
  expect(needed.title?.max).toBe(614)
  expect(placeCaptionRow(inputs({ trail: { present: true, width: 60, need: 60 } })).lift.trail).toBe(true)
})

test('a name that grew back past its old limit places the cluster against the width the words take', () => {
  const grown = placeCaptionRow(inputs({ title: { present: true, width: 120, natural: 500 } }))
  expect(grown.trail?.left).toBe(708)
  const room = placeCaptionRow(inputs({ title: { present: true, width: 120, natural: 900 } }))
  expect(room.trail?.left).toBe(200 + 546 + 8)
})

test('a window the cluster and the controls cannot both stand in keeps both in the row', () => {
  const tight = placeCaptionRow(inputs({ strip: { width: 670, inBand: true } }))
  expect(tight.lift.actions).toBe(false)
  expect(tight.utilitiesRight).toBeNull()
  expect(tight.cornerRight).toBeNull()
  expect(placeCaptionRow(inputs({ strip: { width: 668, inBand: true } })).lift.actions).toBe(true)
})

test('the strip takes the middle of the run the title and the controls leave', () => {
  expect(placeCaptionRow(inputs()).stripLeft).toBe(775)
  expect(placeCaptionRow(inputs({ strip: { width: 152, inBand: false } })).stripLeft).toBeNull()
})

test('a missing control cluster leaves no air behind it', () => {
  const solo = placeCaptionRow(inputs({ corner: { present: false, width: 0 } }))
  expect(solo.utilitiesRight).toBe(148)
  expect(solo.lift.actions).toBe(true)
})
