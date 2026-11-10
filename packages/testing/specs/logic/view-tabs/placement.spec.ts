/**
 * Where the conversation's view-tab strip is drawn from the boxes around it:
 * lifted onto the title's line when the room above is real, kept on its own row
 * on a sideways clash, and — with the session overview installed — moved past
 * the title and its actions instead of dropping, because the panel has taken
 * the header's background-work chips and the switch belongs beside the title.
 * The header's top inset holds in every case, and the utilities cluster at the
 * right end is never run under.
 *
 * @capability view-tabs
 * @features view-tabs
 * @risk A strip placed over the title or the header's actions hides both, a
 *   strip pushed under the utilities runs off the header, the lift escapes the
 *   header's top inset, the placement stops being idempotent (each pass moves
 *   the strip by the last shift again), or the panel's installation leaves the
 *   strip on its own row where the reader asked for the title's line.
 */
import { expect, test } from 'vitest'
import { FALLBACK_VIEW_TAB_SHIFT, VIEW_TAB_CLEARANCE, VIEW_TAB_TOP_INSET, placementFor } from '@dsh-claude-style/client/pure'
import type { PlacementBox } from '@dsh-claude-style/client/pure'

const box = (left: number, top: number, width: number, height: number): PlacementBox => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
  width,
  height,
})

/** A header 60px tall, its title on the line, and the strip on the row below. */
const HEADER = box(0, 0, 1200, 60)
const TITLE = box(300, 11, 106, 28)
const ACTIONS = box(416, 14, 68, 22)
const UTILITIES = box(980, 14, 220, 32)
/** The strip as the pass reads it while it already wears the fallback lift: natural top 60. */
const strip = (left: number, width = 94) => box(left, 50, width, 26)
const APPLIED = { y: FALLBACK_VIEW_TAB_SHIFT, x: 0 }

test('a strip clear of the title and its actions takes the title line', () => {
  const placement = placementFor({ strip: strip(795), header: HEADER, title: TITLE, actions: ACTIONS, utilities: UTILITIES }, APPLIED, false)
  expect(placement).not.toBeNull()
  expect(placement?.y).toBe(TITLE.top + TITLE.height / 2 - 60 - 13)
  expect(placement?.x).toBe(0)
  expect(placement?.titleCap).toBeNull()
})

test('without the panel a sideways clash leaves the strip on its own row', () => {
  const placement = placementFor({ strip: strip(350), header: HEADER, title: TITLE, actions: ACTIONS, utilities: UTILITIES }, APPLIED, false)
  expect(placement).toEqual({ y: FALLBACK_VIEW_TAB_SHIFT, x: 0, titleCap: null })
})

test('with the panel a clash takes the row\'s right end and caps the title to what is left', () => {
  const placement = placementFor({ strip: strip(350), header: HEADER, title: TITLE, actions: ACTIONS, utilities: UTILITIES }, APPLIED, true)
  // The strip ends where the clearance before the utilities begins.
  const start = UTILITIES.left - VIEW_TAB_CLEARANCE - 94
  expect(placement?.x).toBe(start - 350)
  expect(placement?.y).toBe(TITLE.top + TITLE.height / 2 - 60 - 13)
  // The title keeps the span up to the strip, less the actions and the gaps.
  expect(placement?.titleCap).toBe(start - VIEW_TAB_CLEARANCE - ACTIONS.width - TITLE.left)
})

test('a strip centred past its slot moves left to take the row\'s right end', () => {
  // The strip's content starts left of where its right end would put it.
  const placement = placementFor({ strip: strip(400), header: HEADER, title: TITLE, actions: ACTIONS, utilities: UTILITIES }, APPLIED, true)
  expect(placement?.x).toBe(UTILITIES.left - VIEW_TAB_CLEARANCE - 94 - 400)
  expect(placement?.titleCap).not.toBeNull()
})

test('a row with no room for a readable title keeps the strip on its own row', () => {
  // A wide strip whose right end would leave the title almost no width.
  const placement = placementFor({ strip: strip(350, 620), header: HEADER, title: TITLE, actions: ACTIONS, utilities: UTILITIES }, APPLIED, true)
  expect(placement).toEqual({ y: FALLBACK_VIEW_TAB_SHIFT, x: 0, titleCap: null })
})

test('the lift stays under the header\'s own top inset', () => {
  const high = box(300, 2, 106, 16)
  const placement = placementFor({ strip: strip(795), header: HEADER, title: high, actions: null, utilities: UTILITIES }, APPLIED, false)
  expect(placement?.y).toBe(HEADER.top + VIEW_TAB_TOP_INSET - 60)
  expect(placement?.titleCap).toBeNull()
})

test('with the panel the strip takes the row\'s right end even when centred it would not clash', () => {
  const placement = placementFor({ strip: strip(795), header: HEADER, title: TITLE, actions: ACTIONS, utilities: UTILITIES }, APPLIED, true)
  expect(placement?.y).toBe(TITLE.top + TITLE.height / 2 - 60 - 13)
  expect(placement?.x).toBe(UTILITIES.left - VIEW_TAB_CLEARANCE - 94 - 795)
  expect(placement?.titleCap).toBe(UTILITIES.left - VIEW_TAB_CLEARANCE - 94 - VIEW_TAB_CLEARANCE - ACTIONS.width - TITLE.left)
})

test('the transform already on the strip is taken out before the next placement', () => {
  const wearing = box(795, 12, 94, 26)
  const placement = placementFor({ strip: wearing, header: HEADER, title: TITLE, actions: ACTIONS, utilities: UTILITIES }, { y: -48, x: 0 }, false)
  expect(placement?.y).toBe(-48)
  expect(placement?.x).toBe(0)
  expect(placement?.titleCap).toBeNull()
})

test('no title means no placement', () => {
  expect(placementFor({ strip: strip(795), header: HEADER, title: null, actions: null, utilities: null }, APPLIED, true)).toBeNull()
})
