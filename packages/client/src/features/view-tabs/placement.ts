/**
 * Where the conversation's view-tab strip sits, decided from boxes alone (D92):
 * the measurer in view-tabs.ts reads the page and this module answers the
 * translate the stylesheet applies.
 *
 * The strip is lifted onto the title's own line when the room above it is real.
 * With the session overview installed the lift always happens, and the strip
 * takes the header's centre while the title truncates to leave it room. Without
 * the panel a sideways clash leaves the strip on its own row, as the shipped
 * layout shows it.
 */

/** One box the placement reads: the four edges and the size, the shape a DOMRect and a spec both answer. */
export interface PlacementBox {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly width: number
  readonly height: number
}

/** The boxes one placement is decided from. */
export interface StripBoxes {
  /** What the strip draws: the plate and its overflow chip. */
  readonly strip: PlacementBox | null
  readonly header: PlacementBox | null
  /** The title's words, the line the strip is lifted onto. */
  readonly title: PlacementBox | null
  /** The title's own actions, the cluster the strip clears when the panel is on. */
  readonly actions: PlacementBox | null
  /** The header's utilities, the right end the strip may not run under. */
  readonly utilities: PlacementBox | null
}

/** The translate the strip wears now, in the page's pixels. */
export interface StripTranslate {
  readonly y: number
  readonly x: number
}

/** The translate the stylesheet reads, in the page's pixels, and the title's cap when it shares the line. */
export interface StripPlacement {
  readonly y: number
  readonly x: number
  /**
   * The width the title's words keep on the line: the placed strip takes the
   * rest of the row, and the title truncates to this. Null leaves the title its
   * own width.
   */
  readonly titleCap: number | null
}

/** The stylesheet's fallback lift: the strip's own row. */
export const FALLBACK_VIEW_TAB_SHIFT = -10
/** The header's own top inset; the lifted strip may not enter it. */
export const VIEW_TAB_TOP_INSET = 8
/** Breathing room between the lifted strip and whatever shares the line. */
export const VIEW_TAB_CLEARANCE = 6
/** The least title width worth capping to; below it the strip keeps its own row instead. */
export const VIEW_TAB_MIN_TITLE = 48

/** Whether two boxes stand within `clearance` of each other horizontally. */
function clashes(strip: PlacementBox, box: PlacementBox) {
  return strip.right > box.left - VIEW_TAB_CLEARANCE && strip.left < box.right + VIEW_TAB_CLEARANCE
}

/** The header's top edge the lifted strip is clamped under. */
function liftFor(strip: PlacementBox, header: PlacementBox, title: PlacementBox) {
  const want = title.top + title.height / 2 - strip.top - strip.height / 2
  const top = strip.top + want
  return top < header.top + VIEW_TAB_TOP_INSET ? header.top + VIEW_TAB_TOP_INSET - strip.top : want
}

/**
 * Decide one strip's translate.
 *
 * @param boxes - the boxes taken in the pass's read phase; the strip, header and
 *   title are required, the actions and utilities optional.
 * @param applied - the translate the strip already wears, taken out of the read
 *   positions before the new one is decided.
 * @param panelOn - whether the session overview is installed.
 * @returns the translate, or null when a required box is missing.
 */
export function placementFor(boxes: StripBoxes, applied: StripTranslate, panelOn: boolean): StripPlacement | null {
  const { strip, header, title, actions, utilities } = boxes
  if (strip === null || header === null || title === null) return null
  // The strip's natural position, before the transform now on it.
  const naturalTop = strip.top - applied.y
  const naturalLeft = strip.left - applied.x
  // A DOMRect's width and height are prototype getters, so a spread would drop
  // them; the box is spelled out.
  const natural: PlacementBox = {
    top: naturalTop,
    bottom: naturalTop + strip.height,
    left: naturalLeft,
    right: naturalLeft + strip.width,
    width: strip.width,
    height: strip.height,
  }
  const lift = liftFor(natural, header, title)
  const onLine = Math.round(lift)
  const clash = clashes(natural, title) || (actions !== null && clashes(natural, actions))
  if (!panelOn) return { y: clash ? FALLBACK_VIEW_TAB_SHIFT : onLine, x: 0, titleCap: null }
  // With the panel installed the strip stays centred in the conversation
  // header; a wide utilities cluster can move it left, never past its own right
  // edge. The title's current width stays out of this decision because the cap
  // written here would otherwise feed back into the next placement (D40).
  const limit = (utilities === null ? header.right : utilities.left) - VIEW_TAB_CLEARANCE
  const centred = header.left + (header.width - strip.width) / 2
  const start = Math.min(centred, limit - strip.width)
  const actionsWidth = actions === null ? 0 : actions.width
  const cap = start - VIEW_TAB_CLEARANCE - actionsWidth - title.left
  // A row with no room for a readable title keeps the strip on its own row.
  if (cap < VIEW_TAB_MIN_TITLE) return { y: FALLBACK_VIEW_TAB_SHIFT, x: 0, titleCap: null }
  return { y: onLine, x: Math.round(start - naturalLeft), titleCap: Math.round(cap) }
}
