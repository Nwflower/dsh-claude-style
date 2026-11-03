import { BACKGROUND_OPACITY_ATTR, BACKGROUND_OPACITY_MAX, BACKGROUND_OPACITY_MIN, BACKGROUND_OPACITY_VAR } from '../constants'

/**
 * The background fill's opacity (settings › Appearance): the share of the
 * canvas colours the Claude palette paints with, 1 while the page keeps its
 * opaque canvas.
 *
 * The stylesheet's canvas fills answer it through one custom property, which
 * `projectBackgroundOpacity` writes from the mirror's attribute the way
 * `projectPageZoomFactor` serves the page's own scale (shared/page-zoom.ts):
 * the mark is the surface, the property is what the rules read, and at the
 * default 100 both are absent, so every fill is the pixel it has always been.
 */
export function backgroundOpacityOf(stored: string) {
  const percent = Math.round(Number.parseFloat(stored))
  if (!Number.isFinite(percent)) return 1
  return Math.min(BACKGROUND_OPACITY_MAX, Math.max(BACKGROUND_OPACITY_MIN, percent)) / 100
}

/** The stored percentage as the row's box shows it: a whole number inside the row's range. */
export function backgroundOpacityPercent(stored: string) {
  return Math.round(backgroundOpacityOf(stored) * 100)
}

/**
 * Project the attribute into the property the canvas fills read. The mirror
 * calls this after writing the attribute (core/prefs.ts); a factor of one
 * takes the property off, so the default page answers the fallback the rules
 * carry and nothing downstream sees a difference.
 */
export function projectBackgroundOpacity() {
  const stored = document.body.getAttribute(BACKGROUND_OPACITY_ATTR)
  const factor = stored === null ? 1 : backgroundOpacityOf(stored)
  if (factor === 1) document.body.style.removeProperty(BACKGROUND_OPACITY_VAR)
  else document.body.style.setProperty(BACKGROUND_OPACITY_VAR, String(factor))
}
