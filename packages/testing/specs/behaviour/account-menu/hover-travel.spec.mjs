/**
 * A hover-opened account menu stays up while the pointer travels from the row
 * into the card, and that holds while another host menu stands ahead of the
 * account card in the document. The row and the card are separate boxes, and
 * the card is held unpainted until it settles, so neither :hover nor
 * mouseenter can report the travel; the close grace reads the pointer's
 * position against the row and against the card the host anchored to the row.
 *
 * @capability account-menu
 * @features account
 * @risk The menu folds the moment the pointer leaves the row for the card, so with hover-open on the reader can never reach a row to click it (#394, #451).
 */
import { spec } from '../../fixtures/behaviour.mjs'

export default spec({ page: 'desktop' }, ({ test }) => {
  test('the pointer travelling from the row into the card keeps the hover-opened menu up', async (t) => {
    await t.prefs({ autoPopover: 'all' })
    const triggerSel = t.host('shell.account-trigger')
    const menuSel = t.surface('account.menu')
    const anchorName = t.host('shell.menu-anchor-name')
    const positionAnchor = t.host('shell.menu-position-anchor')

    // Another host menu, ahead of every card the account row can open: a card
    // the host keeps while it fades, or one a panel left open, anchored to a
    // trigger of its own. The first menu in the document is therefore not the
    // account card.
    await t.page.evaluate((property) => {
      const other = document.createElement('div')
      other.id = 'other-host-menu'
      other.setAttribute('role', 'menu')
      other.style.cssText = 'position:fixed;left:0;top:0;width:24px;height:24px'
      other.style.setProperty(property, '--dsh-menu-trigger-other')
      document.body.insertBefore(other, document.body.firstChild)
    }, positionAnchor)

    // Hover the row: the dwell opens the host's menu.
    const row = await t.page.locator(triggerSel).boundingBox()
    await t.page.mouse.move(row.x + row.width / 2, row.y + row.height / 2)
    await t.page.waitForFunction(s => document.querySelector(s) !== null, menuSel, { timeout: 10000 })

    const marked = await t.page.evaluate(([ts, ms, name, position]) => {
      const card = document.querySelector(ms)
      return {
        other: card.id === 'other-host-menu',
        anchored: card.style.getPropertyValue(position) === document.querySelector(ts).parentElement.style.getPropertyValue(name)
      }
    }, [triggerSel, menuSel, anchorName, positionAnchor])
    t.expectThat.equal(marked.other, false, 'the other host menu is not taken for the account card')
    t.expectThat.equal(marked.anchored, true, 'the account card is the one the host anchored to the row')

    // Into the card at once, while it may still be settling unpainted: the
    // pointer rests on the card's first row, a box away from the row.
    const target = await t.page.evaluate(([ts, ms]) => {
      const trig = document.querySelector(ts).getBoundingClientRect()
      const card = document.querySelector(ms).getBoundingClientRect()
      return { x: card.left + card.width / 2, y: card.top + Math.min(16, card.height / 2), apart: card.bottom < trig.top }
    }, [triggerSel, menuSel])
    t.expectThat.equal(target.apart, true, 'the card opens above its row, leaving a gap to cross')
    await t.page.mouse.move(target.x, target.y, { steps: 4 })

    // The close grace runs out inside this settle: a menu the defect folded is
    // gone by now, while the keep-alive holds this one with the pointer on it.
    await t.settle()
    t.expectThat.equal(await t.read.count(menuSel), 1, 'the card survives the pointer travelling into it')
    t.expectThat.equal(await t.read.attribute(triggerSel, 'aria-expanded'), 'true', 'the row still reports its menu open')
    t.expectThat.equal(await t.page.evaluate(() => document.getElementById('other-host-menu') !== null), true, 'the other host menu is left standing')
  })
})
