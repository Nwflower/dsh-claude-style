/**
 * Whether a font family really resolves on this page (D75): the browser offers
 * no truthful "is it installed" answer — `document.fonts.check` reports true for
 * a family nothing declares — so the page measures instead. The same string is
 * drawn in the stack under test twice, once over a monospace fallback and once
 * over a serif one: a family that resolves draws both alike, because the fallback
 * is never reached, while a family that does not resolve leaves the two fallbacks
 * to draw it and their advances differ.
 */

/** What is drawn: every Latin letter and digit, where the faces' advances differ most. */
const PROBE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/** The probe's size in pixels: large enough that sub-pixel rounding cannot hide a difference. */
const PROBE_SIZE = 48

/** The two fallbacks differ from each other and from every face the stacks name. */
const FALLBACKS = ['monospace', 'serif'] as const

/** A measuring canvas, kept for the page's life; a canvas lays nothing out. */
let context: CanvasRenderingContext2D | null = null

/** The advance of the probe in one stack, in the canvas's own units. */
function advance(names: readonly string[], fallback: string) {
  if (context === null) {
    const canvas = document.createElement('canvas')
    const drawn = canvas.getContext('2d')
    if (drawn === null) throw new Error('font presence: the page offers no 2d canvas to measure with')
    context = drawn
  }
  // A family name with a space is quoted, as CSS needs; a single word is left as
  // it is, so a generic family ('serif') still names the generic it is.
  const list = names.map((name) => name.includes(' ') ? `"${name}"` : name).join(', ')
  context.font = `${PROBE_SIZE}px ${list}, ${fallback}`
  return context.measureText(PROBE).width
}

/**
 * Whether any of `names` draws: the two fallbacks agree on the probe, so one of
 * the names was used. A name nothing provides leaves the fallbacks to draw it,
 * and their two advances differ.
 */
export function familyResolves(names: readonly string[]): boolean {
  return advance(names, FALLBACKS[0]) === advance(names, FALLBACKS[1])
}
