/**
 * The reasoning-effort slider has its own switch, apart from the model picker's.
 * While it is on, the skin hides the host's own model seat and draws the level
 * itself; while it is off the picker's menu stays but the host's own seat comes
 * back visible, so a third-party effort control mounted in the same slot is
 * reachable again (issue #183). The host root's inline display must not paint
 * it beside the skin's own controls while that hide is active (issue #225).
 *
 * @capability effort-picker
 * @features model, effort
 * @risk The host seat duplicates the skin's controls, or a third-party effort control never appears under the skin.
 */
import { spec } from '../../fixtures/behaviour.mjs'

/** The host seat's hide mark and the display the reader actually gets. */
function hostSeat(t) {
  const attribute = t.surface.attribute('model.host-root')
  return t.page.evaluate(([name, seatSelector]) => {
    const seat = document.querySelector(seatSelector)
    if (seat === null || seat.parentElement === null) return null
    const host = seat.parentElement.firstElementChild
    if (host === null) return null
    return { marked: host.hasAttribute(name), display: getComputedStyle(host).display }
  }, [attribute, t.surface('model.seat')])
}

/** Whether the skin's own model trigger and effort trigger stand on the page. */
function skinControls(t) {
  return t.page.evaluate(([modelSelector, effortSelector]) =>
    document.querySelector(modelSelector) !== null && document.querySelector(effortSelector) !== null,
  [t.surface('model.trigger'), t.surface('effort.trigger')])
}

export default spec({ page: 'effort' }, ({ test }) => {
  test('with the slider on, the skin hides the host seat and draws both seats itself', async (t) => {
    await t.prefs({ effortSlider: true })
    await t.settle()
    const host = await hostSeat(t)
    t.expectThat.equal(host?.marked, true, 'the host seat carries the hide mark while the skin draws the level')
    t.expectThat.equal(host?.display, 'none', 'the host seat stays hidden over its inline display')
    t.expectThat.equal(await skinControls(t), true, 'the model and effort triggers both stand')
  })

  test('switching the slider off keeps the picker and hands the host seat back, and on hides it again', async (t) => {
    await t.prefs({ effortSlider: false })
    await t.settle()
    const handedBack = await hostSeat(t)
    t.expectThat.equal(handedBack?.marked, false, 'the host seat loses the hide mark with the slider off')
    t.expectThat.equal(handedBack?.display === 'none', false, 'the host seat comes back visible with the slider off')
    t.expectThat.equal(await t.page.evaluate((s) => document.querySelector(s) !== null, t.surface('model.trigger')), true, 'the model picker stays with the slider off')

    await t.prefs({ effortSlider: true })
    await t.settle()
    const hiddenAgain = await hostSeat(t)
    t.expectThat.equal(hiddenAgain?.marked, true, 'the host seat carries the hide mark again with the slider back on')
    t.expectThat.equal(hiddenAgain?.display, 'none', 'the host seat is hidden again over its inline display')
    t.expectThat.equal(await skinControls(t), true, 'both skin triggers stand again')
  })
})
