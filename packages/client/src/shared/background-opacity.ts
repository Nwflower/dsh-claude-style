import { BACKGROUND_OPACITY_ATTR, BACKGROUND_OPACITY_MAX, BACKGROUND_OPACITY_MIN, BACKGROUND_OPACITY_VAR } from '../constants'

/** The body attribute is projected into the canvas custom property; the opaque default writes neither. */
export function backgroundOpacityOf(stored: string) {
  const percent = Math.round(Number.parseFloat(stored))
  if (!Number.isFinite(percent)) return 1
  return Math.min(BACKGROUND_OPACITY_MAX, Math.max(BACKGROUND_OPACITY_MIN, percent)) / 100
}

/** The stored percentage as the row's box shows it: a whole number inside the row's range. */
export function backgroundOpacityPercent(stored: string) {
  return Math.round(backgroundOpacityOf(stored) * 100)
}

/** Call after the mirror writes the attribute; factor one restores stylesheet fallbacks. */
export function projectBackgroundOpacity() {
  const stored = document.body.getAttribute(BACKGROUND_OPACITY_ATTR)
  const factor = stored === null ? 1 : backgroundOpacityOf(stored)
  if (factor === 1) document.body.style.removeProperty(BACKGROUND_OPACITY_VAR)
  else document.body.style.setProperty(BACKGROUND_OPACITY_VAR, String(factor))
}
