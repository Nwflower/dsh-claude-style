/**
 * A hover-opened account menu stays up while the pointer travels from the row
 * into the card, and that holds while another host menu stands ahead of the
 * account card in the document. The row and the card are separate boxes, and
 * the card is held unpainted until it settles, so neither :hover nor
 * mouseenter can report the travel; the close grace reads the pointer's
 * position against the row and against the card the host anchored to the row.
 * A second test holds the placement moving so the unpainted window is
 * deterministic, and crosses the gap between the boxes inside it.
 *
 * @capability account-menu
 * @features account
 * @risk The menu folds the moment the pointer leaves the row for the card, so with hover-open on the reader can never reach a row to click it (#394, #451).
 */
import { spec } from '../../fixtures/behaviour.mjs'

/**
 * Another host menu, ahead of every card the account row can open: a card the
 * host keeps while it fades, or one a panel left open, anchored to a trigger
 * of its own. The first menu in the document is therefore not the account card.
 */
async function mountOtherMenu(t, positionAnchor) {
  await t.page.evaluate((property) => {
    const other = document.createElement('div')
    other.id = 'other-host-menu'
    other.setAttribute('role', 'menu')
    other.style.cssText = 'position:fixed;left:0;top:0;width:24px;height:24px'
    other.style.setProperty(property, '--dsh-menu-trigger-other')
    document.body.insertBefore(other, document.body.firstChild)
  }, positionAnchor)
}

/** Hover the row: the dwell opens the host's menu, and the skin stamps its card. */
async function hoverOpen(t, triggerSel, menuSel) {
  const row = await t.page.locator(triggerSel).boundingBox()
  await t.page.mouse.move(row.x + row.width / 2, row.y + row.height / 2)
  await t.page.waitForFunction(s => document.querySelector(s) !== null, menuSel, { timeout: 10000 })
}

export default spec({ page: 'desktop' }, ({ test }) => {
  test('the pointer travelling from the row into the card keeps the hover-opened menu up', async (t) => {
    await t.prefs({ autoPopover: 'all' })
    const triggerSel = t.host('shell.account-trigger')
    const menuSel = t.surface('account.menu')
    const anchorName = t.host('shell.menu-anchor-name')
    const positionAnchor = t.host('shell.menu-position-anchor')

    await mountOtherMenu(t, positionAnchor)
    await hoverOpen(t, triggerSel, menuSel)

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

  test('the pointer crossing the gap keeps the menu up through the unpainted window', async (t) => {
    await t.prefs({ autoPopover: 'all' })
    const triggerSel = t.host('shell.account-trigger')
    const menuSel = t.surface('account.menu')
    const readyAttr = t.surface.attribute('account.ready')
    const positionAnchor = t.host('shell.menu-position-anchor')

    await mountOtherMenu(t, positionAnchor)

    // Hold the card's placement and its reveal: the card stays mounted but
    // unpainted for the hold's whole duration, on every runner's clock.
    await t.page.evaluate(() => { window.__holdHostMenuPlacement = true })
    await hoverOpen(t, triggerSel, menuSel)
    // Read the settle state at the first moment after the mount, before any
    // other round-trip: the crossing starts inside the unpainted window.
    t.expectThat.equal(await t.read.attribute(menuSel, readyAttr), null, 'the crossing starts while the card is mounted but not yet settled')

    // The card grows when the skin's rows land and jumps to its placed box;
    // wait until it sits above the row rather than reading a box mid-growth.
    await t.page.waitForFunction(([ts, ms]) => {
      const trig = document.querySelector(ts)?.getBoundingClientRect()
      const card = document.querySelector(ms)?.getBoundingClientRect()
      return !!trig && !!card && card.bottom < trig.top
    }, [triggerSel, menuSel], { timeout: 10000 })

    // The air between the card's bottom edge and the row's top edge: a pointer
    // parked there is on neither box, and the hidden card reports no hover.
    const gap = await t.page.evaluate(([ts, ms]) => {
      const trig = document.querySelector(ts).getBoundingClientRect()
      const card = document.querySelector(ms).getBoundingClientRect()
      return { x: trig.left + trig.width / 2, y: (card.bottom + trig.top) / 2 }
    }, [triggerSel, menuSel])
    await t.page.mouse.move(gap.x, gap.y)

    // The close grace is 100ms; a wait of two and a half cycles lets it run
    // out at least twice with the pointer on neither box. The crossing started
    // inside the unpainted window, where no mouseenter can cancel the close,
    // so the geometric keep-alive is what holds the menu; a menu the defect
    // folded is gone by now.
    await t.page.waitForTimeout(250)
    t.expectThat.equal(await t.read.count(menuSel), 1, 'the card survives the crossing while it settles')
    t.expectThat.equal(await t.read.attribute(triggerSel, 'aria-expanded'), 'true', 'the row still reports its menu open')

    // Let the placement stand still and the card reveal; the crossing holds on.
    await t.page.evaluate(() => { window.__holdHostMenuPlacement = false })
    await t.page.waitForFunction(([s, a]) => document.querySelector(s)?.hasAttribute(a) === true, [menuSel, readyAttr], { timeout: 10000 })
    await t.settle()
    t.expectThat.equal(await t.read.count(menuSel), 1, 'the card survives the crossing after it settles')

    // A pointer genuinely elsewhere dismisses the menu.
    await t.page.mouse.move(gap.x + 400, gap.y - 300)
    await t.settle()
    t.expectThat.equal(await t.read.count(menuSel), 0, 'a departure beyond the region folds the account card')
    await t.page.evaluate(() => { document.getElementById('other-host-menu')?.remove() })
  })
})
