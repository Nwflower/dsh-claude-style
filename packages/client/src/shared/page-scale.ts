import { installScaledLayer } from '@dsh-claude-style/engine/scaled-layer'
import { installFrameColumns } from './page-scale-columns'
import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { PAGE_UNDER_1000_ATTR, PAGE_UNDER_480_ATTR, PAGE_UNDER_600_ATTR, PAGE_UNDER_768_ATTR, PAGE_ZOOM_ATTR } from '../constants'
import { subscribePrefs } from '../core/prefs'
import { pageViewport, pageZoomFactor, projectPageZoomFactor } from './page-zoom'

/** Skin-positioned host nodes carry our attributes too and must stay out of the host floating-layer conversion. */
function isSkinNode(node: Element) {
  if (/(^| )dsh-claude-/.test(typeof node.className === 'string' ? node.className : '')) return true
  return Array.from(node.attributes).some(attribute => attribute.name.startsWith('data-dsh-claude-'))
}

/** Viewport units are scaled again inside the page; these properties carry unscaled caps (D81). */
export const PAGE_HEIGHT = '--dsh-claude-page-height'
export const PAGE_WIDTH = '--dsh-claude-page-width'

/** Attribute breakpoints replace media queries, which cannot see scaled page width. */
const WIDTH_MARKS = [
  { attr: PAGE_UNDER_1000_ATTR, width: 1000 },
  { attr: PAGE_UNDER_768_ATTR, width: 768 },
  { attr: PAGE_UNDER_600_ATTR, width: 600 },
  { attr: PAGE_UNDER_480_ATTR, width: 480 },
] as const

/**
 * Carry the host's floating layer in a page the skin draws at a scale, and put
 * the page's own size where a stylesheet can cap a card with it
 * (engine/src/scaled-layer.ts, D81).
 *
 * The skin's own cards are excluded from the carried layer: they are placed in
 * the page's own pixels at the write, so they carry no double scale. The
 * reader's choice of factor moves every card already carried, and the teardown
 * hands each one back.
 *
 * @returns the teardown.
 */
export function installPageScale() {
  const body = document.body
  /**
   * Write the page's width marks, and its own size, which is taken away while
   * the page is not scaled. The marks are written at every scale: they stand
   * in for the media queries the stylesheets no longer carry.
   */
  const measure = () => {
    // The attribute is a page surface: whatever sets it — the mirror, another
    // session — draws through the property the sheet reads, so it is projected
    // here before anything is measured against it.
    projectPageZoomFactor()
    const width = pageViewport().width
    for (const mark of WIDTH_MARKS) body.toggleAttribute(mark.attr, width <= mark.width)
    if (pageZoomFactor() === 1) {
      body.style.removeProperty(PAGE_HEIGHT)
      body.style.removeProperty(PAGE_WIDTH)
      return
    }
    const view = pageViewport()
    body.style.setProperty(PAGE_HEIGHT, `${Math.round(view.height)}px`)
    body.style.setProperty(PAGE_WIDTH, `${Math.round(view.width)}px`)
  }
  let layer: ReturnType<typeof installScaledLayer> | null = null
  let columns: ReturnType<typeof installFrameColumns> | null = null
  /** The page's readings, every carried card and the frame's columns, in one pass. */
  const settle = () => {
    measure()
    layer?.settle()
    columns?.settle()
  }
  // The teardown asks a re-run for the readings of the page it hands back: it has
  // taken its own properties off by then, and the body outlives this run. The
  // observer that hears a card appear leaves the body's children alone, so the
  // readings are written here rather than from inside the listener.
  layer = installScaledLayer({
    isOwn: isSkinNode,
    scale: () => pageZoomFactor(),
    onChange: measure,
    onRelease: () => settle(),
  })
  columns = installFrameColumns({ scale: () => pageZoomFactor() })
  const offPrefs = subscribePrefs(settle)
  // The scale itself is the reading that moves every one of these numbers, and
  // the mirror that writes it is not the only writer: it is an attribute on the
  // body, so a page that sets it from a stylesheet, a script or another session
  // must wake the rule the same way a preference change does — `measure` then
  // projects it into the property the sheet's `zoom` reads.
  const stopScaleWatch = subscribeMutations(body, { attributes: true, attributeFilter: [PAGE_ZOOM_ATTR] }, settle)
  // The window's own size moves the readings too. A resize is dispatched ahead
  // of the frame's style and layout, so the marks hold in the frame it lands in.
  window.addEventListener('resize', settle)
  settle()
  return () => {
    window.removeEventListener('resize', settle)
    stopScaleWatch()
    for (const mark of WIDTH_MARKS) body.removeAttribute(mark.attr)
    offPrefs()
    body.style.removeProperty(PAGE_HEIGHT)
    body.style.removeProperty(PAGE_WIDTH)
    if (columns !== null) columns.stop()
    layer.stop()
  }
}
