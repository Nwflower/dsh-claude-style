/**
 * A window in the background holds still: every animation on the page pauses
 * where it stands, the skin's and the host's alike, and plays again from there
 * when the page comes back.
 *
 * @capability page-visibility
 * @features caret, effort, home-ripple
 * @risk A window left in the background keeps producing frames, and coming back to it stalls for seconds while the compositor catches up.
 */
import { spec } from '../../fixtures/behaviour.mjs'

/** The animation a matrix dot draws on its own overlay, which `*` alone does not reach. */
const OVERLAY = '::after'

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

/** How many animations the page is running, the ones drawn on an overlay included. */
const running = (t) => t.page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running').length)

export default spec({ page: 'effort' }, ({ test }) => {
  test('the page holds every animation while it is off screen and plays them again on the return', async (t) => {
    await t.page.click(t.surface('effort.trigger'))
    await t.settle()
    const dots = t.surface('effort.particle')
    t.expectThat.equal(await t.read.computed(dots, 'animation-play-state', OVERLAY), 'running', 'a dot draws its overlay while the page is on screen')
    const busy = await running(t)
    t.expectThat.equal(busy > 0, true, `the page runs animations to hold (${busy})`)

    await reportPage(t, true)
    t.expectThat.equal(await t.read.attribute('body', t.surface.attribute('skin.asleep')), '', 'the page wears the mark while it is off screen')
    t.expectThat.equal(await t.read.computed(dots, 'animation-play-state', OVERLAY), 'paused', 'the overlay holds where it stands')
    t.expectThat.equal(await running(t), 0, 'no animation on the page is left running')

    await reportPage(t, false)
    t.expectThat.equal(await t.read.attribute('body', t.surface.attribute('skin.asleep')), null, 'the mark goes with the return')
    t.expectThat.equal(await t.read.computed(dots, 'animation-play-state', OVERLAY), 'running', 'the overlay plays again')
  })
})
