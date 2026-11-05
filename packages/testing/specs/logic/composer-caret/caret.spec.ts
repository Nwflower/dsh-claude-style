/**
 * The composer's selection survives the focus moves the skin makes itself:
 * pressing the inline card to get into the draft, and the focus coming back
 * after a process group folds itself. A bare focus re-homes the selection to
 * the start of the draft, so the range is captured before the move and put
 * back with the focus.
 *
 * @capability composer-caret
 * @features composer, chat-fold
 * @risk Pressing the input card or a process group's header sends the caret back to the start of the draft, and the next words the reader types land in the wrong place.
 */
import { afterEach, expect, test } from 'vitest'
import { captureComposerCaret, composerComposing, focusKeepingComposerCaret } from '@dsh-claude-style/client/pure'
import { COMPOSER_COMPOSING_ATTRIBUTE, COMPOSER_INPUT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { hostElement } from '../../fixtures/host-markup'

/** Everything this spec put on the page, taken away after each test. */
const mounted: HTMLElement[] = []

afterEach(() => {
  const selection = document.getSelection()
  if (selection !== null) selection.removeAllRanges()
  for (const element of mounted.splice(0)) element.remove()
})

/** A composer input carrying `text`, in the page. */
function composer(text = 'hello world') {
  const input = hostElement<HTMLElement>(COMPOSER_INPUT_SELECTOR)
  // The host's editor is a contenteditable, which is what makes a bare
  // focus() re-home the selection; a plain div would not take the focus at all.
  input.contentEditable = 'true'
  input.append(document.createTextNode(text))
  document.body.append(input)
  mounted.push(input)
  return input
}

/** The document's selection, refusing a document that has none. */
function selectionOf(doc: Document) {
  const selection = doc.getSelection()
  if (selection === null) throw new Error('the document has no selection')
  return selection
}

/** Select `node` from `start` to `end`, the way a reader leaves a caret in the draft. */
function select(node: Node, start: number, end: number) {
  const range = document.createRange()
  range.setStart(node, start)
  range.setEnd(node, end)
  const selection = selectionOf(node.ownerDocument ?? document)
  selection.removeAllRanges()
  selection.addRange(range)
}

/** A button elsewhere in the page, for the focus to move to. */
function button() {
  const element = document.createElement('button')
  element.textContent = 'elsewhere'
  document.body.append(element)
  mounted.push(element)
  return element
}

/** A composer with a caret at 6–11, and the focus moved to a button elsewhere. */
function draftWithFocusAway() {
  const input = composer()
  const text = input.firstChild
  if (text === null) throw new Error('the composer has no text')
  select(text, 6, 11)
  const caret = captureComposerCaret(document)
  const elsewhere = button()
  elsewhere.focus()
  return { input, caret, elsewhere }
}

test('a caret standing inside a composer is captured where it stands', () => {
  const input = composer()
  const text = input.firstChild
  if (text === null) throw new Error('the composer has no text')
  select(text, 6, 11)
  const caret = captureComposerCaret(document)
  if (caret === null) throw new Error('the caret was not captured')
  expect([caret.startOffset, caret.endOffset]).toEqual([6, 11])
})

test('a selection outside every composer is not captured', () => {
  const paragraph = document.createElement('p')
  paragraph.textContent = 'a sentence outside the draft'
  document.body.append(paragraph)
  mounted.push(paragraph)
  const text = paragraph.firstChild
  if (text === null) throw new Error('the paragraph has no text')
  select(text, 0, 9)
  expect(captureComposerCaret(document)).toBeNull()
})

test('focusing the composer through the helper puts the selection back where it was', () => {
  const { input, caret, elsewhere } = draftWithFocusAway()
  expect(document.activeElement).toBe(elsewhere)

  focusKeepingComposerCaret(input, caret)

  expect(document.activeElement).toBe(input)
  const range = selectionOf(document).getRangeAt(0)
  expect([range.startOffset, range.endOffset]).toEqual([6, 11])
})

test('a caret the editor has replaced is dropped, and the focus still lands', () => {
  const { input, caret } = draftWithFocusAway()
  // The editor rewrites its content while the focus is away: the captured
  // range's own text node is no longer in the draft.
  input.textContent = 'rewritten'

  focusKeepingComposerCaret(input, caret)

  expect(document.activeElement).toBe(input)
})

test('the active draft reads its composition flag without querying the document', () => {
  const editor = composer()
  editor.focus()
  const query = Document.prototype.querySelector
  let reads = 0
  // cost: D40 — an input event must not walk the page to read the active editor's own state.
  Document.prototype.querySelector = function patched(selector: string) {
    reads += 1
    return query.call(this, selector)
  }
  try {
    expect(composerComposing(document)).toBe(false)

    // The host's keymap sets it on the editor for the span of a composition.
    editor.setAttribute(COMPOSER_COMPOSING_ATTRIBUTE, '')
    expect(composerComposing(document)).toBe(true)

    editor.removeAttribute(COMPOSER_COMPOSING_ATTRIBUTE)
    expect(composerComposing(document)).toBe(false)
    expect(reads).toBe(0)
  } finally {
    // cost: D40 — the browser's own method back once the count is read.
    Document.prototype.querySelector = query
  }
})
