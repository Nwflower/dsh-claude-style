/**
 * The model picker's second level carries a search field at its top. Typing a
 * name narrows the list to the models that answer to it and keeps the provider
 * label above them; the field's clear puts every model back, and hands its
 * words over the way the reader asked to be moved. Both the card and the
 * field's own caret belong to the skin, so a key or a press lands where the
 * reader expects.
 *
 * @capability model-picker
 * @features model, caret
 * @risk A reader who opens More models and types a model's name sees the whole catalog unchanged, a list with no rows at all, or a second Escape folding a card they are still reading.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { MODEL_SEAT_NAME } from '../../fixtures/model-seat.mjs'

/** The host's model button: the reader finds it by the name it carries. */
const trigger = (page) => page.getByRole('button', { name: `Select model, currently ${MODEL_SEAT_NAME}` })

/** Open level 1, then its More-models row. A press on that row hands the field the focus. */
async function openSecondLevel(t) {
  await trigger(t.page).click()
  await t.settle()
  await t.page.getByRole('menuitem', { name: 'More models' }).click()
  await t.settle()
  t.expectThat.visible(await t.read.box(t.surface('model.sub-card')), 'the second level is open')
}

/** The words each row of the second level draws. */
const rows = (t) => t.page.locator(t.surface('model.sub-row'))

/** Type into the field the way a reader does, then let the card settle. */
async function search(t, words) {
  await t.page.locator(t.surface('model.search-field')).fill(words)
  await t.settle()
}

/**
 * Open the second level, narrow it to one model, and press the field's clear.
 * @returns how many rows the card listed before the query.
 */
async function clearOneQuery(t) {
  await openSecondLevel(t)
  const every = await rows(t).count()
  await search(t, 'glm-4.7')
  t.expectThat.equal(await rows(t).count(), 1, 'the query narrowed the list')
  await t.page.click(t.surface('model.search-clear'))
  return every
}

export default spec({ page: 'effort' }, ({ test }) => {
  test('typing a name narrows the second level to the models that answer to it, under their provider', async (t) => {
    await openSecondLevel(t)
    const every = await rows(t).count()
    t.expectThat.equal(every > 1, true, `the card lists the providers the first level does not (${every} rows)`)
    await search(t, 'glm-4.7')
    const narrowed = await rows(t).allInnerTexts()
    t.expectThat.equal(narrowed.length, 1, 'one row answers to the name typed')
    t.expectThat.equal(narrowed[0].includes('GLM-4.7'), true, `the row is the one typed (${JSON.stringify(narrowed)})`)
    t.expectThat.equal(await t.read.text(t.surface('model.sub-label')), 'Z.ai', 'the provider label stands above the narrowed rows')
  })

  test('a key pressed on the first level opens the second one and narrows the catalog to it', async (t) => {
    await trigger(t.page).click()
    await t.settle()
    await t.page.keyboard.press('5')
    await t.settle()
    t.expectThat.visible(await t.read.box(t.surface('model.sub-card')), 'the key opened the second level')
    const field = t.surface('model.search-field')
    t.expectThat.equal(await t.page.locator(field).inputValue(), '5', 'the field holds the key')
    t.expectThat.equal(await t.page.evaluate((selector) => document.activeElement === document.querySelector(selector), field), true, 'the field holds the focus')
    const narrowed = await rows(t).allInnerTexts()
    t.expectThat.equal(narrowed.length, 1, 'one row answers to the key')
    t.expectThat.equal(narrowed[0].includes('GLM-5.3'), true, `the row is the one the key names (${JSON.stringify(narrowed)})`)
  })

  test('a query no model answers to says so instead of listing the whole catalog', async (t) => {
    await openSecondLevel(t)
    await search(t, 'nothing-answers-to-this')
    t.expectThat.equal(await rows(t).count(), 0, 'no row is left')
    t.expectThat.equal((await t.read.text(t.surface('model.sub-card')))?.includes('No matching models.'), true, 'the card says no model matches')
  })

  test('the field\'s clear empties it and puts every model back', async (t) => {
    const every = await clearOneQuery(t)
    // The clear hands its words over the way the reader asked: motion plays the
    // dissolve, and reduced motion lands it on the spot. Either way the rows
    // are back within the flight's own length.
    await t.page.waitForFunction((selector) => document.querySelectorAll(selector).length > 1, t.surface('model.sub-row'), { timeout: 4000 })
    await t.settle()
    t.expectThat.equal(await t.page.locator(t.surface('model.search-field')).inputValue(), '', 'the field is empty')
    t.expectThat.equal(await rows(t).count(), every, 'every model is back')
    t.expectThat.equal(await t.page.locator(t.surface('model.search-clear')).isVisible(), false, 'the clear goes away with the words')
  })

  test('the first Escape takes the query back and the second folds the card', async (t) => {
    await openSecondLevel(t)
    await search(t, 'glm-4.7')
    await t.page.keyboard.press('Escape')
    await t.settle()
    t.expectThat.equal(await t.page.locator(t.surface('model.search-field')).inputValue(), '', 'the Escape emptied the field')
    t.expectThat.visible(await t.read.box(t.surface('model.sub-card')), 'the card the reader typed in stays open')
    await t.page.keyboard.press('Escape')
    await t.settle()
    t.expectThat.equal(await t.read.box(t.surface('model.sub-card')), null, 'the second Escape folded it')
  })

  test('the field draws the skin\'s own caret while the reader types in it', async (t) => {
    await openSecondLevel(t)
    // The field took the focus from the press that opened the card; the drawn
    // caret is the blink the skin paints, not the browser's.
    await search(t, 'glm')
    const field = t.surface('model.search-field')
    t.expectThat.equal(await t.page.evaluate((selector) => document.activeElement === document.querySelector(selector), field), true, 'the field holds the focus')
    t.expectThat.equal(await t.read.computed(field, 'caret-color'), 'rgba(0, 0, 0, 0)', 'the native caret is pressed down')
    t.expectThat.moving(await t.read.animations(t.surface('caret.layer')), 'the drawn caret blinks')
  })

  test('under reduced motion the clear lands at once and leaves nothing mid-flight', async (t) => {
    await t.prefs({ motion: 'reduced' })
    const every = await clearOneQuery(t)
    t.expectThat.equal(await rows(t).count(), every, 'every model is back on the press itself')
    const field = t.surface('model.search-field')
    t.expectThat.equal(await t.read.computed(field, 'caret-color'), 'rgba(0, 0, 0, 0)', 'the native caret stays pressed down')
    t.expectThat.still(await t.read.animations(t.surface('caret.layer')), 'no caret blinks')
  })

  test('the second level opens with its field a press away from the whole catalog', async (t) => {
    await openSecondLevel(t)
    const field = await t.read.box(t.surface('model.search-field'))
    const card = await t.read.box(t.surface('model.sub-card'))
    t.expectThat.visible(field, 'the search field is drawn at the top of the card')
    t.expectThat.boxWithin(field, card, 'the field stands inside the card')
    t.expectThat.equal(field.top < (await t.read.box(t.surface('model.sub-row'))).top, true, 'the field stands above the rows')
  })

  test('with every provider on the first level, More models opens a second level that lists them all', async (t) => {
    // The chosen provider joins the official one on the first level, so no
    // provider is left behind it and the second level carries the whole catalog.
    await t.prefs({ quickProviders: ['zai'] })
    await trigger(t.page).click()
    await t.settle()
    const firstLevel = await t.page.locator(t.surface('model.row')).allInnerTexts()
    t.expectThat.equal(firstLevel.length, 3, `the first level lists every provider (${JSON.stringify(firstLevel)})`)
    await t.page.getByRole('menuitem', { name: 'More models' }).click()
    await t.settle()
    t.expectThat.visible(await t.read.box(t.surface('model.sub-card')), 'the second level is open')
    const secondLevel = await t.page.locator(t.surface('model.sub-row')).allInnerTexts()
    t.expectThat.equal(secondLevel.length, 3, `the second level lists every model (${JSON.stringify(secondLevel)})`)
    t.expectThat.equal((await t.read.text(t.surface('model.sub-card')))?.includes('No models available.'), false, 'the card is not empty')
  })
})
