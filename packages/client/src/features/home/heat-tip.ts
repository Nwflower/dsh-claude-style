import { inPageBox, inPagePixels } from '../../shared/page-zoom'
import { withoutTransition } from '../../shared/transition'

/**
 * The day tip the usage panel's heat grid shows: one pill the grid carries, which
 * names whichever day the pointer is on.
 *
 * It stands in the grid once and moves between cells, so a crossing changes the
 * word in one pill rather than building a box per cell and dropping it again in
 * the 3px gutters between them.
 *
 * Where it stands is decided from the pill's own measured box: centred on its cell
 * while it fits inside the grid, pushed in at the edge where it would hang past
 * it, and hung under cells whose lower side holds more room than the upper one —
 * a pill over the grid's top edge would be clipped by the panel's scroll box.
 */

/** The cell the heat grid is built from; the pill names the day it stands for. */
export const HEAT_CELL_SELECTOR = '.dsh-claude-home-heat-cell'
/** The words a cell carries for its own day. */
export const HEAT_TIP_ATTR = 'data-tip'
/** The pill the grid carries: the day tip, painted as the inverted pill. */
export const HEAT_HINT_CLASS = 'dsh-claude-home-heat-hint'
/** The box inside the pill its words sit in. */
export const HEAT_HINT_TEXT_CLASS = 'dsh-claude-home-heat-hint-text'
/** The attribute the sheet shows the pill by; its absence is the pill away. */
export const HEAT_HINT_SHOWN_ATTR = 'data-shown'
/** The side of its cell the pill stands on, read by the sheet's own origin. */
export const HEAT_HINT_SIDE_ATTR = 'data-side'
/** The air between a cell and the pill that names it. */
export const HEAT_TIP_GAP = 6

/** Where the pill stands, as lengths of the grid's own box. */
export interface HeatTipPlacement {
  /** The left edge, from the grid's left edge. */
  left: number
  /** The top edge, from the grid's top edge. */
  top: number
  /** The side of the cell the pill stands on. */
  side: 'above' | 'below'
}

/**
 * Stand a cell's pill inside `grid`: line it up with the edge that keeps it in,
 * and put it on the side of the cell that has the room.
 *
 * The boxes are measured in the viewport's pixels and returned as lengths the
 * page's own styles read, since the page may be drawn at a zoom
 * (shared/page-zoom.ts).
 *
 * @param cell - the day under the pointer.
 * @param grid - the grid the pill stands in.
 * @param width - the pill's measured width, padding included, in the page's pixels.
 * @param height - the pill's measured height, padding included, in the page's pixels.
 */
export function placeHeatTip(cell: HTMLElement, grid: HTMLElement, width: number, height: number): HeatTipPlacement {
  const gridBox = inPageBox(grid.getBoundingClientRect())
  const cellBox = inPageBox(cell.getBoundingClientRect())
  const centred = cellBox.left + cellBox.width / 2 - width / 2
  const left = Math.min(Math.max(centred, gridBox.left), gridBox.right - width)
  const above = cellBox.top - gridBox.top
  const below = gridBox.bottom - cellBox.bottom
  // The lower side takes the pill only where it holds more room than the upper
  // one and room enough for the pill itself: a grid squeezed too short for
  // either keeps the pill above, where it has always stood.
  const side = below > above && below >= height + HEAT_TIP_GAP ? 'below' : 'above'
  const top = side === 'below' ? cellBox.bottom + HEAT_TIP_GAP : cellBox.top - HEAT_TIP_GAP - height
  return {
    // The pill is positioned in the grid's own box, so the viewport's edges are
    // measured off the grid rather than written down.
    left: left - gridBox.left,
    top: top - gridBox.top,
    side,
  }
}

/** The pill one grid carries: the element the page holds now, and a pending write. */
interface HeatTip {
  element: HTMLElement
  text: HTMLElement
}

/** The pill each grid was last driven through, by the grid it stands in. */
const PILLS = new WeakMap<HTMLElement, HeatTip>()

/**
 * The pill standing in `grid`. A re-render replaces the grid's children, so the
 * element is looked up again whenever the one held has left.
 */
function pillOf(grid: HTMLElement) {
  const held = PILLS.get(grid)
  if (held !== undefined && held.element.parentElement === grid) return held
  const element = grid.querySelector(`:scope > .${HEAT_HINT_CLASS}`)
  if (!(element instanceof HTMLElement)) throw new Error(`heat-tip: the grid carries no ${HEAT_HINT_CLASS}`)
  const text = element.firstElementChild
  if (!(text instanceof HTMLElement)) throw new Error(`heat-tip: the pill carries no ${HEAT_HINT_TEXT_CLASS}`)
  const pill = { element, text }
  PILLS.set(grid, pill)
  return pill
}

/** The words' own width, taken from the text rather than from the box it sits in. */
const WORDS = new Range()

/**
 * The factor the pill's box is drawn at, read from the style the sheet gives it:
 * the pill grows from a scale below one into the size it shows at, so a box
 * measured inside it carries the factor of the moment.
 */
function pillScale(style: CSSStyleDeclaration): number {
  const scale = style.getPropertyValue('scale')
  if (scale === 'none') return 1
  const factor = Number.parseFloat(scale)
  return Number.isFinite(factor) && factor > 0 ? factor : 1
}

/**
 * Name the day under the pointer in the grid's pill, and stand it over that cell.
 *
 * The width comes from the words themselves: the pill travels between two days on
 * a transition, so its own box holds a width from the frame before, and the box
 * the placement needs is the one the new words will take. That travel is also why
 * the first sighting writes its place with the transitions held back — a pill
 * arriving at its day is seen appearing there, never sliding out of the corner it
 * rested in (home-overview.css).
 *
 * The size read is the pill's own: the scale it is drawn at is taken out of the
 * measure, so a box read while the pill is growing is the box it shows at, and
 * the panel's own box does not follow the transition.
 *
 * @param cell - the day under the pointer.
 * @param grid - the grid the cell stands in.
 */
export function showHeatTip(cell: HTMLElement, grid: HTMLElement) {
  const label = cell.getAttribute(HEAT_TIP_ATTR)
  // A grid still drawing its placeholders names no day yet.
  if (label === null) return
  const { element, text } = pillOf(grid)
  const arriving = !element.hasAttribute(HEAT_HINT_SHOWN_ATTR)
  text.textContent = label
  WORDS.selectNodeContents(text)
  const style = getComputedStyle(element)
  // The pill grows from a scale below one into the size it shows at, so a box
  // measured inside it carries the factor of the moment. Both measures are
  // brought back to the pill's own size and to the page's own pixels, so the box
  // written below is the same on every day and follows no transition
  // (shared/page-zoom.ts).
  const scale = pillScale(style)
  const words = inPagePixels(WORDS.getBoundingClientRect().width / scale)
  const width = Math.ceil(words) + Math.ceil(Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight))
  const height = Math.ceil(inPagePixels(element.getBoundingClientRect().height / scale))
  const placement = placeHeatTip(cell, grid, width, height)
  const write = () => {
    element.style.width = `${width}px`
    element.style.setProperty('--dsh-claude-heat-tip-x', `${placement.left}px`)
    element.style.setProperty('--dsh-claude-heat-tip-y', `${placement.top}px`)
    element.setAttribute(HEAT_HINT_SIDE_ATTR, placement.side)
  }
  if (arriving) withoutTransition([element], write)
  else write()
  element.setAttribute(HEAT_HINT_SHOWN_ATTR, '')
}

/** Take the grid's pill away, the pointer having left the grid. */
export function hideHeatTip(grid: HTMLElement) {
  PILLS.get(grid)?.element.removeAttribute(HEAT_HINT_SHOWN_ATTR)
}
