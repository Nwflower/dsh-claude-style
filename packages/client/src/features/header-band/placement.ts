/**
 * Where one caption-row pass puts the four pieces it can lift: the title, the
 * cluster the host keeps beside it, the two control clusters and the tab strip.
 *
 * The pass measures and writes; this decides, from numbers alone, so the
 * thresholds can be walked in a unit test instead of by dragging a window. The
 * judge never reads a box it wrote itself: the cluster's width arrives as the
 * need the pass measured while nothing capped it (D9), and the title's as the
 * width its words take, not the width the last pass handed it.
 */

/** The air between anything placed here and its neighbour. */
const GAP = 8
/** What the row keeps clear at its left end when the shell mounts no menu seat: the sidebar's control. */
const FURNITURE = 48
/** Below this a lifted title would be a stub: it stays in the row instead. */
const MIN_TITLE = 120

/** Everything one pass places against, in the page's pixels (shared/page-zoom.ts). */
export interface CaptionInputs {
  /** The window's width. */
  width: number
  /** The caption row's height. */
  bandHeight: number
  /** The caption buttons' reserve at the right edge. */
  controls: number
  /** The title row's left edge. */
  rowLeft: number
  /** The shell menu seat's right edge, or null while none is mounted. */
  menuRight: number | null
  /** The view-tab strip's content width, and whether it already shares the caption row. */
  strip: { width: number, inBand: boolean }
  /** The title's box, the width its words need, and whether the row carries one. */
  title: { present: boolean, width: number, natural: number }
  /** The cluster beside the title: its box, its need, and whether the row carries one. */
  trail: { present: boolean, width: number, need: number }
  /** The two control clusters: whether each is on the page, and its width. */
  utilities: { present: boolean, width: number }
  corner: { present: boolean, width: number }
  /** The row's top edge, the lift it already carries, and the title box's height. */
  row: { top: number, applied: number }
  titleHeight: number
}

/** What the pass writes, one number per side and the run its strip takes. */
export interface CaptionPlacement {
  lift: { title: boolean, trail: boolean, actions: boolean }
  /** The row's own rise, written as a negative top margin. */
  rowLift: number
  /** Where the row's top belongs: the lower edge of the title's centred box. */
  rowTop: number
  /** The title's place and the room it is handed, or null while it stays in the row. */
  title: { left: number, max: number, top: number } | null
  /** The cluster's place, or null while it stays beside the title in the row. */
  trail: { left: number, top: number } | null
  /** The two control clusters' right offsets, or null while they stay in the row. */
  utilitiesRight: number | null
  cornerRight: number | null
  /** Where the strip's middle goes, or null while it is outside the caption row. */
  stripLeft: number | null
}

/** The width the title's own run needs: its words, capped by nothing this pass wrote. */
function titleRun(title: CaptionInputs['title']) {
  return Math.max(title.width, title.natural)
}

/**
 * Place one pass. Every number is decided here, in this order; a piece whose
 * room falls below the thresholds keeps the row, which needs no undoing.
 */
export function placeCaptionRow(inputs: CaptionInputs): CaptionPlacement {
  const { width, bandHeight, controls, rowLeft, menuRight, strip, title, trail, utilities, corner } = inputs
  const stripWidth = strip.inBand ? strip.width : 0
  // The strip is centred on the window by its own feature; this pass moves it,
  // so its room is read off the width rather than the box it is about to leave.
  const stripRight = stripWidth === 0 ? 0 : width / 2 + stripWidth / 2
  // The shell's own menu seat takes the row's left end, and the collapsed
  // sidebar's control sits left of it whether the seat is mounted or not.
  const furniture = menuRight === null ? FURNITURE : Math.max(FURNITURE, menuRight)
  // Either control cluster can be missing: the corner seat is empty while the
  // right sidebar is open, whose own chrome carries those controls. The cluster
  // that is there still belongs in the caption row, and a missing one leaves no
  // air behind.
  const utilitiesWidth = utilities.present ? utilities.width : 0
  const cornerWidth = corner.present ? corner.width : 0
  const clusterWidth = utilitiesWidth + cornerWidth + (utilities.present && corner.present ? GAP : 0)
  // The caption buttons' reserve, and the air this skin keeps off it. The width
  // is the one fixed boxes are placed in: the document's client width leaves
  // out a page scrollbar, which `innerWidth` counts.
  const edge = width - controls - GAP
  const cornerRight = controls + GAP
  const liftActions = clusterWidth > 0 && edge - clusterWidth >= Math.max(furniture, stripRight) + GAP
  const left = Math.max(rowLeft, furniture + GAP)
  // Where the row's right-hand content ends: the controls when they are lifted,
  // the caption buttons when they stayed in the row.
  const rightStop = liftActions ? edge - clusterWidth : width - controls
  // The title's room runs up to that end, less the strip's width and the air on
  // both sides of it.
  const room = rightStop - GAP - (strip.inBand ? stripWidth + GAP : 0) - left
  const liftTitle = title.present && room >= MIN_TITLE
  // The cluster takes the caption row's next place, and its own need comes off
  // the title's room. A capped cluster would measure at the cap, so the number
  // read here is the need the pass keeps (D9).
  const titleRoom = room - trail.need - GAP
  const liftTrail = liftTitle && trail.present && titleRoom >= MIN_TITLE
  const titleMax = liftTrail ? titleRoom : room
  // A limit this element still carries from an earlier placement would be
  // measured as its width and squeeze the chips it holds.
  const titleWidth = Math.min(titleRun(title), titleMax)
  const trailLeft = left + titleWidth + GAP
  const titleCentre = bandHeight / 2
  const titleHeight = inputs.titleHeight
  const rowTop = titleCentre + titleHeight / 2
  const rowLift = liftTitle ? Math.max(0, Math.round(inputs.row.top - inputs.row.applied - rowTop)) : 0
  const utilitiesRight = cornerRight + (corner.present ? cornerWidth + GAP : 0)
  // The strip is centred in what is left between the title and the controls —
  // or between the shell's own left end and the caption buttons when a side
  // stayed in the row. The left-hand content ends where the cluster beside the
  // title ends.
  const leftStop = liftTrail
    ? left + Math.min(titleWidth, titleRoom) + GAP + trail.need
    : liftTitle ? left + titleWidth : furniture
  const stripLeft = strip.inBand ? Math.round((leftStop + rightStop) / 2) : null
  return {
    lift: { title: liftTitle, trail: liftTrail, actions: liftActions },
    rowLift,
    rowTop,
    title: liftTitle ? { left: Math.round(left), max: Math.round(titleMax), top: Math.round(titleCentre) } : null,
    trail: liftTrail ? { left: Math.round(trailLeft), top: Math.round(titleCentre) } : null,
    utilitiesRight: liftActions && utilities.present ? Math.round(utilitiesRight) : null,
    cornerRight: liftActions && corner.present ? Math.round(cornerRight) : null,
    stripLeft,
  }
}

