/**
 * The new-conversation card's toolbar keeps one control line above its stacked
 * floor: the permission segments and the right-hand controls stand on the line
 * the model's name is shortened on, and a name too long for the room ends in
 * the label's ellipsis rather than wrapping the card into a second row.
 *
 * @capability composer
 * @features composer, model
 * @risk The first field a reader meets on the home page stands three rows tall in a narrow window, its model selector pushing the send button onto a line of its own.
 */
import { host, spec, surface } from '../../fixtures/behaviour.mjs'

const CARD = host('composer.card')
const VARIANT = host('composer.variant')
const LAYOUT = surface.attribute('composer.responsive-layout')
const PART = surface.attribute('skin.part')
const LABEL = surface('model.seat-name')
const LONG = 'qwen4-max-preview · Bailian Token Plan Enterprise'
const TOOLBAR = '[' + surface.attribute('composer.responsive-toolbar') + ']'

/** Make the home card the hero composer with a name longer than the row can hold. */
async function lengthen(t) {
  await t.page.evaluate(([card, variant, label, long, part]) => {
    const stack = document.querySelector('[' + part + '~="composer-stack"]')
    if (stack === null) throw new Error('the composer stack is not on the page')
    stack.setAttribute(variant, 'hero')
    const node = document.querySelector(label)
    if (node === null) throw new Error('the model label is not on the page')
    node.textContent = long
    const element = document.querySelector(card)
    element.style.setProperty('width', '420px')
    element.style.setProperty('max-width', '420px')
  }, [CARD, VARIANT, LABEL, LONG, PART])
  await t.settle()
}

/** The card's one line of controls: the toolbar's height, and the two clusters' centres. */
async function line(t) {
  return t.page.evaluate(([cardSelector, toolbarSelector, part, layoutMark]) => {
    const card = document.querySelector(cardSelector)
    const toolbar = document.querySelector(toolbarSelector)
    const tools = toolbar.querySelector('[' + part + '~="tools"]')
    const trailing = toolbar.querySelector('[' + part + '~="trailing"]')
    const centre = (element) => element.getBoundingClientRect().top + element.getBoundingClientRect().height / 2
    return {
      layout: card.getAttribute(layoutMark),
      toolbarHeight: Math.round(toolbar.getBoundingClientRect().height),
      sameLine: Math.abs(centre(tools) - centre(trailing)) <= 1,
      overflow: card.scrollWidth - card.clientWidth,
    }
  }, [CARD, TOOLBAR, PART, LAYOUT])
}

export default spec({ page: 'model-meter' }, ({ test }) => {
  test('a long model name keeps the new-conversation card on one control line', async (t) => {
    await lengthen(t)
    const state = await line(t)
    t.expectThat.equal(state.layout, 'compact', 'the 420px card takes the compact toolbar')
    t.expectThat.equal(state.sameLine, true, 'the tools and the model cluster share one line: ' + JSON.stringify(state))
    t.expectThat.equal(state.toolbarHeight <= 30, true, 'the toolbar stands one line tall: ' + JSON.stringify(state))
    t.expectThat.equal(state.overflow <= 1, true, 'the card has no horizontal overflow: ' + JSON.stringify(state))
    const label = await t.page.evaluate((selector) => {
      const node = document.querySelector(selector)
      return { client: node.clientWidth, scroll: node.scrollWidth, overflow: getComputedStyle(node).textOverflow }
    }, LABEL)
    t.expectThat.equal(label.overflow, 'ellipsis', 'the over-long name ends in an ellipsis')
    t.expectThat.equal(label.scroll > label.client, true, 'the name is shortened: ' + JSON.stringify(label))
  })
})
