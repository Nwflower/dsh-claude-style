/**
 * Provider groups have independent, keyboard-accessible disclosures whose state
 * survives reopening the picker. Searching still reaches a folded provider.
 *
 * @capability model-picker
 * @features model
 * @risk Provider headings cannot be collapsed, keyboard focus is lost, the current model changes when a group folds, or search hides a matching model.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { MODEL_SEAT_NAME } from '../../fixtures/model-seat.mjs'

const trigger = (page) => page.getByRole('button', { name: `Select model, currently ${MODEL_SEAT_NAME}` })

async function openFirstLevel(t) {
  await t.prefs({ quickProviders: ['zai'], motion: 'reduced', autoPopover: 'off', collapsedProviders: [] })
  await trigger(t.page).click()
  await t.settle()
}

export default spec({ page: 'effort' }, ({ test }) => {
  test('the first level folds one provider with the keyboard and preserves focus, selection and state', async (t) => {
    await openFirstLevel(t)
    const card = t.page.locator(t.surface('model.card'))
    const provider = card.getByRole('button', { name: 'Z.ai', exact: true })
    const rows = card.getByRole('menuitemradio')
    t.expectThat.equal(await provider.getAttribute('aria-expanded'), 'true', 'the provider starts expanded')
    t.expectThat.equal(await rows.count(), 3, 'the official model and two Z.ai models are listed')
    const controlled = await provider.getAttribute('aria-controls')
    t.expectThat.equal(await t.page.locator(`#${controlled}`).count(), 1, 'the disclosure names its model container')
    await provider.focus()
    await t.page.keyboard.press('Space')
    await t.settle()
    t.expectThat.equal(await provider.getAttribute('aria-expanded'), 'false', 'Space folds the group')
    t.expectThat.equal(await rows.count(), 1, 'only the other provider remains visible')
    t.expectThat.equal(await provider.evaluate((button) => document.activeElement === button), true, 'the repainted disclosure keeps focus')
    t.expectThat.equal(await trigger(t.page).getAttribute('aria-label'), `Select model, currently ${MODEL_SEAT_NAME}`, 'folding does not change the model in force')
    await t.page.keyboard.press('Escape')
    await trigger(t.page).click()
    await t.settle()
    t.expectThat.equal(await provider.getAttribute('aria-expanded'), 'false', 'reopening preserves the folded state')
    await provider.focus()
    await t.page.keyboard.press('Enter')
    await t.settle()
    t.expectThat.equal(await provider.getAttribute('aria-expanded'), 'true', 'Enter expands the group')
    t.expectThat.equal(await rows.count(), 3, 'the provider rows return')
  })

  test('the second level folds independently, searches folded groups and restores them after a clear', async (t) => {
    await openFirstLevel(t)
    await t.page.getByRole('menuitem', { name: 'More models' }).click()
    await t.settle()
    const card = t.page.locator(t.surface('model.sub-card'))
    const provider = card.getByRole('button', { name: 'Z.ai', exact: true })
    const other = card.getByRole('button', { name: 'DeepSeek', exact: true })
    const rows = card.getByRole('menuitemradio')
    t.expectThat.equal(await rows.count(), 3, 'the second level starts with both providers')
    await provider.click()
    await t.settle()
    t.expectThat.equal(await provider.getAttribute('aria-expanded'), 'false', 'Z.ai is folded')
    t.expectThat.equal(await other.getAttribute('aria-expanded'), 'true', 'the other provider stays open')
    t.expectThat.equal(await rows.count(), 1, 'only the other provider row remains')
    await t.page.locator(t.surface('model.search-field')).fill('GLM-5.3')
    await t.settle()
    t.expectThat.equal(await rows.count(), 1, 'search finds the folded provider row')
    t.expectThat.equal((await rows.allInnerTexts())[0].includes('GLM-5.3'), true, 'the matching model is visible')
    t.expectThat.equal(await provider.getAttribute('aria-expanded'), 'true', 'search temporarily expands the matching group')
    await t.page.locator(t.surface('model.search-clear')).click()
    await t.settle()
    t.expectThat.equal(await provider.getAttribute('aria-expanded'), 'false', 'clearing search restores the folded state')
    t.expectThat.equal(await rows.count(), 1, 'the folded rows leave again')
    await other.click()
    await t.settle()
    t.expectThat.equal(await card.getByRole('button', { name: 'DeepSeek', exact: true }).getAttribute('aria-expanded'), 'false', 'the second provider folds too')
    t.expectThat.equal((await card.innerText()).includes('No models available.'), false, 'all folded groups do not read as an empty catalog')
    t.expectThat.equal((await card.innerText()).includes('No matching models.'), false, 'all folded groups do not read as an empty search')
  })
})
