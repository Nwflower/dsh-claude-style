/**
 * The page names the model the session is on, and the knob's size variables
 * restyle it: a reader's own tooling reads the model off <body> by its provider
 * and catalog id without scraping the trigger's text, and a knob of another
 * size keeps its travel and its fill.
 *
 * @capability effort-picker
 * @features effort,model
 * @risk A reader's tooling names the wrong model — the previous one, or a provider with no model at all — or a resized knob leaves the fill behind its centre.
 */
import { spec } from '../../fixtures/behaviour.mjs'

/** Put one of the second provider's models in force, the way the picker's own rows do. */
async function selectModel(t, model) {
  await t.page.evaluate(async (id) => {
    await window.__dshSmokeHost.modelDirectories.directoryFor('smoke-session').select({ provider: 'zai', model: id })
  }, model)
  await t.settle()
}

export default spec({ page: 'effort' }, ({ test }) => {
  test('the model in force is named on the body by its provider and its catalog id', async (t) => {
    const mark = t.surface.attribute('model.current')
    await t.page.waitForFunction((name) => document.body.hasAttribute(name), mark)
    t.expectThat.equal(await t.read.attribute('body', mark), 'deepseek-official/deepseek-reasoner', 'the seat the page opened on is the model named')
    await selectModel(t, 'glm-5.3')
    t.expectThat.equal(await t.read.attribute('body', mark), 'zai/glm-5.3', 'a picked model replaces the name')
    await selectModel(t, 'glm-4.7')
    t.expectThat.equal(await t.read.attribute('body', mark), 'zai/glm-4.7', 'the name follows the model within one provider')
  })

  test('the size variables restyle the top-rung knob without breaking its geometry', async (t) => {
    await t.page.click(t.surface('effort.trigger'))
    await t.settle()
    const card = t.surface('effort.card')
    const properties = {
      width: t.surface.property('effort.knob-width'),
      height: t.surface.property('effort.knob-height'),
    }
    await t.page.evaluate(({ selector, names }) => {
      const element = document.querySelector(selector)
      element.style.setProperty(names.width, '34px')
      element.style.setProperty(names.height, '47px')
    }, { selector: card, names: properties })
    await t.settle()
    const painted = await t.page.evaluate(({ knobSelector, cardSelector, apexAttribute }) => {
      const knob = document.querySelector(knobSelector)
      const style = getComputedStyle(knob)
      return {
        apex: knob.closest(cardSelector).hasAttribute(apexAttribute),
        width: style.width,
        height: style.height,
      }
    }, { knobSelector: t.surface('effort.knob'), cardSelector: card, apexAttribute: t.surface.attribute('effort.apex') })
    t.expectThat.equal(painted.apex, true, 'the check runs on the top rung')
    t.expectThat.equal([painted.width, painted.height].join(','), '34px,47px', 'the size variables set the knob box')
    const geometry = await t.page.evaluate(([knobSelector, fillSelector]) => {
      const knob = document.querySelector(knobSelector).getBoundingClientRect()
      const fill = document.querySelector(fillSelector).getBoundingClientRect()
      return { fillRight: fill.right, knobCentre: knob.left + knob.width / 2 }
    }, [t.surface('effort.knob'), t.surface('effort.fill')])
    t.expectThat.equal(Math.abs(geometry.fillRight - geometry.knobCentre) <= 1, true, `the fill still ends at the custom knob centre (${JSON.stringify(geometry)})`)
  })
})
