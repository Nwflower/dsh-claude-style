import { RIGHTBAR_COLUMN_SELECTOR, RIGHTBAR_HANDLE_SELECTOR, RIGHTBAR_PANEL_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeLayoutElements } from '@dsh-claude-style/engine/layout-elements'
import { cacheFirstMatch } from '@dsh-claude-style/engine/host'
import { PAGE_ZOOM_ATTR } from '../../constants'
import { heldWrites } from '../../shared/held-writes'
import { pageZoomFactor } from '../../shared/page-zoom'
import { panelLength } from '../../shared/panel-length'

/**
 * The right column's own box, in the page's pixels.
 *
 * The host states the panel's width from the viewport's pixels and places the
 * drag handle from the same measurement, while the page's zoom scales both a
 * second time: the panel stands wider than the track the frame gives it and
 * covers the centre, and the handle leaves the edge it exists to drag. The
 * frame's own columns are carried by the page-scale module; these two
 * declarations are rewritten here, each on the write the host makes, and a page
 * at scale 1 keeps the host's numbers.
 */

export function install() {
  const writes = heldWrites()
  let panel: HTMLElement | null = null
  let handle: HTMLElement | null = null

  function fixPanel(factor: number) {
    if (panel === null) return
    const current = panel.style.getPropertyValue('width').trim()
    if (!current.endsWith('px')) return
    const raw = writes.hostValue(panel, 'width', current)
    const width = Number.parseFloat(raw)
    if (!Number.isFinite(width)) return
    // The column the grid gives this panel is its ceiling: a panel wider than
    // its own track stands over the centre, and a track narrowed to nothing
    // leaves the panel with no room to stand in at all. A column that has not
    // been given a width yet (the panel mounts before the grid expands) says
    // nothing, so the host's own value stands until the track is there.
    const track = column()
    const limit = track === null || track.clientWidth <= 0 ? Number.POSITIVE_INFINITY : track.clientWidth
    const page = panelLength(Math.min(width / factor, limit))
    writes.write(panel, 'width', raw, page)
    // The panel carries its width twice, and the second declaration states its
    // own number: it is read from itself rather than from the width.
    const sidebar = panel.style.getPropertyValue('--dsh-sidebar-width').trim()
    if (sidebar.endsWith('px')) {
      writes.write(panel, '--dsh-sidebar-width', writes.hostValue(panel, '--dsh-sidebar-width', sidebar), page)
    }
  }

  function fixHandle(factor: number) {
    if (handle === null || panel === null) return
    const current = handle.style.getPropertyValue('left').trim()
    if (!current.endsWith('px')) return
    const raw = writes.hostValue(handle, 'left', current)
    const left = Number.parseFloat(raw)
    if (!Number.isFinite(left)) return
    // The handle sits on the panel's visible left edge, which is the width the
    // panel actually took rather than the one the host wrote for it.
    const page = panelLength(document.documentElement.clientWidth / factor - panel.offsetWidth)
    writes.write(handle, 'left', raw, page)
  }

  function sync() {
    const factor = pageZoomFactor()
    if (factor === 1) {
      writes.restore()
      return
    }
    fixPanel(factor)
    fixHandle(factor)
  }

  // The panel and the handle mount inside the frame, where the body's own child
  // list does not reach; the bus's kept matches hear them arrive and leave.
  const column = cacheFirstMatch<HTMLElement>(RIGHTBAR_COLUMN_SELECTOR)
  // The factor rides an attribute on the body, so a change of zoom re-derives both.
  const stopLayout = observeLayoutElements({
    selectors: [RIGHTBAR_PANEL_SELECTOR, RIGHTBAR_HANDLE_SELECTOR],
    bodyAttributes: [PAGE_ZOOM_ATTR],
    sync([nextPanel, nextHandle]) { panel = nextPanel; handle = nextHandle; sync() },
    release: element => writes.restore(element),
  })

  return () => {
    stopLayout()
    panel = null
    handle = null
    writes.restore()
  }
}
