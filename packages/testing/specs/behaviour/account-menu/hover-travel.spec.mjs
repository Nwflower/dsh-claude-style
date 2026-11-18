/**
 * A hover-opened account menu stays up while the pointer travels from the row
 * toward the card. The row and the card are separate boxes with a sliver of
 * desktop between them, and the card is held unpainted until it settles, so
 * neither :hover nor mouseenter can report the crossing; the close grace reads
 * the pointer's position against the two boxes instead and keeps the menu up.
 *
 * @capability account-menu
 * @features account
 * @risk The menu folds the moment the pointer leaves the row for the card, so with hover-open on the reader can never reach a row to click it (#394).
 */
import { spec } from '../../fixtures/behaviour.mjs'

export default spec({ page: 'desktop' }, ({ test }) => {
  test('the pointer crossing from the row toward the card keeps the hover-opened menu up', async (t) => {
    await t.prefs({ autoPopover: 'all' })
    const triggerSel = t.host('shell.account-trigger')
    const menuSel = t.surface('account.menu')
    const readyAttr = t.surface.attribute('account.ready')

    // Hover the row: the dwell opens the host's menu.
    const row = await t.page.locator(triggerSel).boundingBox()
    await t.page.mouse.move(row.x + row.width / 2, row.y + row.height / 2)
    await t.page.waitForFunction(s => document.querySelector(s) !== null, menuSel, { timeout: 10000 })
    // Let the card finish settling so its box is the one the reader will see.
    await t.page.waitForFunction(([s, a]) => document.querySelector(s)?.hasAttribute(a) === true, [menuSel, readyAttr], { timeout: 10000 })
    await t.settle()

    // The air between the card's bottom edge and the row's top edge: a pointer
    // parked there is on neither box — exactly the crossing the close grace used
    // to read as a departure.
    const gap = await t.page.evaluate(([ts, ms]) => {
      const trig = document.querySelector(ts).getBoundingClientRect()
      const card = document.querySelector(ms).getBoundingClientRect()
      return { x: trig.left + trig.width / 2, y: (card.bottom + trig.top) / 2, apart: card.bottom < trig.top }
    }, [triggerSel, menuSel])
    t.expectThat.equal(gap.apart, true, 'the card opens above its row, leaving a gap to cross')
    await t.page.mouse.move(gap.x, gap.y)

    // The close grace runs out inside this settle: a menu the defect folded is
    // gone by now, while the keep-alive holds this one with the pointer between
    // the row and the card.
    await t.settle()
    t.expectThat.equal(await t.read.count(menuSel), 1, 'the card survives the pointer crossing between row and card')
    t.expectThat.equal(await t.read.attribute(triggerSel, 'aria-expanded'), 'true', 'the row still reports its menu open')
  })
})