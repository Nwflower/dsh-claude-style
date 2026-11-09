/**
 * The card a plugin mounts into the sidebar footer stands in the account surface
 * as a live copy the takeover rebuilds from the plugin's node. A rebuild between
 * `pointerdown` and `pointerup` cancels the press, and the overlay that press
 * opened must outlive the menu's own hover dismissal.
 *
 * @capability account-menu
 * @features account
 * @risk A plugin that repaints its own footer card while the reader presses it has the press cancelled, and the panel that press opened closes as soon as the pointer leaves the menu.
 */
import { host, spec, surface } from '../../fixtures/behaviour.mjs'

/** The attribute the skin writes its part marks into. */
const PART = surface.attribute('skin.part')
/** The live copy the account surface stands in place of a plugin's footer widget. */
const EMBED = surface('account.embed')
/** The host's account trigger: the button the host marks as a menu anchor. */
const ACCOUNT_TRIGGER = host('shell.account-trigger')

/** The stamp the plugin writes into its own words, so a repaint is visible. */
const STAMP = 'Updated 19:01'

/**
 * A plugin card mounted straight into the foot area, the way the usage plugin
 * mounts its own: words rewritten on a poll, and a control opening a host overlay.
 */
const mountCard = (t) => t.page.evaluate(({ part, stamp }) => {
  const foot = document.querySelector(`[${part}~="foot-area"]`)
  if (foot === null) throw new Error('the stand-in footer is missing')
  const settings = foot.querySelector(`[${part}~="settings-area"]`)
  const card = document.createElement('div')
  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('aria-label', 'Open usage settings')
  button.textContent = `Usage card body ${stamp}`
  button.addEventListener('click', () => {
    if (document.getElementById('debug-host-dialog') !== null) return
    // The host's shape (engine/src/host.ts::findHostModal): its Modal portals a
    // `role="presentation"` wrapper onto <body> and the dialog stands inside it.
    const wrapper = document.createElement('div')
    wrapper.setAttribute('role', 'presentation')
    const dialog = document.createElement('div')
    dialog.id = 'debug-host-dialog'
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')
    dialog.setAttribute('aria-label', 'Settings')
    // The host's own dismissal is a key handler: its overlay closes on Escape.
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      wrapper.remove()
      document.removeEventListener('keydown', onKey, true)
    }
    document.addEventListener('keydown', onKey, true)
    wrapper.appendChild(dialog)
    document.body.appendChild(wrapper)
  })
  card.appendChild(button)
  foot.insertBefore(card, settings ?? null)
  window.__debugButton = button
}, { part: PART, stamp: STAMP })

/** The copy of the card standing in the account surface. */
const copyOf = (t, selector) => t.page.evaluate(({ embedSelector, stamp }) => {
  const card = Array.from(document.querySelectorAll(embedSelector))
    .find(el => (el.textContent ?? '').includes(stamp))
  return card === undefined ? null : (card.textContent ?? '').replace(/\s+/g, ' ').trim()
}, { embedSelector: selector, stamp: STAMP })

/** The plugin's own poll: its words change, and the page hears about it. */
const repaint = (t, text) => t.page.evaluate((value) => {
  window.__debugButton.textContent = value
  const marker = document.createElement('div')
  marker.style.display = 'none'
  document.body.appendChild(marker)
}, text)

/** Whether the host's overlay still stands. */
const overlayOpen = (t) => t.page.evaluate(() => document.getElementById('debug-host-dialog') !== null)

/** Open the menu with the host's own trigger, the way the hover preference does. */
const openMenu = async (t) => {
  await t.page.evaluate((selector) => document.querySelector(selector)?.click(), ACCOUNT_TRIGGER)
  await t.settle()
}

export default spec({ page: 'desktop' }, ({ test }) => {
  test('the mirrored footer card keeps the plugin\'s repaints, waits across a press, and its overlay outlives the menu', async (t) => {
    await mountCard(t)
    await t.settle()
    await openMenu(t)
    const opened = await copyOf(t, EMBED)
    t.expectThat.equal(opened !== null, true, 'the card is gathered into the account surface')

    // An idle repaint lands: the card is live while the reader merely rests on it.
    await repaint(t, `Usage card body ${STAMP} repainted`)
    await t.settle()
    const idle = await copyOf(t, EMBED)
    t.expectThat.equal(idle !== null && idle.includes('repainted'), true,
      `an idle repaint reaches the mirrored card (${idle})`)

    // The pointer must rest on the row and then on the card: that is what arms
    // the hover preference's close, and the overlay's survival is read against it.
    const rowAt = await t.page.evaluate((selector) => {
      const row = document.querySelector(selector)
      if (row === null) return null
      const r = row.getBoundingClientRect()
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
    }, ACCOUNT_TRIGGER)
    t.expectThat.equal(rowAt !== null, true, 'the host account row is on the page')
    await t.page.mouse.move(rowAt.x, rowAt.y)
    await t.page.waitForTimeout(500)

    // A press held down across a repaint: the node is not replaced under it.
    await repaint(t, `Usage card body ${STAMP} held`)
    await t.settle()
    const cardAt = await t.page.evaluate(({ embedSelector, stamp }) => {
      const card = Array.from(document.querySelectorAll(embedSelector))
        .find(el => (el.textContent ?? '').includes(stamp))
      if (card === undefined) return null
      const r = card.getBoundingClientRect()
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
    }, { embedSelector: EMBED, stamp: STAMP })
    t.expectThat.equal(cardAt !== null, true, 'the gathered card stands in the menu')
    await t.page.mouse.move(cardAt.x, cardAt.y)
    await t.page.waitForTimeout(200)
    await t.page.mouse.click(cardAt.x, cardAt.y)
    await t.settle()

    // The press opened the host's overlay; leaving the menu may not take it down.
    t.expectThat.equal(await overlayOpen(t), true, 'the copy\'s press opens the host overlay')
    await t.page.mouse.move(900, 200)
    await t.page.waitForTimeout(900)
    await t.settle()
    t.expectThat.equal(await overlayOpen(t), true,
      'the overlay stays up once the pointer leaves the menu that opened it')
  })

  test('a press the window never sees the end of releases the copy again', async (t) => {
    await mountCard(t)
    await t.settle()
    await openMenu(t)
    const before = await copyOf(t, EMBED)
    t.expectThat.equal(before !== null, true, 'the card is gathered into the account surface')

    // A pointerdown with no pointerup: the copy must stay the node under it. The
    // press lands on the copy itself, because a press anywhere else in the page
    // is the outside press that dismisses the menu.
    await t.page.evaluate((embedSelector) => {
      const card = document.querySelector(embedSelector)
      if (card === null) throw new Error('the gathered card is missing')
      card.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, bubbles: true }))
    }, EMBED)
    await repaint(t, `Usage card body ${STAMP} held`)
    await t.settle()
    const held = await copyOf(t, EMBED)
    t.expectThat.equal(held !== null && held === before, true,
      `a repaint under a held press leaves the copy as it stands (${held})`)

    // The window loses focus before the button comes up; the press is over, and
    // the next repaint must reach the copy rather than wait forever.
    await t.page.evaluate(() => { window.dispatchEvent(new Event('blur')) })
    await repaint(t, `Usage card body ${STAMP} released`)
    await t.settle()
    const released = await copyOf(t, EMBED)
    t.expectThat.equal(released !== null && released.includes('released'), true,
      `a press lost to the window is released, and the next repaint lands (${released})`)
  })
})
