import { BOTTOM_PANEL_SELECTOR, COMPOSER_SELECTOR, RIGHTBAR_COLUMN_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeLayoutElements } from '@dsh-claude-style/engine/layout-elements'
import { cacheFirstMatch } from '@dsh-claude-style/engine/host'
import { PAGE_ZOOM_ATTR } from '../../constants'
import { heldWrites } from '../../shared/held-writes'
import { pageZoomFactor } from '../../shared/page-zoom'
import { panelLength } from '../../shared/panel-length'

/**
 * The bottom panel of `dsh-better-sidebar`, placed in the page's pixels.
 *
 * The plugin lays the panel out from the viewport's pixels while the page's zoom
 * scales the fixed host it hangs in a second time: at 1.25x the panel leaves the
 * viewport, at 0.8x it stands over the conversation. Its own size already
 * carries the factor, so only the edges are taken from what already sits in the
 * page — the two side columns and the composer's seat, read through the host's
 * contracts and the skin's own part mark. A column being dragged keeps its own
 * layout, so nothing is written until the drag ends; a page at scale 1 keeps
 * every value the plugin wrote.
 */

/** The left sidebar column, marked by the parts pass (engine/parts-table.ts). */
const LEFT_COLUMN_SELECTOR = '[data-dsh-claude-part~="sidebar-column"]'
/** Raised on the body by the plugin while a column is being dragged. */
const SIDEBAR_DRAGGING_ATTRIBUTE = 'data-dsh-sidebar-dragging'

export function install() {
  const writes = heldWrites()
  let panel: HTMLElement | null = null

  function place(element: HTMLElement, property: string, value: number) {
    const current = element.style.getPropertyValue(property).trim()
    writes.write(element, property, writes.hostValue(element, property, current), panelLength(value))
  }

  function fit() {
    if (panel === null || panel.getClientRects().length === 0) return
    // A dragged column rewrites its own layout every frame; the panel is left
    // where it stood until the drag settles, and the attribute's change brings
    // a scheduled pass with the new edges.
    if (document.body.hasAttribute(SIDEBAR_DRAGGING_ATTRIBUTE)) return
    const factor = pageZoomFactor()
    if (factor === 1) {
      writes.restore()
      return
    }
    const leftbar = leftColumn()
    const rightbar = rightColumn()
    const seat = composerSeat()
    if (leftbar === null || rightbar === null || seat === null) return
    const left = leftbar.getBoundingClientRect()
    const right = rightbar.getBoundingClientRect()
    const bottom = seat.getBoundingClientRect()
    place(panel, 'left', left.right / factor)
    place(panel, 'width', (right.left - left.right) / factor)
    place(panel, 'top', bottom.bottom / factor)
    place(panel, 'height', (window.innerHeight - bottom.bottom) / factor)
    // The plugin anchors the panel to its own bottom edge in its stylesheet; the
    // four lengths above state both edges already, so the anchor is written
    // beside them and put back with the rest when the page returns to scale 1.
    const anchor = panel.style.getPropertyValue('bottom').trim()
    writes.write(panel, 'bottom', writes.hostValue(panel, 'bottom', anchor), 'auto')
  }

  // The panel mounts inside the frame, where the body's own child list does not
  // reach; the bus's kept matches hear it arrive and leave.
  const leftColumn = cacheFirstMatch<HTMLElement>(LEFT_COLUMN_SELECTOR)
  const rightColumn = cacheFirstMatch<HTMLElement>(RIGHTBAR_COLUMN_SELECTOR)
  const composerSeat = cacheFirstMatch<HTMLElement>(COMPOSER_SELECTOR)
  // The factor rides an attribute on the body, so a change of zoom re-derives
  // every edge; the drag flag rides the body too, and its end re-derives them.
  const stopLayout = observeLayoutElements({
    selectors: [BOTTOM_PANEL_SELECTOR],
    bodyAttributes: [PAGE_ZOOM_ATTR, SIDEBAR_DRAGGING_ATTRIBUTE],
    sync([element]) { panel = element; fit() },
    release: element => writes.restore(element),
  })

  return () => {
    stopLayout()
    panel = null
    writes.restore()
  }
}
