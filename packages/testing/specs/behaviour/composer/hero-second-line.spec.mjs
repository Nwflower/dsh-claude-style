/**
 * Under a 600px page the new-conversation card gives its right-hand cluster a
 * second line of its own, kept to the right edge, instead of squeezing the
 * model's name, the level and the send button into one row narrower than any of
 * them can stand. A reader on a page this narrow still meets every control, and
 * the card keeps its own edges.
 *
 * @capability composer
 * @features composer, model
 * @risk A narrow home page draws the model name invisible and overlaps the level, voice and send controls, or pushes the send button past the card's edge.
 */
import { host, spec, surface } from '../../fixtures/behaviour.mjs'
import { heroCard } from '../../fixtures/hero-card.mjs'

const CARD = host('composer.card')
const PART = surface.attribute('skin.part')
const LABEL = surface('model.seat-name')
const NARROW = surface.attribute('skin.page-under-600')
const TOOLBAR = '[' + surface.attribute('composer.responsive-toolbar') + ']'

/** What the card does with its two clusters: their rows, their right edges, and the card's own width. */
async function rows(t) {
  return t.page.evaluate(([card, toolbar, part, labelSelector, narrow]) => {
    const box = (node) => {
      const rect = node.getBoundingClientRect()
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }
    }
    const element = document.querySelector(card)
    const bar = document.querySelector(toolbar)
    const tools = bar.querySelector('[' + part + '~="tools"]')
    const trailing = bar.querySelector('[' + part + '~="trailing"]')
    const last = trailing.lastElementChild
    const label = document.querySelector(labelSelector)
    return {
      mark: document.body.hasAttribute(narrow),
      card: box(element),
      toolbar: box(bar),
      tools: box(tools),
      trailing: box(trailing),
      last: last === null ? null : box(last),
      label: label === null ? null : { width: label.clientWidth, scroll: label.scrollWidth },
      overflow: element.scrollWidth - element.clientWidth,
    }
  }, [CARD, TOOLBAR, PART, LABEL, NARROW])
}

export default spec({ page: 'model-meter', bands: ['phone'] }, ({ test }) => {
  test('a narrow home page keeps the card\'s controls on a second right-aligned line', async (t) => {
    await heroCard(t, { width: 360, hero: true })
    const state = await rows(t)
    const at = ': ' + JSON.stringify(state)
    t.expectThat.equal(state.mark, true, 'the page is marked as one under 600px' + at)
    t.expectThat.equal(state.trailing.top >= state.tools.bottom - 1, true, 'the right-hand cluster starts below the left one' + at)
    t.expectThat.equal(state.toolbar.right - state.trailing.right <= 8, true, 'the right-hand cluster ends on the toolbar\'s right edge' + at)
    t.expectThat.equal(state.last === null || state.trailing.right - state.last.right <= 8, true, 'the last control stands at the cluster\'s right end' + at)
    t.expectThat.equal(state.trailing.width >= state.toolbar.width - 8, true, 'the right-hand cluster takes the second line whole' + at)
    t.expectThat.equal(state.toolbar.height >= 50, true, 'the toolbar stands two control rows tall' + at)
    t.expectThat.equal(state.label !== null && state.label.width > 0, true, 'the model\'s name keeps a box on the line' + at)
    t.expectThat.equal(state.overflow <= 1, true, 'the card has no horizontal overflow' + at)
  })
})
