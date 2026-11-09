/**
 * The host's version-update control keeps its place in the sidebar footer: the
 * takeover hides the controls beside the account row, and this one has to stay
 * painted and pressable, since the skin keeps no copy of it.
 *
 * @capability account-menu
 * @features account
 * @risk With the footer taken over the host's version-update button vanishes, so a reader with an update waiting has no way to start it.
 */
import { spec } from '../../fixtures/behaviour.mjs'

/** The host's settings row, where its account row and update control stand. */
const SETTINGS_ROW = 'account.settings-row'
/** The host's update control: the row's one button carrying `aria-disabled`. */
const UPDATE_CONTROL = 'button[aria-disabled]'

export default spec({ page: 'desktop' }, ({ test }) => {
  test('the host update control stays painted and pressable in the footer', async (t) => {
    const row = t.surface(SETTINGS_ROW)
    const state = await t.page.evaluate(({ rowSelector, controlSelector }) => {
      const row = document.querySelector(rowSelector)
      if (row === null) throw new Error('the stand-in footer has no settings row')
      const control = row.querySelector(controlSelector)
      if (control === null) throw new Error('the stand-in footer has no update control')
      window.__updatePresses = 0
      control.addEventListener('click', () => { window.__updatePresses += 1 })
      const style = getComputedStyle(control)
      const box = control.getBoundingClientRect()
      return {
        display: style.display,
        visibility: style.visibility,
        width: Math.round(box.width),
        height: Math.round(box.height),
      }
    }, { rowSelector: row, controlSelector: UPDATE_CONTROL })
    t.expectThat.equal(state.display !== 'none' && state.visibility === 'visible', true,
      `the update control is painted (display ${state.display}, visibility ${state.visibility})`)
    t.expectThat.equal(state.width > 0 && state.height > 0, true,
      `the update control keeps a box (${state.width}x${state.height})`)
    await t.page.locator(`${row} ${UPDATE_CONTROL}`).click()
    t.expectThat.equal(await t.page.evaluate(() => window.__updatePresses), 1,
      'a press on the update control reaches it')
  })
})
