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

/** The colours already painted, by the computed value read: a stylesheet hands the same few values back for as long as its tokens stand, while a theme switch moves the value itself. */
const painted = new Map<string, PaintedColour | null>()
/** How many painted values are kept: a palette is a handful, and a page naming new values must not grow the table. */
const PAINT_LIMIT = 64

function scratchContext() {
  scratch ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (scratch === null) throw new Error('colour: the scratch canvas has no 2d context')
  return scratch
}

/** Paint one pixel with the value and read it back; a synchronous pixel read, so cached above. */
function paint(value: string, context: CanvasRenderingContext2D) {
  context.fillStyle = 'rgba(0, 0, 0, 0)'
  context.fillStyle = value
  context.clearRect(0, 0, 1, 1)
  context.fillRect(0, 0, 1, 1)
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data
  return alpha === 0 ? null : { red, green, blue, alpha: alpha / 255 }
}

/** Clear to transparent first: invalid values leave `fillStyle` unchanged and must return null, not stale colour. */
export function resolveColour(value: string, context?: CanvasRenderingContext2D): PaintedColour | null {
  if (context !== undefined) return paint(value, context)
  const known = painted.get(value)
  if (known !== undefined) return known
  const result = paint(value, scratchContext())
  if (painted.size >= PAINT_LIMIT) painted.clear()
  painted.set(value, result)
  return result
}
