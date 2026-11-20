/**
 * Where one caption-row pass puts the title, the cluster beside it, the two
 * control clusters, decided from numbers alone. The cases
 * walk the thresholds on both sides: a title that just fits and one that does
 * not, a cluster whose need just fits and one that does not, and a name that
 * grew back past the width an earlier pass handed it. The last cases hand the
 * pass its own last decision: a place already taken is kept across the few
 * pixels a placement moves the layout it is judged on, so a room that sits on a
 * threshold comes to rest instead of alternating between two.
 *
 * @capability header-band
 * @features header-band
 * @risk The cluster is judged by a width something capped rather than the width
 *   it needs, a title that grew back keeps the trail placed against its old
 *   name, a piece whose room falls below the threshold is lifted anyway, or a
 *   boundary the pass moves itself leaves the caption row alternating.
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
    menu: { present: false, width: 0 },
    title: { present: true, width: 300, natural: 300 },
    trail: { present: true, width: 60, need: 60 },
    utilities: { present: true, width: 114 },
    corner: { present: true, width: 28 },
    headerTop: 60,
    titleHeight: 28,
    ...patch,
  }
}

test('the caption row takes both sides and the pieces take one place each', () => {
  const placed = placeCaptionRow(inputs())
  expect(placed.lift).toEqual({ title: true, trail: true, actions: true })
  expect(placed.title).toEqual({ left: 200, max: 706, top: 20 })
  expect(placed.trail).toEqual({ left: 508, top: 20 })
  expect(placed.utilitiesRight).toBe(184)
  expect(placed.cornerRight).toBe(148)
})

test('the row stands on the lower edge of the title box it no longer holds', () => {
  const placed = placeCaptionRow(inputs())
  expect(placed.rowTop).toBe(34)
  expect(placed.rowLift).toBe(26)
  // The two numbers are read off the header's own edge: a header standing above
  // the line takes the whole walk into its inset and needs no rise, and the pair
  // the pass writes puts the row on the line in the pass that writes it.
  const closed = placeCaptionRow(inputs({ headerTop: 20 }))
  expect(closed.headerInset).toBe(14)
  expect(closed.rowLift).toBe(0)
  // The row's drawn top is the header's edge, walk down and rise together.
  expect(20 + closed.headerInset - closed.rowLift).toBe(closed.rowTop)
  expect(60 + placed.headerInset - placed.rowLift).toBe(placed.rowTop)
})

test('a title that just fits the room is lifted, and one a pixel short stays in the row', () => {
  const fits = placeCaptionRow(inputs({ rowLeft: 854 }))
  expect(fits.lift.title).toBe(true)
  expect(fits.title?.max).toBe(120)
  expect(fits.lift.trail).toBe(false)
  const short = placeCaptionRow(inputs({ rowLeft: 855 }))
  expect(short.lift.title).toBe(false)
  expect(short.title).toBeNull()
  expect(short.rowLift).toBe(0)
})

test('the cluster is judged by the width it needs, not by the box a limit left it with', () => {
  const needed = placeCaptionRow(inputs({ trail: { present: true, width: 60, need: 701 } }))
  expect(needed.lift.trail).toBe(false)
  expect(needed.title?.max).toBe(774)
  expect(placeCaptionRow(inputs({ trail: { present: true, width: 60, need: 60 } })).lift.trail).toBe(true)
})

test('a name that grew back past its old limit places the cluster against the width the words take', () => {
  const grown = placeCaptionRow(inputs({ title: { present: true, width: 120, natural: 500 } }))
  expect(grown.trail?.left).toBe(708)
  const room = placeCaptionRow(inputs({ title: { present: true, width: 120, natural: 900 } }))
  expect(room.trail?.left).toBe(200 + 706 + 8)
})

test('a window the cluster and the controls cannot both stand in keeps both in the row', () => {
  const tight = placeCaptionRow(inputs({ width: 353 }))
  expect(tight.lift.actions).toBe(false)
  expect(tight.utilitiesRight).toBeNull()
  expect(tight.cornerRight).toBeNull()
  expect(placeCaptionRow(inputs({ width: 354 })).lift.actions).toBe(true)
})

test('a place taken stands across the pixels a placement moves, and is given up past them', () => {
  // The room is 120 at a row left of 854, and one pixel less for every pixel the
  // row moves right; the pass keeps a place down to 4px below the threshold.
  const held = { title: true, trail: false, actions: false }
  expect(placeCaptionRow(inputs({ rowLeft: 858 })).lift.title).toBe(false)
  expect(placeCaptionRow(inputs({ rowLeft: 858, previous: held })).lift.title).toBe(true)
  expect(placeCaptionRow(inputs({ rowLeft: 858, previous: { ...held, title: false } })).lift.title).toBe(false)
  expect(placeCaptionRow(inputs({ rowLeft: 857, previous: held })).lift.title).toBe(true)
  expect(placeCaptionRow(inputs({ rowLeft: 859, previous: held })).lift.title).toBe(false)
})

test('a boundary the placement itself moves comes to rest', () => {
  // A lifted title closes the header, and the pass after it reads a row three
  // pixels further right: the same window answers both ways, one pass apart.
  const read = (lifted: boolean) => inputs({ rowLeft: 854 + (lifted ? 3 : 0) })
  const walked: boolean[] = []
  let previous: CaptionInputs['previous']
  for (let pass = 0; pass < 6; pass++) {
    const placed = placeCaptionRow({ ...read(previous?.title === true), ...(previous === undefined ? {} : { previous }) })
    walked.push(placed.lift.title)
    previous = placed.lift
  }
  expect(walked).toEqual([true, true, true, true, true, true])
})

test('a control cluster taken keeps its place across a step back, and no room at all gives it up', () => {
  // The window has room for the controls at 354px. The margin holds a placed
  // cluster four pixels below the threshold.
  const held = { title: true, trail: true, actions: true }
  expect(placeCaptionRow(inputs({ width: 352 })).lift.actions).toBe(false)
  expect(placeCaptionRow(inputs({ width: 352, previous: held })).lift.actions).toBe(true)
  expect(placeCaptionRow(inputs({ width: 350, previous: held })).lift.actions).toBe(true)
  expect(placeCaptionRow(inputs({ width: 349, previous: held })).lift.actions).toBe(false)
})

test('a missing control cluster leaves no air behind it', () => {
  const solo = placeCaptionRow(inputs({ corner: { present: false, width: 0 } }))
  expect(solo.utilitiesRight).toBe(148)
  expect(solo.lift.actions).toBe(true)
})

test('the tabs leave one gap before the tools and reserve title room', () => {
  const tabsWidth = 120
  const withoutTabs = placeCaptionRow(inputs())
  const withTabs = placeCaptionRow(inputs({ tabsWidth }))
  expect(withTabs.tabsRight).toBe(withTabs.utilitiesRight! + 114 + 8)
  expect(withTabs.title?.max).toBe(withoutTabs.title!.max - tabsWidth - 8)
})

test('the tabs keep the right side when the remaining space cannot hold the title', () => {
  const narrow = placeCaptionRow(inputs({ tabsWidth: 120, rowLeft: 840 }))
  expect(narrow.tabsRight).not.toBeNull()
  expect(narrow.lift.title).toBe(false)
  expect(placeCaptionRow(inputs({ tabsWidth: 120, rowLeft: 860 })).tabsRight).toBeNull()
})

test('the more-actions trigger starts at the title end and keeps the normal gap before the cluster', () => {
  const placed = placeCaptionRow(inputs({ menu: { present: true, width: 28 }, menuRight: 146 }))
  expect(placed.lift).toEqual({ title: true, trail: true, actions: true })
  expect(placed.menuLeft).toBe(200 + 300)
  expect(placed.trail?.left).toBe(200 + 300 + 28 + 8)
  // The trigger's width comes off the title's room, on the lift pass and after it.
  expect(placed.title?.max).toBe(706 - 28)
  const held = placeCaptionRow(inputs({ menu: { present: true, width: 28 }, menuRight: 146, previous: placed.lift }))
  expect(held.title).toEqual(placed.title)
  expect(held.menuLeft).toBe(placed.menuLeft)
})

test('the title lifts only with room for itself and the trigger beside it', () => {
  const menu = { present: true, width: 28 }
  const fits = placeCaptionRow(inputs({ menu, menuRight: 146, rowLeft: 826 }))
  expect(fits.lift.title).toBe(true)
  expect(fits.title?.max).toBe(120)
  const short = placeCaptionRow(inputs({ menu, menuRight: 146, rowLeft: 827 }))
  expect(short.lift.title).toBe(false)
  expect(short.menuLeft).toBeNull()
  const held = { title: true, trail: false, actions: false }
  expect(placeCaptionRow(inputs({ menu, menuRight: 146, rowLeft: 830, previous: held })).lift.title).toBe(true)
  expect(placeCaptionRow(inputs({ menu, menuRight: 146, rowLeft: 831, previous: held })).lift.title).toBe(false)
})

test('a shell seat too wide for the row keeps both sides in the header, trigger included', () => {
  const placed = placeCaptionRow(inputs({ menu: { present: true, width: 28 }, menuRight: 1200 }))
  expect(placed.lift).toEqual({ title: false, trail: false, actions: false })
  expect(placed.menuLeft).toBeNull()
  expect(placed.utilitiesRight).toBeNull()
})
