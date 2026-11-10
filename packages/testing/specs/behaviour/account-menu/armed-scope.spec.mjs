/**
 * The account menu's preparation window hides its own card until placement is
 * ready, without hiding unrelated host menus that share its role and material.
 *
 * @capability account-menu
 * @features account
 * @risk A reader opens More or a settings select while the account card prepares and the menu stays invisible.
 */
import { spec } from '../../fixtures/behaviour.mjs'

export default spec({ page: 'desktop' }, ({ test }) => {
  test('preparation scopes visibility to the account card', async (t) => {
    await t.page.click(t.host('shell.account-trigger'))
    await t.page.waitForFunction(selector => document.querySelector(selector) !== null, t.surface('account.menu'))
    await t.settle()
    const state = await t.page.evaluate((table) => {
      const account = document.querySelector(table.account)
      if (account === null) throw new Error('the account menu did not open')
      const ordinary = document.createElement('div')
      ordinary.setAttribute(table.role, 'menu')
      ordinary.setAttribute(table.material, '')
      document.body.appendChild(ordinary)
      document.body.setAttribute(table.armed, '')
      account.removeAttribute(table.ready)
      const unrelated = getComputedStyle(ordinary).visibility
      const unready = getComputedStyle(account).visibility
      account.setAttribute(table.ready, '')
      const ready = getComputedStyle(account).visibility
      ordinary.remove()
      return { unrelated, unready, ready }
    }, {
      account: t.surface('account.menu'),
      role: t.host.attribute('shell.menu'),
      material: t.host.attribute('shell.menu-material'),
      armed: t.surface.attribute('account.armed'),
      ready: t.surface.attribute('account.ready'),
    })
    t.expectThat.equal(state, { unrelated: 'visible', unready: 'hidden', ready: 'visible' }, 'only the unready account card is hidden')
  })
})
