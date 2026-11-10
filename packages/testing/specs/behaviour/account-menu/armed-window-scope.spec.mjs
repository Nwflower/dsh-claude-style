/**
 * The account menu's warm-up window belongs to the account menu alone. A card
 * that comes and goes between two passes leaves the window standing with no card
 * of its own to close it, and a host menu the reader opens meanwhile is drawn at
 * once — the window holds the skin's own card, never the host's other menus.
 *
 * @capability account-menu
 * @features account
 * @risk With the warm-up window standing, the sidebar's More menu and the settings page's dropdowns stay unpainted, so the reader's press on them appears to do nothing.
 */
import { host, spec, surface } from '../../fixtures/behaviour.mjs'

/** The host's account trigger: the button the host marks as a menu anchor. */
const ACCOUNT_TRIGGER = host('shell.account-trigger')
/** The host's menu card, whichever menu it holds. */
const MENU = host('shell.menu')
/** The skin's mark on the card it owns. */
const ACCOUNT_MENU = surface('account.menu')
/** The warm-up window the skin keeps on the body. */
const ARMED = surface.attribute('account.armed')

/**
 * The card the host mounts for the account row comes and goes inside the press
 * that opened it, between two passes: the skin never marks it, so the warm-up
 * window has no close of its own and stands with the trigger reporting the menu
 * shut. The card comes back as the next host menu — a real host card with no
 * skin mark on it.
 */
const warmUpWithoutCard = (t) => t.page.evaluate(({ trigger, menu, armed }) => {
  const row = document.querySelector(trigger)
  if (row === null) throw new Error('the host account row is missing')
  row.click()
  const card = document.querySelector(menu)
  if (card === null) throw new Error('the host mounts no account card')
  card.remove()
  row.setAttribute('aria-expanded', 'false')
  document.body.setAttribute(armed, '')
  document.body.appendChild(card)
}, { trigger: ACCOUNT_TRIGGER, menu: MENU, armed: ARMED })

export default spec({ page: 'desktop' }, ({ test }) => {
  test('a host menu opened while the warm-up window stands is drawn at once', async (t) => {
    await warmUpWithoutCard(t)
    await t.settle()
    t.expectThat.equal(await t.read.attribute('body', ARMED), '',
      'the warm-up window stands with no account card to close it')
    t.expectThat.equal(await t.read.computed(MENU, 'visibility'), 'visible',
      'the host menu standing in the window is not held unpainted')
    t.expectThat.equal(await t.page.evaluate(([menu, account]) => document.querySelector(menu).matches(account), [MENU, ACCOUNT_MENU]), false,
      'the standing menu carries no account mark, so the window has nothing of the skin\'s to hold')
  })
})
