/**
 * Measure the caret for rich contenteditable input (collapsed Range) and plain
 * textareas (hidden mirror). Measure a line break's own rect when Chromium
 * returns 0x0; keep the mirror's trailing text so soft wraps match. Probes never
 * touch host-owned containers (D9).
 */

/** A caret's viewport box: its left edge, its top and its height. */
export interface CaretBox {
  left: number
  top: number
  height: number
}

/** A caret box plus the input box used for clipping and repeated reads. */
export interface CaretReading {
  box: CaretBox
  field: DOMRect | null
}

/** Styles that determine the empty line's text box and height. */
const CARET_PROBE_PROPERTIES = ['padding', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height']

/** Every style that affects glyph width or wrap position; omitting one misplaces the caret. */
export const CARET_MIRRORED_PROPERTIES = [
  'direction', 'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style',
  'font-variant', 'font-weight', 'font-feature-settings', 'font-variation-settings', 'font-kerning',
  'letter-spacing', 'word-spacing', 'line-height', 'text-align', 'text-indent', 'text-transform',
  'tab-size', 'white-space', 'word-break', 'overflow-wrap', 'hyphens',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
]

export function caretChildIndex(parent: Node, child: Node) {
  let index = 0
  for (let node = parent.firstChild; node !== null; node = node.nextSibling) {
    if (node === child) return index
    index += 1
  }
  return -1
}

/**
 * Find the line break beside the caret; a break's rect is one line tall, while a
 * paragraph's is not. None means hand back the native caret.
 */
export function caretNearestBreak(range: Range) {
  const container = range.startContainer
  const offset = range.startOffset
  if (container instanceof HTMLBRElement) return { lineBreak: container, before: offset === 0 }
  if (container instanceof Text) {
    const parent = container.parentNode
    if (parent === null) return null
    const index = caretChildIndex(parent, container)
    if (index < 0) return null
    if (offset === container.data.length) {
      const next = parent.childNodes[index + 1]
      if (next instanceof HTMLBRElement) return { lineBreak: next, before: true }
    }
    if (offset === 0) {
      const previous = parent.childNodes[index - 1]
      if (previous instanceof HTMLBRElement) return { lineBreak: previous, before: false }
    }
    return null
  }
  const next = container.childNodes[offset]
  if (next instanceof HTMLBRElement) return { lineBreak: next, before: true }
  const previous = container.childNodes[offset - 1]
  if (previous instanceof HTMLBRElement) return { lineBreak: previous, before: false }
  return null
}

/**
 * Where a probe's own measurement put the caret, relative to the input's box:
 * how far the text box sits from the input's padding-box start, and how tall
 * the line is. Both are decided by the words and the styles the probe copies,
 * never by where the input stands on the page, so they survive a re-measure
 * (D9).
 */
interface CaretSpot {
  dx: number
  dy: number
  height: number
}

/** The surfaces measured through a hidden mirror: a seat textarea, or a field of the skin's own. */
type PlainSurface = HTMLTextAreaElement | HTMLInputElement

/** The key a remembered spot was taken under, and the spot itself. */
interface RememberedSpot {
  key: string
  spot: CaretSpot | null
}

/** What each surface's probe last said, dropped when its key changes. */
const emptyLineSpots = new WeakMap<Element, RememberedSpot>()
const plainSpots = new WeakMap<PlainSurface, RememberedSpot>()

/**
 * How many times the loaded faces have changed. A face arriving re-wraps text
 * without touching any style or word, so the count is part of a probe's key.
 */
let faceGeneration = 0

/** A face finished loading: every remembered probe reading is taken again. */
export function noteFacesLoaded() {
  faceGeneration += 1
}

/**
 * Measure an empty input's first line through a hidden break probe, kept outside
 * host containers and cached by copied styles and font generation.
 */
export function caretEmptyLineBox(input: Element, probeHome: Element | null): CaretBox | null {
  if (probeHome === null) return null
  const style = getComputedStyle(input)
  const copied = CARET_PROBE_PROPERTIES.map(name => style.getPropertyValue(name))
  const key = `${faceGeneration}\u0000${copied.join('\u0000')}`
  const remembered = emptyLineSpots.get(input)
  let spot = remembered !== undefined && remembered.key === key ? remembered.spot : null
  if (remembered === undefined || remembered.key !== key) {
    spot = takeEmptyLineSpot(copied, probeHome)
    emptyLineSpots.set(input, { key, spot })
  }
  if (spot === null) return null
  const inputRect = input.getBoundingClientRect()
  return { left: inputRect.left + spot.dx, top: inputRect.top + spot.dy, height: spot.height }
}

/** Build, read and remove the empty-line probe. */
function takeEmptyLineSpot(copied: readonly string[], probeHome: Element): CaretSpot | null {
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none'
  for (let i = 0; i < CARET_PROBE_PROPERTIES.length; i += 1) probe.style.setProperty(CARET_PROBE_PROPERTIES[i], copied[i])
  probe.style.whiteSpace = 'pre-wrap'
  probe.appendChild(document.createElement('br'))
  probeHome.appendChild(probe)
  const probeRect = probe.getBoundingClientRect()
  const breakElement = probe.firstElementChild
  const breakRect = breakElement === null ? null : breakElement.getBoundingClientRect()
  probe.remove()
  if (breakRect === null) return null
  // The probe carries the input's padding, so these two differences are the
  // distance from the content box's start to the text box's start.
  return { dx: breakRect.left - probeRect.left, dy: breakRect.top - probeRect.top, height: breakRect.height }
}

/** Measure the rich surface's collapsed selection, or return null for the native caret. */
export function caretMeasureRich(input: Element, range: Range, probeHome: Element | null): CaretReading | null {
  const rect = range.getBoundingClientRect()
  if (rect.height > 0) return { box: { left: rect.left, top: rect.top, height: rect.height }, field: null }
  const anchor = caretNearestBreak(range)
  if (anchor === null) {
    // No break anywhere in the input: there is nothing to measure, but the
    // caret sits at the start of the content box's first line. Anything else
    // in there is a shape this does not guess at.
    if (input.firstChild !== null) return null
    const box = caretEmptyLineBox(input, probeHome)
    return box === null ? null : { box, field: null }
  }
  const breakRect = anchor.lineBreak.getBoundingClientRect()
  if (anchor.before) return { box: { left: breakRect.left, top: breakRect.top, height: breakRect.height }, field: null }
  // After a break comes the next line's start: back to the block's content
  // left edge, one line down.
  const block = anchor.lineBreak.parentElement
  if (block === null) return null
  const lineHeight = Number.parseFloat(getComputedStyle(block).lineHeight)
  return {
    box: {
      left: block.getBoundingClientRect().left,
      top: breakRect.top + (Number.isFinite(lineHeight) ? lineHeight : breakRect.height),
      height: breakRect.height,
    },
    field: null,
  }
}

/**
 * Measure a plain surface through a hidden mirror, cache by words, offset, End
 * key, styles and width (D9). End measures the previous character so a soft
 * wrap lands on the line the native caret draws after.
 */
export function caretMeasurePlain(input: PlainSurface, endKeyed: boolean, probeHome: Element | null): CaretReading | null {
  if (probeHome === null) return null
  // Snapshot the field geometry for clipping and drawing in this frame.
  const field = DOMRect.fromRect(input.getBoundingClientRect())
  const style = getComputedStyle(input)
  const paddingX = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight)
  const width = Math.max(0, input.clientWidth - (Number.isFinite(paddingX) ? paddingX : 0))
  // The caller only comes here for a collapsed selection: start and end are one spot.
  const caretAt = input.selectionEnd
  // A field type the browser keeps no selection for has no caret to place.
  if (caretAt === null) return null
  const copied = CARET_MIRRORED_PROPERTIES.map(name => style.getPropertyValue(name))
  const key = `${faceGeneration}\u0000${endKeyed ? 'end' : 'plain'}\u0000${caretAt}\u0000${width}\u0000${input.value}\u0000${copied.join('\u0000')}`
  const remembered = plainSpots.get(input)
  let spot = remembered !== undefined && remembered.key === key ? remembered.spot : null
  if (remembered === undefined || remembered.key !== key) {
    spot = takePlainSpot(input, caretAt, endKeyed, width, copied, probeHome)
    plainSpots.set(input, { key, spot })
  }
  if (spot === null) return null
  // The spot is inside the padding box; subtract the surface's scroll.
  return {
    box: {
      left: field.left + input.clientLeft + spot.dx - input.scrollLeft,
      top: field.top + input.clientTop + spot.dy - input.scrollTop,
      height: spot.height,
    },
    field,
  }
}

/** Build, read and remove the mirror. */
function takePlainSpot(
  input: PlainSurface,
  caretAt: number,
  endKeyed: boolean,
  width: number,
  copied: readonly string[],
  probeHome: Element,
): CaretSpot | null {
  const mirror = document.createElement('div')
  mirror.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;'
    + 'margin:0;border:0;box-sizing:content-box;height:auto;overflow:hidden'
  for (let i = 0; i < CARET_MIRRORED_PROPERTIES.length; i += 1) mirror.style.setProperty(CARET_MIRRORED_PROPERTIES[i], copied[i])
  mirror.style.width = `${width}px`
  const marker = document.createElement('span')
  mirror.textContent = input.value.slice(0, caretAt)
  // An empty back half (the caret at the very end) needs a zero-width space
  // for the empty line after a trailing newline to have a line box at all.
  marker.textContent = input.value.slice(caretAt) || '\u200b'
  mirror.appendChild(marker)
  probeHome.appendChild(mirror)
  const mirrorRect = mirror.getBoundingClientRect()
  let spot = marker.getClientRects()[0]
  let edge = spot === undefined ? undefined : spot.left
  const before = mirror.firstChild
  if (endKeyed && spot !== undefined && before instanceof Text && caretAt > 0 && input.value[caretAt - 1] !== '\n') {
    const previous = document.createRange()
    previous.setStart(before, caretAt - 1)
    previous.setEnd(before, caretAt)
    const rects = previous.getClientRects()
    const last = rects[rects.length - 1]
    // Only a previous character on a higher line means a soft wrap.
    if (last !== undefined && last.top < spot.top - 1) {
      spot = last
      edge = last.right
    }
  }
  mirror.remove()
  if (spot === undefined || edge === undefined) return null
  // Centre a single-line input's line; textareas already lay out from the top.
  let dy = spot.top - mirrorRect.top
  if (input instanceof HTMLInputElement) {
    const contentHeight = input.clientHeight - (Number.parseFloat(getComputedStyle(input).paddingTop) || 0) - (Number.parseFloat(getComputedStyle(input).paddingBottom) || 0)
    dy += Math.max(0, (contentHeight - spot.height) / 2)
  }
  // A caret with no height is no caret at all: a mirror that collapsed to an
  // empty line would draw a hairline nothing can see, so the field's own line
  // height stands in for it.
  let height = spot.height
  if (!(height > 0)) {
    const style = getComputedStyle(input)
    const line = Number.parseFloat(style.lineHeight)
    height = Number.isFinite(line) ? line : Number.parseFloat(style.fontSize) * 1.4
  }
  return { dx: edge - mirrorRect.left, dy, height }
}

/** Clip the drawn caret to the textarea's visible box, matching native clipping. */
export function caretClipToField(input: Element, field: DOMRect, box: CaretBox): CaretBox | null {
  const clipTop = field.top + input.clientTop
  const clipBottom = clipTop + input.clientHeight
  const top = Math.max(box.top, clipTop)
  const bottom = Math.min(box.top + box.height, clipBottom)
  if (bottom - top < 1) return null
  return { left: box.left, top, height: bottom - top }
}
