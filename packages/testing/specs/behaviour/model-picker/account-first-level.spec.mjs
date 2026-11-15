/**
 * The model picker's first level with no API key configured: the signed-in
 * account route leads it beside the quick providers the reader chose, and the
 * same account does not repeat behind More models.
 *
 * @capability model-picker
 * @features model
 * @risk A reader who signs in with the account instead of an API key cannot see their account's models in the picker's first level, or finds the same models listed twice across its two levels.
 */
import { spec } from '../../fixtures/behaviour.mjs'

const trigger = (page) => page.getByRole('button', { name: 'Select model, currently DeepSeek V4.1 Flash' })

export default spec({ page: 'model-account' }, ({ test }) => {
  test('with no API key, the signed-in account leads the first level beside the chosen provider', async (t) => {
    await trigger(t.page).click()
    await t.settle()
    // The words each row is addressed by, in the order the level lists them: a
    // row's label draws a vendor's lockup in place of its word, so the names are
    // read off the rows rather than out of their text.
    const firstLevel = await t.page.locator(t.surface('model.row')).evaluateAll((rows) => rows.map((row) => row.getAttribute('aria-label')))
    t.expectThat.equal(firstLevel.length, 2, `the first level lists the account and the chosen provider (${JSON.stringify(firstLevel)})`)
    t.expectThat.equal(firstLevel[0].includes('DeepSeek V4.1 Flash'), true, `the account model leads the list (${firstLevel[0]})`)
    t.expectThat.equal(firstLevel[1].includes('GLM-5.3'), true, `the chosen provider follows (${firstLevel[1]})`)
    t.expectThat.equal(await t.read.text(t.surface('model.rule')), 'DeepSeek Account', 'the account rule names the provider above its models')
    t.expectThat.equal(await t.page.locator(t.surface('model.row')).first().getAttribute('aria-checked'), 'true', 'the account model is the one in force')
  })

  test('the account that leads the first level does not repeat behind More models', async (t) => {
    await trigger(t.page).click()
    await t.settle()
    await t.page.getByRole('menuitem', { name: 'More models' }).click()
    await t.settle()
    const secondLevel = await t.page.locator(t.surface('model.sub-row')).allInnerTexts()
    t.expectThat.equal(secondLevel.some((row) => row.includes('Gateway Flash')), true, `the remaining provider is behind More models (${JSON.stringify(secondLevel)})`)
    t.expectThat.equal(secondLevel.some((row) => row.includes('DeepSeek V4.1 Flash')), false, 'the account that leads level 1 is not listed again')
    t.expectThat.equal(await t.read.text(t.surface('model.sub-label')), 'Gateway', 'the remaining provider is named above its models')
  })
})
