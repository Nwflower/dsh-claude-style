/**
 * Selected text in the conversation paints in the one active colour against
 * every Markdown shape — a paragraph, a bold run, an inline code chip, a fenced
 * block and a syntax token — while the window has focus, and in the inactive
 * grey once another window takes it.
 *
 * @capability window-focus
 * @features composer
 * @risk With two windows side by side, the reader cannot tell which one their keystrokes go to: the selection in the background window still paints in the active blue.
 */
import { spec } from '../../fixtures/behaviour.mjs'

/** The Markdown shapes a selection crosses, under the name the page marks each with. */
const SHAPES = ['paragraph', 'bold', 'italic', 'inline code', 'fenced code', 'syntax token', 'heading', 'list item']

/**
 * The shapes, built in the conversation's own message column: the same text the
 * reader selects in an answer, in every nesting the Markdown renderer produces.
 */
async function addShapes(t) {
  await t.page.evaluate((flow) => {
    if (document.querySelector(`${flow} [data-test-selection-shapes]`) !== null) return
    const host = document.createElement('div')
    host.setAttribute('data-test-selection-shapes', '')
    host.innerHTML = '<p><span data-test-shape="paragraph">A sentence the reader selected.</span> ' +
      '<strong data-test-shape="bold">A bold run</strong> <em data-test-shape="italic">an italic run</em> ' +
      '<code data-test-shape="inline code">inline-code</code></p>' +
      '<pre><code><span data-test-shape="syntax token">a token</span> <span data-test-shape="fenced code">a fenced line</span></code></pre>' +
      '<h2 data-test-shape="heading">A heading</h2>' +
      '<ul><li data-test-shape="list item">A list item</li></ul>'
    document.querySelector(flow).append(host)
  }, t.host('chat.flow'))
  await t.settle()
}

/** Every shape's selection paint, as text colour on background colour. */
async function shapeColours(t) {
  return t.page.evaluate(() => {
    const out = {}
    for (const element of document.querySelectorAll('[data-test-shape]')) {
      const style = getComputedStyle(element, '::selection')
      out[element.getAttribute('data-test-shape')] = { colour: style.color, background: style.backgroundColor }
    }
    return out
  })
}

/**
 * The operating system moves the focus: a headless browser has no other window
 * to raise, so the page's own focus answer and the event the system sends with
 * it stand in for that move, at the browser's boundary.
 */
async function moveFocus(t, focused) {
  await t.page.evaluate((now) => {
    Object.defineProperty(document, 'hasFocus', { value: () => now, configurable: true })
    window.dispatchEvent(new Event(now ? 'focus' : 'blur'))
  }, focused)
  await t.settle()
}

/** One colour channel triple from a computed colour, or a refusal. */
function channels(colour) {
  const parts = /rgba?\((\d+), (\d+), (\d+)/.exec(colour ?? '')
  if (parts === null) throw new Error(`the selection paint is not a plain colour: ${colour}`)
  return parts.slice(1).map(Number)
}

/** How much colour a paint carries: the widest gap between its channels. */
function chroma(colour) {
  const [r, g, b] = channels(colour)
  return Math.max(r, g, b) - Math.min(r, g, b)
}

/** Whether two paints are the same wash, to a channel's step of rounding. */
function sameWash(a, b, slack = 0) {
  return channels(a).every((value, at) => Math.abs(value - channels(b)[at]) <= slack)
}

export default spec({ page: 'chat-fold' }, ({ test }) => {
  test('a selection paints in the inactive colour while another window has focus, and in the active one again once it comes back', async (t) => {
    await addShapes(t)
    await moveFocus(t, true)
    const focused = (await shapeColours(t)).paragraph.background
    await moveFocus(t, false)
    const blurred = (await shapeColours(t)).paragraph.background
    t.expectThat.equal(blurred !== focused, true, 'the selection colour changes when the window loses focus')
    // Which paint is which is what the reader sees: the active selection is the
    // blue wash and the inactive one the grey, so a swap of the two rules fails
    // here rather than passing on the difference alone.
    t.expectThat.equal(chroma(focused) - chroma(blurred) > 40, true, `the focused selection is the coloured wash (${focused}) and the blurred one the grey (${blurred})`)
    await moveFocus(t, true)
    t.expectThat.equal((await shapeColours(t)).paragraph.background, focused, 'the selection colour comes back with the focus')
  })

  test('every Markdown shape paints the same selection, focused and blurred', async (t) => {
    await addShapes(t)
    await moveFocus(t, true)
    const focused = await shapeColours(t)
    const active = focused.paragraph
    for (const shape of SHAPES) {
      t.expectThat.equal(focused[shape].colour, active.colour, `${shape} paints the paragraph's focused selection text (${active.colour})`)
      // The inline code chip paints the channel-wise inverse of the wash over
      // its own background (the four chip rules in chrome.css), so its fill is
      // the same wash a step away rather than the same number.
      t.expectThat.equal(sameWash(focused[shape].background, active.background, shape === 'inline code' ? 24 : 0), true,
        `${shape} paints the paragraph's focused selection fill (${active.background}), saw ${focused[shape].background}`)
    }
    await moveFocus(t, false)
    const blurred = await shapeColours(t)
    const inactive = blurred.paragraph
    for (const shape of SHAPES) {
      t.expectThat.equal(blurred[shape].colour, inactive.colour, `${shape} paints the paragraph's blurred selection text (${inactive.colour})`)
      t.expectThat.equal(sameWash(blurred[shape].background, inactive.background, shape === 'inline code' ? 24 : 0), true,
        `${shape} paints the paragraph's blurred selection fill (${inactive.background}), saw ${blurred[shape].background}`)
    }
    t.expectThat.equal(chroma(active.background) - chroma(inactive.background) > 40, true, `the focused wash carries colour (${active.background}) and the blurred one is grey (${inactive.background})`)
    await moveFocus(t, true)
  })
})
