import { CHAT_FLOW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { SELECTION_PAINT_ATTR, WINDOW_BLUR_ATTR } from '../constants'

/**
 * The two marks the selection paints in theme/chrome.css key on.
 *
 * SELECTION_PAINT_ATTR goes on a transcript's root once a selection starts in
 * it. A `::selection` rule that matches an element makes Blink resolve that
 * element's selection style on every recalculation, selected or not, so a rule
 * over every element of an unmarked transcript would cost each mount and each
 * forced layout of a long conversation a second style per node. `selectstart`
 * fires before the selection is drawn, so the first frame of a drag already
 * carries the skin's paint; a selection that only reaches the transcript from
 * outside it (select-all, a drag that starts elsewhere) is heard by
 * `selectionchange`. The mark stays until the host replaces the root, which a
 * session switch does: taking it off sooner restyles the whole transcript once
 * more for nothing on screen.
 *
 * WINDOW_BLUR_ATTR stands while the browser window is unfocused and the
 * document holds a selected range. Chromium separates the focused and the
 * unfocused selection paints through internal colours a stylesheet cannot
 * address, so the focus state is mirrored onto the document; each flip
 * restyles every element the selection rules cover, and a window that loses
 * and regains focus with nothing selected would pay it twice for no change on
 * screen. `blur`/`focus` on the window are the events that move it, and
 * `document.hasFocus()` seeds it so a page loaded in a background tab starts
 * unfocused.
 */
export function installSelectionPaint() {
  const body = document.body

  /** The outermost transcript a node stands in: the root a session switch replaces. */
  function transcriptOf(node: Node | null) {
    let at = node instanceof Element ? node : node?.parentElement ?? null
    let root: Element | null = null
    while (at !== null) {
      const flow = at.closest(CHAT_FLOW_SELECTOR)
      if (flow === null) break
      root = flow
      at = flow.parentElement
    }
    return root
  }

  function paint(root: Element | null) {
    if (root !== null && !root.hasAttribute(SELECTION_PAINT_ATTR)) root.setAttribute(SELECTION_PAINT_ATTR, '')
  }

  /** The document's selected range, or null for a caret or no selection. */
  function selectedRange() {
    const selection = document.getSelection()
    if (selection === null || selection.rangeCount === 0 || selection.isCollapsed) return null
    return selection.getRangeAt(0)
  }

  function syncBlur(range: Range | null) {
    const blurred = range !== null && !document.hasFocus()
    if (body.hasAttribute(WINDOW_BLUR_ATTR) !== blurred) body.toggleAttribute(WINDOW_BLUR_ATTR, blurred)
  }

  const onSelectStart = (event: Event) => {
    paint(transcriptOf(event.target as Node))
  }

  const onSelectionChange = () => {
    const range = selectedRange()
    if (range !== null) {
      paint(transcriptOf(range.startContainer))
      paint(transcriptOf(range.endContainer))
      // A range around a transcript, select-all among them: the first flow in
      // document order is the outermost one.
      const common = range.commonAncestorContainer
      if (common instanceof Element && transcriptOf(common) === null) {
        const inner = common.querySelector(CHAT_FLOW_SELECTOR)
        if (inner !== null && range.intersectsNode(inner)) paint(inner)
      }
    }
    syncBlur(range)
  }

  const onFocusChange = () => {
    syncBlur(selectedRange())
  }

  // Capture phase: the events are dispatched at the window and the target, so
  // the marks record the transition before anything downstream can stop it.
  document.addEventListener('selectstart', onSelectStart, true)
  document.addEventListener('selectionchange', onSelectionChange)
  window.addEventListener('focus', onFocusChange, true)
  window.addEventListener('blur', onFocusChange, true)
  onSelectionChange()

  return () => {
    document.removeEventListener('selectstart', onSelectStart, true)
    document.removeEventListener('selectionchange', onSelectionChange)
    window.removeEventListener('focus', onFocusChange, true)
    window.removeEventListener('blur', onFocusChange, true)
    body.removeAttribute(WINDOW_BLUR_ATTR)
    for (const root of document.querySelectorAll(`[${SELECTION_PAINT_ATTR}]`)) root.removeAttribute(SELECTION_PAINT_ATTR)
  }
}
