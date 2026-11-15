/**
 * The effort card exposes the current model family and the knob's appearance
 * hooks, so a reader-supplied sprite can follow the catalog without scraping
 * the trigger's text or replacing the control's geometry.
 *
 * @capability effort-picker
 * @features effort,model
 * @risk A custom sprite points at the wrong model, freezes on the top rung, or moves the knob's centre away from the fill.
 */
import { spec } from '../../fixtures/behaviour.mjs'

async function selectModel(t, model) {
  await t.page.evaluate(async (id) => {
    await window.__dshSmokeHost.modelDirectories.directoryFor('smoke-session').select({ provider: 'zai', model: id })
  }, model)
  await t.settle()
}

export default spec({ page: 'effort' }, ({ test }) => {
  test('the family follows the model id and display name, and an unknown model removes it', async (t) => {
    await t.page.click(t.surface('effort.trigger'))
    await t.settle()
    const card = t.surface('effort.card')
    const family = t.surface.attribute('effort.model-family')
    await t.page.waitForFunction(([name, selector]) => document.querySelector(selector)?.getAttribute(name) === 'deepseek', [family, card])
    t.expectThat.equal(await t.read.attribute(card, family), 'deepseek', 'the catalog id identifies the initial model')
    await selectModel(t, 'glm-4.7')
    t.expectThat.equal(await t.read.attribute(card, family), null, 'a model with no reasoning ladder leaves no stale family on the hidden card')
    await selectModel(t, 'glm-5.3')
    t.expectThat.equal(await t.read.attribute(card, family), 'zai', 'switching models switches the family')
    await selectModel(t, 'gateway-alias')
    t.expectThat.equal(await t.read.attribute(card, family), 'qwen', 'an opaque id uses the catalog display name')
    await selectModel(t, 'opaque-model')
    t.expectThat.equal(await t.read.attribute(card, family), null, 'an unclaimed model carries no family mark')
  })

  test('sprite and size variables restyle the top-rung knob without breaking its geometry', async (t) => {
    await t.page.click(t.surface('effort.trigger'))
    await t.settle()
    const card = t.surface('effort.card')
    const properties = {
      image: t.surface.property('effort.knob-image'),
      frames: t.surface.property('effort.knob-frames'),
      width: t.surface.property('effort.knob-width'),
      height: t.surface.property('effort.knob-height'),
    }
    await t.page.evaluate(({ selector, names }) => {
      const element = document.querySelector(selector)
      element.style.setProperty(names.image, 'linear-gradient(90deg, red, blue)')
      element.style.setProperty(names.frames, '8')
      element.style.setProperty(names.width, '34px')
      element.style.setProperty(names.height, '47px')
    }, { selector: card, names: properties })
    await t.settle()
    const painted = await t.page.evaluate(({ knobSelector, cardSelector, apexAttribute }) => {
      const knob = document.querySelector(knobSelector)
      knob.style.backgroundPosition = '100% 0'
      const style = getComputedStyle(knob)
      return {
        apex: knob.closest(cardSelector).hasAttribute(apexAttribute),
        image: style.backgroundImage,
        size: style.backgroundSize,
        position: style.backgroundPosition,
        width: style.width,
        height: style.height,
      }
    }, { knobSelector: t.surface('effort.knob'), cardSelector: card, apexAttribute: t.surface.attribute('effort.apex') })
    t.expectThat.equal(painted.apex, true, 'the check runs on the top rung')
    t.expectThat.equal(painted.image.includes('linear-gradient'), true, 'the image variable paints the knob')
    t.expectThat.equal(painted.size, '800% 100%', 'the frame count sizes the sprite strip')
    t.expectThat.equal(painted.position.startsWith('100%'), true, 'the top rung leaves background positioning to the sprite')
    t.expectThat.equal([painted.width, painted.height].join(','), '34px,47px', 'the size variables set the knob box')
    const geometry = await t.page.evaluate(([knobSelector, fillSelector]) => {
      const knob = document.querySelector(knobSelector).getBoundingClientRect()
      const fill = document.querySelector(fillSelector).getBoundingClientRect()
      return { fillRight: fill.right, knobCentre: knob.left + knob.width / 2 }
    }, [t.surface('effort.knob'), t.surface('effort.fill')])
    t.expectThat.equal(Math.abs(geometry.fillRight - geometry.knobCentre) <= 1, true, `the fill still ends at the custom knob centre (${JSON.stringify(geometry)})`)
  })
})
