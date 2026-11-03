import { PAGE_ZOOM_ATTR } from '../constants'

/**
 * The page's own scale (settings › General): the factor the stylesheet draws
 * the page at, 1 while the page follows the system.
 *
 * The stylesheet's `zoom` scales the space a `left`, a `top` or a length
 * written into the page is read in, while `getBoundingClientRect` keeps
 * answering in the viewport's own pixels. A feature that turns a measured box
 * into a position or a size therefore divides by this factor, and one that
 * hands the page a number to compare against the viewport converts the
 * window's size the other way. The attribute is the one the preference mirror
 * writes (core/prefs.ts), so a page handed to another skin reads 1 again.
 */
export function pageZoomFactor() {
  const stored = document.body.getAttribute(PAGE_ZOOM_ATTR)
  if (stored === null) return 1
  const factor = Number.parseFloat(stored)
  return Number.isFinite(factor) && factor > 0 ? factor : 1
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

/** 设置里存的百分比 → 页面倍率；认不出来就 1（跟系统一样大）。 */
export function pageZoomOf(stored: string) {
  const percent = Number.parseFloat(stored)
  if (!Number.isFinite(percent) || percent <= 0) return 1
  const factor = Math.round(percent) / 100
  return factor >= 0.3 && factor <= 3 ? factor : 1
}

/** 倍率写成两处共用的字符串：1.1 这样，不留 0.30000000000000004 的尾巴。 */
export function pageZoomText(factor: number) {
  return String(Math.round(factor * 100) / 100)
}

/** 设置里存的百分比，落在滑条的范围内。 */
export function pageZoomPercent(stored: string) {
  const percent = Math.round(pageZoomOf(stored) * 100)
  return Math.min(200, Math.max(60, Number.isFinite(percent) ? percent : 100))
}
