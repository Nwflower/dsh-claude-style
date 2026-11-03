import { PAGE_ZOOM_ATTR, PAGE_ZOOM_MAX, PAGE_ZOOM_MIN, PAGE_ZOOM_VAR } from '../constants'

/**
 * The page's own scale (settings › General): the factor the stylesheet draws
 * the page at, 1 while the page follows the system.
 *
 * The stylesheet's `zoom` scales the space a `left`, a `top` or a length
 * written into the page is read in, while `getBoundingClientRect` keeps
 * answering in the viewport's own pixels. A feature that turns a measured box
 * into a position or a size therefore divides by this factor, and one that
 * hands the page a number to compare against the viewport converts the
 * window's size the other way. The factor is one mark on the body — this
 * attribute, which the scripts read — and the sheet's `zoom` reads it through
 * the custom property `projectPageZoomFactor` writes from it. A page handed to
 * another skin carries neither, so it reads 1 again.
 */
export function pageZoomFactor() {
  const stored = document.body.getAttribute(PAGE_ZOOM_ATTR)
  if (stored === null) return 1
  const factor = Number.parseFloat(stored)
  return Number.isFinite(factor) && factor > 0 ? factor : 1
}

/**
 * Project the attribute into the property the sheet's one `zoom` rule reads.
 *
 * The mirror calls this after writing the attribute (core/prefs.ts), and the
 * page's scale watcher calls it whenever the attribute moves (shared/page-scale.ts):
 * the mark is a page surface, and whatever sets it — a stylesheet, a script,
 * another session — must draw at the factor it names.
 */
export function projectPageZoomFactor() {
  const factor = pageZoomFactor()
  if (factor === 1) document.body.style.removeProperty(PAGE_ZOOM_VAR)
  else document.body.style.setProperty(PAGE_ZOOM_VAR, pageZoomText(factor))
}

/** A measured length or coordinate, in the pixels the page's own styles read. */
export function inPagePixels(value: number) {
  return value / pageZoomFactor()
}

/**
 * A measured box, in the pixels the page's own styles read. A fresh box, so a
 * caller may keep the measured one for a later comparison.
 */
export function inPageBox(rect: DOMRect) {
  const factor = pageZoomFactor()
  if (factor === 1) return rect
  return new DOMRect(rect.left / factor, rect.top / factor, rect.width / factor, rect.height / factor)
}

/** The window's size, in the pixels the page's own styles read. */
export function pageViewport() {
  const factor = pageZoomFactor()
  return { width: window.innerWidth / factor, height: window.innerHeight / factor }
}

/**
 * The factor a stored percentage draws the page at. A stored value outside the
 * row's range reads as the nearer end, so a hand-edited settings file lands on
 * the size the row can show and change again; anything unreadable is 1.
 */
export function pageZoomOf(stored: string) {
  const percent = Math.round(Number.parseFloat(stored))
  if (!Number.isFinite(percent)) return 1
  return Math.min(PAGE_ZOOM_MAX, Math.max(PAGE_ZOOM_MIN, percent)) / 100
}

/** The factor as the mirror writes it, two decimals at most: 1.1 does not land as 1.1000000000000001. */
export function pageZoomText(factor: number) {
  return String(Math.round(factor * 100) / 100)
}

/** The stored percentage as the row's box shows it: a whole number inside the row's range. */
export function pageZoomPercent(stored: string) {
  return Math.round(pageZoomOf(stored) * 100)
}
