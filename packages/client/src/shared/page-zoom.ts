import { PAGE_ZOOM_ATTR, PAGE_ZOOM_MAX, PAGE_ZOOM_MIN, PAGE_ZOOM_VAR } from '../constants'

/** CSS `zoom` scales written geometry while DOMRects remain in viewport pixels; conversions must use this factor.
 * The body attribute is the source and the custom property drives the stylesheet; an unowned page reads 1.
 */
export function pageZoomFactor() {
  const stored = document.body.getAttribute(PAGE_ZOOM_ATTR)
  if (stored === null) return 1
  const factor = Number.parseFloat(stored)
  return Number.isFinite(factor) && factor > 0 ? factor : 1
}

/** Call after every attribute write so the stylesheet cannot retain a stale factor. */
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
 * The factor a stored percentage draws the page at. A percentage the row offers
 * or one just past either end draws at the nearer end, so a hand-edited settings
 * file lands on the size the row can show and change again — the same number the
 * box reads back. A value that is no percentage at all, the empty one among
 * them, is 1.
 */
export function pageZoomOf(stored: string) {
  const percent = Math.round(Number.parseFloat(stored))
  if (!Number.isFinite(percent) || percent <= 0) return 1
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
