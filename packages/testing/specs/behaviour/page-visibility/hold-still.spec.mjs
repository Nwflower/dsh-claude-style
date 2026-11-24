/**
 * Background visibility pauses the caret's blink. An open menu can still
 * paint if the host accepts input while the page reports itself hidden.
 *
 * @capability page-visibility
 * @features account, caret
 * @risk Background animations keep drawing, or an opened menu stays transparent while the host accepts input.
 */
import { spec } from '../../fixtures/behaviour.mjs'

/**
 * Report the page off screen, then back, at the browser's boundary: a headless
 * window is never hidden, so the answer the page reads and the event it hears
 * stand in for the move.
 */
async function reportPage(t, offScreen) {
  await t.page.evaluate((off) => {
    if (off) Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    else delete document.visibilityState
    document.dispatchEvent(new Event('visibilitychange'))
  }, offScreen)
  await t.settle()
}

export default spec({ page: 'desktop' }, ({ test }) => {
  test('the caret stops blinking off screen and resumes on return', async (t) => {
    await t.prefs({ motion: 'full' })
    await t.page.click(t.host('composer.input'))
    const caret = t.surface('caret.layer')
    await t.page.locator(caret).waitFor({ state: 'visible' })
    t.expectThat.equal(await t.read.computed(caret, 'animation-play-state'), 'running', 'the caret blinks on screen')
    await reportPage(t, true)
    t.expectThat.equal(await t.read.computed(caret, 'animation-play-state'), 'paused', 'the caret holds off screen')
    await reportPage(t, false)
    t.expectThat.equal(await t.read.computed(caret, 'animation-play-state'), 'running', 'the caret blinks again')
  })

  test('the account menu paints while the page reports itself hidden', async (t) => {
    await reportPage(t, true)
    await t.page.locator('#host-account').click()
    const menu = t.page.locator(t.surface('account.menu'))
    await menu.waitFor({ state: 'visible' })
    const opacity = await menu.evaluate(async (card) => {
      const running = card.getAnimations().filter(animation => animation.playState === 'running')
      await Promise.all(running.map(animation => animation.finished))
      return getComputedStyle(card).opacity
    })
    t.expectThat.equal(await t.read.attribute('body', t.surface.attribute('skin.asleep')), '', 'the page still reports itself hidden')
    t.expectThat.equal(opacity, '1', 'the account menu reaches full opacity')
    await reportPage(t, false)
  })
})
