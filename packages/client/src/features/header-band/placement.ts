/**
 * Where one caption-row pass puts the five pieces it can lift: the title, the
 * session's more-actions trigger beside it, the cluster the host keeps beside
 * the title and the two control clusters.
 *
 * The pass measures and writes; this decides, from numbers alone, so the
 * thresholds can be walked in a unit test instead of by dragging a window. The
 * judge never reads a box it wrote itself: the cluster's width arrives as the
 * need the pass measured while nothing capped it (D9), the title's as the
 * width its words take, not the width the last pass handed it, and the
 * trigger's as its own fixed square, which no placement caps.
 */

/** The default air between items in the caption. */
const GAP = 8
/** What the row keeps clear at its left end when the shell mounts no menu seat: the sidebar's control. */
const FURNITURE = 48
/** Below this a lifted title would be a stub: it stays in the row instead. */
const MIN_TITLE = 120
/**
 * How far a piece's room may fall back below its threshold before the place it
 * took is given up.
 *
 * A pass reads the layout it last wrote: lifting a piece out of the row changes
 * the room the row has, the boxes standing in it and the header's own height, so
 * the numbers the next pass reads are a few pixels from the ones it decided on.
 * On a threshold those few pixels answer the other way, the piece goes back into
 * the row, the row moves back, and the pass that follows lifts it again — a
 * caption row that never comes to rest. Keeping a place across a margin wider
 * than that shift ends the walk at the state the window is nearest, instead of
 * alternating between two.
 */
const KEEP = 4

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
  /** The shell menu seat's right edge, or null while none is mounted; the seat keeps the row's left end. */
  menuRight: number | null
  /** The more-actions trigger: whether the row carries one, and the width of its square. */
  menu: { present: boolean, width: number }
  /** The title's box, the width its words need, and whether the row carries one. */
  title: { present: boolean, width: number, natural: number }
  /** The cluster beside the title: its box, its need, and whether the row carries one. */
  trail: { present: boolean, width: number, need: number }
  /** The two control clusters: whether each is on the page, and its width. */
  utilities: { present: boolean, width: number }
  corner: { present: boolean, width: number }
  /** Width of the visible tabs and overflow trigger, when tabs are enabled. */
  tabsWidth?: number
  /**
   * The header's own top edge and the title box's height. The row's rise is
   * decided from these alone: the pass stands the header's inset over the row's
   * line and lifts the row by what the inset cannot cover, so no number it wrote
   * before enters the next decision.
   */
  headerTop: number
  titleHeight: number
  /**
   * The places the last pass gave the pieces, or absent on a page's first pass.
   * A piece keeps the place it holds until its room falls back past the margin
   * (KEEP), so the pixels a placement moves cannot answer a threshold the other
   * way on the pass that follows it.
   */
  previous?: { title: boolean, trail: boolean, actions: boolean }
}

/** What the pass writes for the title and control clusters. */
export interface CaptionPlacement {
  lift: { title: boolean, trail: boolean, actions: boolean }
  /** The row's own rise, written as a negative top margin. */
  rowLift: number
  /** Where the row's top belongs: the lower edge of the title's centred box. */
  rowTop: number
  /** The header's top inset that stands the row on that line, as far as the inset can. */
  headerInset: number
  /** The title's place and the room it is handed, or null while it stays in the row. */
  title: { left: number, max: number, top: number } | null
  /** The more-actions trigger's position in the caption, or null when the regular title anchor places it. */
  menuLeft: number | null
  /** The cluster's place, or null while it stays beside the title in the row. */
  trail: { left: number, top: number } | null
  /** The two control clusters' right offsets, or null while they stay in the row. */
  utilitiesRight: number | null
  cornerRight: number | null
  /** The tabs' right offset in the caption, or null while they remain in the header. */
  tabsRight: number | null
}

/** The width the title's own run needs: its words, capped by nothing this pass wrote. */
function titleRun(title: CaptionInputs['title']) {
  return Math.max(title.width, title.natural)
}

/**
 * Whether a piece takes a place with the room it has: the threshold decides a
 * piece that stands in the row, and a piece already in the caption row keeps its
 * place until the room falls the margin below it (KEEP).
 */
function takesPlace(room: number, threshold: number, held: boolean) {
  return held ? room >= threshold - KEEP : room >= threshold
}

/**
 * Place one pass. Every number is decided here, in this order; a piece whose
 * room falls below the thresholds keeps the row, which needs no undoing.
 */
export function placeCaptionRow(inputs: CaptionInputs): CaptionPlacement {
  const { width, bandHeight, controls, rowLeft, menuRight, title, trail, utilities, corner, menu } = inputs
  const held = inputs.previous ?? null
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
  // The room the cluster needs at the right end, and the margin it keeps once it
  // stands there (KEEP).
  const actionsRoom = edge - clusterWidth - furniture - GAP
  const liftActions = clusterWidth > 0 && takesPlace(actionsRoom, 0, held?.actions === true)
  const left = Math.max(rowLeft, furniture + GAP)
  // Where the row's right-hand content ends: the controls when they are lifted,
  // the caption buttons when they stayed in the row.
  const rightStop = liftActions ? edge - clusterWidth : width - controls
  const tabsWidth = inputs.tabsWidth ?? 0
  const available = rightStop - GAP - left
  // The tabs follow the right-hand controls. When the remaining room is too
  // small for a readable title, the title stays in the conversation header.
  const liftTabs = tabsWidth > 0 && available >= tabsWidth
  const room = available - (liftTabs ? tabsWidth + GAP : 0)
  // The trigger rides beside the title whenever the title lifts, so the
  // title's room carries the trigger's width on every pass, lifted or not: a
  // threshold that counts the trigger only once it rides would answer both
  // ways a pass apart at the boundary.
  const menuWidth = menu.present ? menu.width : 0
  const liftTitle = title.present && takesPlace(room - menuWidth, MIN_TITLE, held?.title === true)
  const menuRides = menu.present && liftTitle
  // The cluster takes the caption row's next place after the trigger, and its
  // own need comes off the title's room. A capped cluster would measure at the
  // cap, so the number read here is the need the pass keeps (D9).
  const titleBase = room - (menuRides ? menuWidth : 0)
  const titleRoom = titleBase - trail.need - GAP
  const liftTrail = liftTitle && trail.present && takesPlace(titleRoom, MIN_TITLE, held?.trail === true)
  const titleMax = liftTrail ? titleRoom : titleBase
  // A limit this element still carries from an earlier placement would be
  // measured as its width and squeeze the chips it holds.
  const titleWidth = Math.min(titleRun(title), titleMax)
  const menuLeft = menuRides ? left + titleWidth : null
  const trailLeft = left + titleWidth + GAP + (menuRides ? menuWidth : 0)
  const titleCentre = bandHeight / 2
  const titleHeight = inputs.titleHeight
  const rowTop = titleCentre + titleHeight / 2
  // The header's inset is the header's own walk down to the row's line, and the
  // row's rise is what is left of that walk once the inset has taken it: the two
  // numbers are read off one header edge, so the pass writes them together and
  // the row lands on the line in the pass that writes them.
  const headerInset = liftTitle ? Math.max(0, Math.round(rowTop - inputs.headerTop)) : 0
  const rowLift = liftTitle ? Math.max(0, Math.round(inputs.headerTop + headerInset - rowTop)) : 0
  const utilitiesRight = cornerRight + (corner.present ? cornerWidth + GAP : 0)
  return {
    lift: { title: liftTitle, trail: liftTrail, actions: liftActions },
    rowLift,
    rowTop,
    headerInset,
    title: liftTitle ? { left: Math.round(left), max: Math.round(titleMax), top: Math.round(titleCentre) } : null,
    menuLeft: menuLeft === null ? null : Math.round(menuLeft),
    trail: liftTrail ? { left: Math.round(trailLeft), top: Math.round(titleCentre) } : null,
    utilitiesRight: liftActions && utilities.present ? Math.round(utilitiesRight) : null,
    cornerRight: liftActions && corner.present ? Math.round(cornerRight) : null,
    tabsRight: liftTabs ? Math.round(width - rightStop + GAP) : null,
  }
}

