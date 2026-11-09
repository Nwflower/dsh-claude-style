import { COMPOSER_COMPOSING_ATTRIBUTE, COMPOSER_INPUT_SELECTOR } from '@dsh-claude-style/contracts/dom'

/** Bare `focus()` moves a contenteditable caret to the draft start; skin-driven focus moves must restore its range. */

/**
 * The composer's live caret or selection.
 * @param doc - the document to read; the page's own by default.
 * @returns a copy of the range while a composer input holds it, else null.
 */
export function captureComposerCaret(doc: Document = document): Range | null {
  const selection = doc.getSelection()
  if (selection === null || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  const start = range.startContainer
  const composer = start instanceof Element
    ? start.closest(COMPOSER_INPUT_SELECTOR)
    : start.parentElement?.closest(COMPOSER_INPUT_SELECTOR) ?? null
  if (composer === null) return null
  return range.cloneRange()
}

/** Focus or selection changes during the host-marked composition would discard uncommitted input. */
export function composerComposing(doc: Document = document): boolean {
  const input = doc.activeElement?.closest(COMPOSER_INPUT_SELECTOR)
  return input?.hasAttribute(COMPOSER_COMPOSING_ATTRIBUTE) ?? false
}

/** Restore only a range still inside the focused editor; stale or external ranges stay untouched. */
export function focusKeepingComposerCaret(el: HTMLElement, caret: Range | null): void {
  el.focus({ preventScroll: true })
  if (caret === null || !el.contains(caret.startContainer)) return
  const selection = el.ownerDocument.getSelection()
  if (selection === null) return
  selection.removeAllRanges()
  selection.addRange(caret)
}
