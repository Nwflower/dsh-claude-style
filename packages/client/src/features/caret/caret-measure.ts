/**
 * Measuring the caret's viewport box, ported from dsh-chat-ux's caret
 * motion: the rich surface (dsh's contenteditable composer input) is
 * measured through the collapsed Range the browser keeps, the plain one
 * (a textarea under the composer seat) through a hidden mirror.
 *
 * Facts that shape both, all of them measured in a real Chromium:
 *
 *   rich    a collapsed Range inside the text, beside a decorator or at a
 *           soft wrap gives an exact box. At a line break Chromium gives a
 *           0x0 rect, and empty paragraphs and soft wraps are exactly where
 *           that happens — so the break itself is measured there, whose own
 *           rect is always one line tall.
 *   plain   a textarea's selection is not in the DOM and a Range cannot
 *           reach it. The mirror copies the styles that decide glyph width
 *           and wrap position, is as wide as the textarea's content box,
 *           and breaks the text at the caret: the front half is bare text,
 *           the back half one span whose first line box is the caret. The
 *           whole back half has to be there — soft wrapping goes by whole
 *           words, so a front-half-only mirror puts the word being typed on
 *           the line above.
 *
 * Nothing here touches a container the host owns: both probes are built,
 * measured and removed within the call. What a probe yields is remembered per
 * surface, because it says where the caret sits inside the input's own box and
 * not where that box stands on the page: a repeat measurement of the same words
 * at the same width reads the input's box alone (D9).
 */

/** A caret's viewport box: its left edge, its top and its height. */
export interface CaretBox {
  left: number
  top: number
  height: number
}

/**
 * A measured caret: the box, and the input's own box for the surfaces that
 * clip against it. The plain surface's measurement reads that box anyway, and
 * clipping from the same reading keeps the pass from reading it twice.
 */
export interface CaretReading {
  box: CaretBox
  field: DOMRect | null
}

/**
 * The styles the empty-line probe copies from the input: the ones that decide
 * where the text box sits in its line and how tall the line is.
 */
const CARET_PROBE_PROPERTIES = ['padding', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height']

/**
 * The styles the mirror copies from the textarea: everything that decides
 * glyph width or wrap position. One missing entry and the mirror wraps
 * differently from the textarea, putting the caret on the wrong line.
 */
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
 * The line break the caret is sitting against, if any.
 *
 * The break itself is what gets measured, never the paragraph it sits in:
 * a paragraph can be many lines tall, while a break's own rect is always
 * one line and exactly the text height. A 0x0 rect only happens beside a
 * break, so finding none here means there is nothing to measure — the
 * caller hands the native caret back rather than painting a guessed spot.
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
 * An empty input — a session just switched to leaves a shell with no
 * paragraph at all — is measured through a matching break parked off in a
 * corner of the page.
 *
 * The caret belongs at the start of the content box's first line, and how
 * tall that line is and where the text box sits in it has to be asked of
 * something. The probe never enters a container the host owns: a node under
 * the composer's own wrapper would wake React. What it yields is remembered,
 * so the probe is built only when the styles or the faces it copies change.
 *
 * @returns the viewport left, top and height, or null when nothing measures.
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

/**
 * Build the probe, read it and take it away again.
 * @returns the caret's offset inside the input's box and the line's height.
 */
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

/**
 * The viewport box of this collapsed selection on the rich surface.
 * @returns null when it cannot be measured: the caller hands the native caret back.
 */
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
 * A caret's viewport box on the plain surface, measured through a hidden
 * mirror.
 *
 * The caret's offset at a soft wrap naturally lands at the next line's start
 * in the mirror; with `endKeyed` set (the last move was End) the character
 * before it is measured instead, which is the previous line's end — where
 * the native caret draws after End.
 *
 * The input's own box is read first and the mirror's width taken from it, so
 * the box the caret is placed from is read once per measurement. What the
 * mirror then says is remembered under the words, the offset, the leaning, the
 * copied styles and the width it was laid out at: a measurement that repeats
 * one of those pays for the mirror no more (D9).
 *
 * @param input - the textarea or field holding the focus.
 * @param endKeyed - whether the last explicit move was the End key.
 * @param probeHome - the marked container the mirror is built in.
 * @returns null when it cannot be measured: the caller hands the native caret back.
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
  // The mirror has no border and carries the surface's padding, so the spot is
  // the caret's place inside the padding box; the surface's own scroll is
  // subtracted.
  return {
    box: {
      left: field.left + input.clientLeft + spot.dx - input.scrollLeft,
      top: field.top + input.clientTop + spot.dy - input.scrollTop,
      height: spot.height,
    },
    field,
  }
}

/**
 * Build the mirror, read the caret out of it and take it away again.
 * @returns the caret's offset inside the input's padding box and its height.
 */
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
  // A single-line field centres its one line inside the content box, while the
  // mirror's line box starts at the padding top: without this the drawn caret
  // stands above the text it belongs beside. A textarea lays its lines out from
  // the top and needs no correction.
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

/**
 * Clip a viewport box to the part of the textarea that shows.
 *
 * The drawn caret does not live inside the textarea, so the textarea's own
 * clipping does not reach it: when the caret scrolls out of view the native
 * one disappears and this one has to disappear as well.
 *
 * @param field - the textarea's box, as the measurement read it.
 * @returns the clipped box, or null when nothing of it is left.
 */
export function caretClipToField(input: Element, field: DOMRect, box: CaretBox): CaretBox | null {
  const clipTop = field.top + input.clientTop
  const clipBottom = clipTop + input.clientHeight
  const top = Math.max(box.top, clipTop)
  const bottom = Math.min(box.top + box.height, clipBottom)
  if (bottom - top < 1) return null
  return { left: box.left, top, height: bottom - top }
}
