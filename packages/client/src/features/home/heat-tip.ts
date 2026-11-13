import { inPageBox, inPagePixels } from '../../shared/page-zoom'
import { hidePointerHint, POINTER_HINT_SHOWN_ATTRIBUTE, showPointerHint } from '../../shared/pointer-hint'

/** Move one heat-grid pill between cells, keeping it inside the grid. */

/** The heat grid's cell whose `data-tip` names the day. */
export const HEAT_CELL_SELECTOR = '.dsh-claude-home-heat-cell'
/** The words a cell carries for its own day. */
export const HEAT_TIP_ATTR = 'data-tip'
/** The pill the grid carries: the day tip, painted as the inverted pill. */
export const HEAT_HINT_CLASS = 'dsh-claude-home-heat-hint'
/** The box inside the pill its words sit in. */
export const HEAT_HINT_TEXT_CLASS = 'dsh-claude-home-heat-hint-text'
/** The attribute the sheet shows the pill by; its absence is the pill away. */
export const HEAT_HINT_SHOWN_ATTR = POINTER_HINT_SHOWN_ATTRIBUTE
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
 * Position a cell's pill inside the grid, converting viewport measurements to
 * the page's own pixels (shared/page-zoom.ts).
 */
export function placeHeatTip(cell: HTMLElement, grid: HTMLElement, width: number, height: number): HeatTipPlacement {
  const gridBox = inPageBox(grid.getBoundingClientRect())
  const cellBox = inPageBox(cell.getBoundingClientRect())
  const centred = cellBox.left + cellBox.width / 2 - width / 2
  const left = Math.min(Math.max(centred, gridBox.left), gridBox.right - width)
  const above = cellBox.top - gridBox.top
  const below = gridBox.bottom - cellBox.bottom
  // Keep the pill above unless the lower side has room.
  const side = below > above && below >= height + HEAT_TIP_GAP ? 'below' : 'above'
  const top = side === 'below' ? cellBox.bottom + HEAT_TIP_GAP : cellBox.top - HEAT_TIP_GAP - height
  return {
    left: left - gridBox.left,
    top: top - gridBox.top,
    side,
  }
}

interface HeatTip {
  element: HTMLElement
  text: HTMLElement
}

const PILLS = new WeakMap<HTMLElement, HeatTip>()

/** Look the pill up again after a render replaces it. */
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

/** Read the pill's entrance scale so its measured box is its settled size. */
function pillScale(style: CSSStyleDeclaration): number {
  const scale = style.getPropertyValue('scale')
  if (scale === 'none') return 1
  const factor = Number.parseFloat(scale)
  return Number.isFinite(factor) && factor > 0 ? factor : 1
}

/**
 * Show the pill for the day under the pointer. Measure its new words rather than
 * the travelling box, and suppress the first placement's transition.
 */
export function showHeatTip(cell: HTMLElement, grid: HTMLElement) {
  const label = cell.getAttribute(HEAT_TIP_ATTR)
  // A grid still drawing its placeholders names no day yet.
  if (label === null) return
  const { element } = pillOf(grid)
  showPointerHint(element, label, text => {
    // Per read: the range must not retain a grid after its view closes (D12).
    const wordsRange = document.createRange()
    wordsRange.selectNodeContents(text)
    const style = getComputedStyle(element)
    // Undo the entrance scale and page zoom before writing the settled box.
    const scale = pillScale(style)
    const words = inPagePixels(wordsRange.getBoundingClientRect().width / scale)
    const width = Math.ceil(words) + Math.ceil(Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight))
    const height = Math.ceil(inPagePixels(element.getBoundingClientRect().height / scale))
    const placement = placeHeatTip(cell, grid, width, height)
    return () => {
      element.style.width = `${width}px`
      element.style.setProperty('--dsh-claude-heat-tip-x', `${placement.left}px`)
      element.style.setProperty('--dsh-claude-heat-tip-y', `${placement.top}px`)
      element.setAttribute(HEAT_HINT_SIDE_ATTR, placement.side)
    }
  }, HEAT_HINT_SHOWN_ATTR)
}

/** Take the grid's pill away, the pointer having left the grid. */
export function hideHeatTip(grid: HTMLElement) {
  hidePointerHint(PILLS.get(grid)?.element ?? null, HEAT_HINT_SHOWN_ATTR)
}
