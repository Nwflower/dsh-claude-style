import { buildElement } from '@dsh-claude-style/engine/dom'

/** Opposing transforms keep tinted glyphs aligned under the moving mask (shared/motion.css).
 * The duplicate is decorative and must stay hidden and inert.
 */

/** The window: the band's mask, laid over its owner's box (shared/motion.css). */
export const SWEEP_BAND_CLASS = 'dsh-claude-sweep-band'
/** The tinted copy inside the window, crossing back. */
export const SWEEP_GLYPHS_CLASS = 'dsh-claude-sweep-glyphs'

/** Null lets the owner provide glyph markup; otherwise `data-text` generates it. */
export function buildSweepBand(text: string | null) {
  const band = buildElement('span', SWEEP_BAND_CLASS)
  band.setAttribute('aria-hidden', 'true')
  band.inert = true
  const glyphs = buildElement('span', SWEEP_GLYPHS_CLASS)
  if (text !== null) glyphs.setAttribute('data-text', text)
  band.appendChild(glyphs)
  return { band, glyphs }
}
