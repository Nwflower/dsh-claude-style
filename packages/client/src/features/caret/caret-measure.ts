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
 * measured and removed within the call.
 */

/** A caret's viewport box: its left edge, its top and its height. */
export interface CaretBox {
  left: number
  top: number
  height: number
}

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

/** A node's index among its parent's children; -1 when it is not one of them. */
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
 * An empty input — a session just switched to leaves a shell with no
 * paragraph at all — is measured through a matching break parked off in a
 * corner of the page.
 *
 * The caret belongs at the start of the content box's first line, and how
 * tall that line is and where the text box sits in it has to be asked of
 * something. The probe is built and removed every frame, and never enters a
 * container the host owns: a node under the composer's own wrapper would
 * wake React.
 *
 * @returns the viewport left, top and height, or null when nothing measures.
 */
export function caretEmptyLineBox(input: Element, probeHome: Element | null): CaretBox | null {
  if (probeHome === null) return null
  const style = getComputedStyle(input)
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none'
  probe.style.padding = style.padding
  probe.style.whiteSpace = 'pre-wrap'
  probe.style.fontFamily = style.fontFamily
  probe.style.fontSize = style.fontSize
  probe.style.fontWeight = style.fontWeight
  probe.style.fontStyle = style.fontStyle
  probe.style.lineHeight = style.lineHeight
  probe.appendChild(document.createElement('br'))
  probeHome.appendChild(probe)
  const probeRect = probe.getBoundingClientRect()
  const breakElement = probe.firstElementChild
  const breakRect = breakElement === null ? null : breakElement.getBoundingClientRect()
  probe.remove()
  if (breakRect === null) return null
  // The probe carries the input's padding, so these two differences are the
  // distance from the content box's start to the text box's start.
  const inputRect = input.getBoundingClientRect()
  return {
    left: inputRect.left + (breakRect.left - probeRect.left),
    top: inputRect.top + (breakRect.top - probeRect.top),
    height: breakRect.height,
  }
}

/**
 * The viewport box of this collapsed selection on the rich surface.
 * @returns null when it cannot be measured: the caller hands the native caret back.
 */
export function caretMeasureRich(input: Element, range: Range, probeHome: Element | null): CaretBox | null {
  const rect = range.getBoundingClientRect()
  if (rect.height > 0) return { left: rect.left, top: rect.top, height: rect.height }
  const anchor = caretNearestBreak(range)
  if (anchor === null) {
    // No break anywhere in the input: there is nothing to measure, but the
    // caret sits at the start of the content box's first line. Anything else
    // in there is a shape this does not guess at.
    if (input.firstChild !== null) return null
    return caretEmptyLineBox(input, probeHome)
  }
  const breakRect = anchor.lineBreak.getBoundingClientRect()
  if (anchor.before) return { left: breakRect.left, top: breakRect.top, height: breakRect.height }
  // After a break comes the next line's start: back to the block's content
  // left edge, one line down.
  const block = anchor.lineBreak.parentElement
  if (block === null) return null
  const lineHeight = Number.parseFloat(getComputedStyle(block).lineHeight)
  return {
    left: block.getBoundingClientRect().left,
    top: breakRect.top + (Number.isFinite(lineHeight) ? lineHeight : breakRect.height),
    height: breakRect.height,
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
 * @param input - the textarea holding the focus.
 * @param endKeyed - whether the last explicit move was the End key.
 * @param probeHome - the marked container the mirror is built in.
 * @returns null when it cannot be measured: the caller hands the native caret back.
 */
export function caretMeasurePlain(input: HTMLTextAreaElement, endKeyed: boolean, probeHome: Element | null): CaretBox | null {
  if (probeHome === null) return null
  const style = getComputedStyle(input)
  const mirror = document.createElement('div')
  mirror.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;'
    + 'margin:0;border:0;box-sizing:content-box;height:auto;overflow:hidden'
  for (const name of CARET_MIRRORED_PROPERTIES) mirror.style.setProperty(name, style.getPropertyValue(name))
  const paddingX = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight)
  mirror.style.width = String(Math.max(0, input.clientWidth - (Number.isFinite(paddingX) ? paddingX : 0))) + 'px'
  // The caller only comes here for a collapsed selection: start and end are one spot.
  const caretAt = input.selectionEnd
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
  // The mirror has no border and the textarea's padding, so these differences
  // are the caret's place inside the textarea's padding box; the textarea's
  // own scroll is subtracted.
  const inputRect = input.getBoundingClientRect()
  return {
    left: inputRect.left + input.clientLeft + (edge - mirrorRect.left) - input.scrollLeft,
    top: inputRect.top + input.clientTop + (spot.top - mirrorRect.top) - input.scrollTop,
    height: spot.height,
  }
}

/**
 * Clip a viewport box to the part of the textarea that shows.
 *
 * The drawn caret does not live inside the textarea, so the textarea's own
 * clipping does not reach it: when the caret scrolls out of view the native
 * one disappears and this one has to disappear as well.
 *
 * @returns the clipped box, or null when nothing of it is left.
 */
export function caretClipToField(input: Element, box: CaretBox): CaretBox | null {
  const inputRect = input.getBoundingClientRect()
  const clipTop = inputRect.top + input.clientTop
  const clipBottom = clipTop + input.clientHeight
  const top = Math.max(box.top, clipTop)
  const bottom = Math.min(box.top + box.height, clipBottom)
  if (bottom - top < 1) return null
  return { left: box.left, top, height: bottom - top }
}
