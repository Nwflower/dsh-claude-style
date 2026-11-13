/**
 * The host's model menu carries an Agent Teams switch (the session's saved
 * team selection). The skin's picker replaces that menu, so it draws the
 * switch itself: under the model rows, reading the session's `agentTeam`
 * projection, saving through `remote.agentTeams`, and asking before it turns
 * the team off in a session that has already sent a model request. The host's
 * dialog and toast are the host's own primitives, which the stand-in page does
 * not render.
 *
 * @capability model-picker
 * @features model
 * @risk A reader who turns on agent teamwork from the model picker finds no switch, a switch that does not save, or one that turns a running session's team off without asking.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { MODEL_SEAT_NAME } from '../../fixtures/model-seat.mjs'

const modelButton = (page) => page.getByRole('button', { name: MODEL_SEAT_NAME })
const teamSwitch = (page) => page.getByRole('switch', { name: 'Enable agent teamwork' })

export default spec({ page: 'effort' }, ({ test }) => {
  test('the switch stands under the model rows and saves the selection', async (t) => {
    await modelButton(t.page).click()
    await t.settle()
    t.expectThat.equal(await teamSwitch(t.page).getAttribute('aria-checked'), 'false', 'a session with no saved selection reads off')
    await teamSwitch(t.page).click()
    await t.settle()
    t.expectThat.equal(await t.page.evaluate(() => window.__agentTeam.calls), [['smoke-session', true]], 'the press saves the selection for the shown session')
    t.expectThat.equal(await teamSwitch(t.page).getAttribute('aria-checked'), 'true', 'the saved projection turns the switch on')
  })

  test('a press anywhere on the row toggles it', async (t) => {
    await modelButton(t.page).click()
    await t.settle()
    await t.page.getByText('Enable agent teamwork').click()
    await t.settle()
    t.expectThat.equal(await t.page.evaluate(() => window.__agentTeam.enabled()), true, 'the label presses the switch')
  })

  test('turning it off before the session has sent a request needs no confirmation', async (t) => {
    await modelButton(t.page).click()
    await t.settle()
    await teamSwitch(t.page).click()
    await t.settle()
    await teamSwitch(t.page).click()
    await t.settle()
    t.expectThat.equal(await t.page.evaluate(() => window.__agentTeam.calls.length), 2, 'both presses saved')
    t.expectThat.equal(await t.page.getByRole('dialog').count(), 0, 'no dialog stands')
  })

  test('turning it off after a model request asks first instead of saving', async (t) => {
    await modelButton(t.page).click()
    await t.settle()
    await teamSwitch(t.page).click()
    await t.settle()
    await t.page.evaluate(() => window.__agentTeam.start(true))
    await t.settle()
    await teamSwitch(t.page).click()
    await t.settle()
    t.expectThat.equal(await t.page.evaluate(() => window.__agentTeam.calls.length), 1, 'the press that would turn the team off saves nothing before the reader confirms')
    t.expectThat.equal(await t.page.evaluate(() => window.__agentTeam.enabled()), true, 'the team stays on while the confirmation is up')
  })

  test('a failed save leaves the switch where it was', async (t) => {
    await modelButton(t.page).click()
    await t.settle()
    await t.page.evaluate(() => { window.__agentTeam.failNext = 'gateway refused' })
    await teamSwitch(t.page).click()
    await t.settle()
    t.expectThat.equal(await t.page.evaluate(() => window.__agentTeam.calls.length), 1, 'the press asked the host to save')
    t.expectThat.equal(await teamSwitch(t.page).getAttribute('aria-checked'), 'false', 'the switch shows the saved selection, not the press')
  })
})
