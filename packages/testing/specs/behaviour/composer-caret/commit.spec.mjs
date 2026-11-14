/**
 * The composer's drawn caret around an input-method composition: it keeps the
 * ordinary two-pixel width while the IME paints its candidate and underline,
 * and it follows the committed selection once the composition lands.
 *
 * @capability composer-caret
 * @features caret
 * @risk A reader typing through a Chinese input method sees the caret collapse to the native one-pixel line, or the drawn caret misses the committed selection.
 */
import { spec, host, surface } from '../../fixtures/behaviour.mjs'

const FIELD = host('composer.input')
const COMPOSING = host('composer.composing')
const CARET_MARK = surface.attribute('caret.mark')
const LAYER = surface('caret.layer')

/** Wait a fixed number of animation frames the skin's own pass runs on. */
function frames(t, count) {
  return t.page.evaluate((total) => new Promise((resolve) => {
    let left = total
    const step = () => {
      left -= 1
      if (left <= 0) resolve()
      else requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }), count)
}

/** Give the editor the words a composition is committing, with the caret at `offset`. */
function editDraft(t, offset) {
  return t.page.evaluate(([field, at]) => {
    const input = document.querySelector(field)
    input.focus()
    input.textContent = 'hou m'
    const text = input.firstChild
    const range = document.createRange()
    range.setStart(text, at)
    range.collapse(true)
    const selection = document.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)
  }, [FIELD, offset])
}

/** Raise or drop the host's composition flag, with the composition event its keymap sees. */
function compose(t, active) {
  return t.page.evaluate(([field, composing, on]) => {
    const input = document.querySelector(field)
    if (on) {
      input.setAttribute(composing, '')
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    } else {
      input.removeAttribute(composing)
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'hou m' }))
    }
  }, [FIELD, COMPOSING, active])
}

/** What the reader sees of the caret: the field's mark, the layer, and the selection's own box. */
function readCaret(t) {
  return t.page.evaluate(([field, mark, layer]) => {
    const input = document.querySelector(field)
    const drawn = document.querySelector(layer)
    const range = document.getSelection().getRangeAt(0).getBoundingClientRect()
    return {
      mark: input.hasAttribute(mark),
      layer: drawn === null ? null : {
        visible: drawn.checkVisibility({ visibilityProperty: true, opacityProperty: true }),
        left: drawn.getBoundingClientRect().left,
        width: getComputedStyle(drawn).width,
      },
      nativeColour: getComputedStyle(input).caretColor,
      range: { left: range.left, offset: document.getSelection().getRangeAt(0).startOffset },
    }
  }, [FIELD, CARET_MARK, LAYER])
}

export default spec({ page: 'composer' }, ({ test }) => {
  test('a composition keeps the drawn caret at its ordinary width', async (t) => {
    await editDraft(t, 3)
    await compose(t, true)
    await frames(t, 3)
    const caret = await readCaret(t)
    t.expectThat.equal(caret.mark, true, 'the native caret stays pressed down while the IME composes')
    t.expectThat.equal(caret.layer?.visible ?? false, true, 'the drawn caret remains visible during the composition')
    t.expectThat.equal(caret.layer?.width, '2px', 'the composition caret keeps the ordinary two-pixel width')
    t.expectThat.equal(caret.nativeColour, 'rgba(0, 0, 0, 0)', 'no thinner native caret is painted beside it')
    t.expectThat.equal(Math.abs((caret.layer?.left ?? -Infinity) - caret.range.left) <= 1, true, 'the drawn caret follows the composition selection')
  })

  test('the skin\'s caret returns at the committed selection', async (t) => {
    await editDraft(t, 3)
    await compose(t, true)
    await frames(t, 2)
    // The browser moves the selection to the end while the composition is
    // still up; the next selectionchange is processed inside the composition.
    await editDraft(t, 5)
    await frames(t, 2)
    // The commit drops the flag and sends compositionend; no later
    // selectionchange is promised, so the settle after the event is what
    // measures the committed selection.
    await compose(t, false)
    await t.page.waitForFunction(([field, layer]) => {
      const drawn = document.querySelector(layer)
      if (drawn === null) return false
      const range = document.getSelection().getRangeAt(0).getBoundingClientRect()
      return Math.abs(drawn.getBoundingClientRect().left - range.left) <= 1
    }, [FIELD, LAYER], { timeout: 2000 })
    const caret = await readCaret(t)
    t.expectThat.equal(caret.mark, true, 'the field\'s native caret pressed down again')
    t.expectThat.equal(caret.layer?.visible ?? false, true, 'the skin\'s caret drawn after the composition')
    t.expectThat.equal(Math.abs((caret.layer?.left ?? -Infinity) - caret.range.left) <= 1, true, `the drawn caret at the committed selection: ${JSON.stringify(caret)}`)
  })
})
