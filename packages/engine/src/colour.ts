/** Normalize literal, `rgb()` and relative CSS colours by painting one shared pixel (D30). */
export interface PaintedColour {
  readonly red: number
  readonly green: number
  readonly blue: number
  /** The fill's own alpha, 0–1. */
  readonly alpha: number
}

/** The canvas every read shares: the page's own are busy drawing, and one created per call would be thrown away. */
let scratch: CanvasRenderingContext2D | null = null

function scratchContext() {
  scratch ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (scratch === null) throw new Error('colour: the scratch canvas has no 2d context')
  return scratch
}

/** Clear to transparent first: invalid values leave `fillStyle` unchanged and must return null, not stale colour. */
export function resolveColour(value: string, context: CanvasRenderingContext2D = scratchContext()): PaintedColour | null {
  context.fillStyle = 'rgba(0, 0, 0, 0)'
  context.fillStyle = value
  context.clearRect(0, 0, 1, 1)
  context.fillRect(0, 0, 1, 1)
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data
  return alpha === 0 ? null : { red, green, blue, alpha: alpha / 255 }
}
