/**
 * The effort picker's strongest rung shows a field of dots twinkling on one
 * canvas. It plays only while its card is open and the reader lets the skin
 * move, and holds still the moment they ask for reduced motion — whether they
 * asked before opening the card or while the rung is on screen.
 *
 * @capability effort-picker
 * @features effort
 * @risk A reader who asked for reduced motion (for vestibular or seizure reasons) still gets a pulsing or strobing field of dots when they pick the strongest thinking effort.
 */
import { spec } from '../../fixtures/behaviour.mjs'

/** Ask for reduced motion the way the settings page does, and see it reach the page. */
async function reduceMotion(t) {
  await t.prefs({ motion: 'reduced' })
  t.expectThat.equal(await t.read.attribute('body', t.surface.attribute('skin.motion')), 'reduced', 'the reduced choice reached the page')
}

/** Open the effort card from its trigger beside the model name; the stand-in's seat rests on the strongest rung. */
async function openCard(t) {
  await t.page.click(t.surface('effort.trigger'))
  await t.settle()
}

/**
 * Whether the field's own pixels change between two readings a beat apart.
 * `getAnimations()` cannot see a canvas, so the drawn frame is the evidence: a
 * field that plays moves its light every frame, and a still one repeats the
 * frame it was drawn on.
 */
async function moving(t) {
  const selector = t.surface('effort.particle')
  const before = await t.read.pixels(selector)
  await t.page.waitForTimeout(120)
  const after = await t.read.pixels(selector)
  return before !== null && after !== null && before !== after
}

export default spec({ page: 'effort' }, ({ test }) => {
  test('the closed card draws no moving field', async (t) => {
    t.expectThat.equal(await moving(t), false, 'the field holds still while the card is closed')
    await openCard(t)
    t.expectThat.equal(await moving(t), true, 'the field moves once the card opens')
  }, { frames: true })

  test('the strongest rung animates its field while motion plays', async (t) => {
    await openCard(t)
    t.expectThat.visible(await t.read.box(t.surface('effort.card')), 'the effort card is open')
    t.expectThat.equal(await moving(t), true, 'the field moves')
  }, { frames: true })

  test('under reduced motion the strongest rung stands still', async (t) => {
    await reduceMotion(t)
    await openCard(t)
    t.expectThat.visible(await t.read.box(t.surface('effort.card')), 'the effort card is open')
    t.expectThat.equal(await moving(t), false, 'the field holds the frame it was drawn on')
  }, { frames: true })

  test('asking for reduced motion while the strongest rung shows stills it at once', async (t) => {
    await openCard(t)
    t.expectThat.equal(await moving(t), true, 'the field moves before the change')
    await reduceMotion(t)
    t.expectThat.equal(await moving(t), false, 'the field holds the frame it was drawn on after the change')
  }, { frames: true })
})
