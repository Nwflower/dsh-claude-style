/**
 * Resting the mouse on the mascot opens a pixel bubble: the account balance
 * on top, and under it, quieter, what the conversation on screen has cost —
 * the same figure the statistics line prints. A press on the mascot closes
 * it, the switch keeps it shut, and with nothing to show there is no bubble.
 *
 * @capability mascot
 * @features mascot, context-stats
 * @risk Hovering the mascot shows nothing, shows a cost that disagrees with the statistics line, or leaves an empty bubble over the composer for a reader with no account and billing off.
 */
import { CONVERSATION_PARTS } from '@dsh-claude-style/engine/parts-table'
import { spec, host } from '../../fixtures/behaviour.mjs'
import { COST_PRICES, COST_ROUTE, PRICED_STATS, PRICED_USAGE, seatStatsSession } from '../../fixtures/stats-session.mjs'

/** The class stem the part walk marks as the composer's stack, which the crab stands on. */
const STACK_PART = Object.keys(CONVERSATION_PARTS).find((stem) => CONVERSATION_PARTS[stem] === 'composer-stack')

/** 12340 micro units of a yuan, which the statistics line writes as ¥0.0123. */
const TOTAL = { cny: 12340, usd: 1720, partial: false, model: COST_ROUTE }

/** The crab on a priced conversation, with the bubble's switch as given. */
async function pricedCrab(t, balanceOn) {
  await t.prefs({ motion: 'reduced', mascot: 'crab', mascotScope: 'all', mascotBalance: balanceOn })
  await t.page.evaluate(([prices, value]) => {
    window.__costFixture = { prices, value }
  }, [COST_PRICES, TOTAL])
  await seatStatsSession(t, PRICED_STATS, PRICED_USAGE)
  // The seated session column takes the composer seat and its stack, with
  // room above for the crab and its bubble inside the scroller.
  await t.page.evaluate(([session, scroller, seat, stackClass]) => {
    const column = document.querySelector(`[${session}="smoke-stats"]`)
    column.parentElement.setAttribute(scroller, '')
    column.parentElement.style.paddingTop = '160px'
    const seatBox = document.createElement('div')
    seatBox.setAttribute(seat, '')
    const stack = document.createElement('div')
    stack.className = stackClass
    stack.textContent = 'input'
    seatBox.append(stack)
    column.append(seatBox)
  }, [host('conversation.session-attribute'), host.attribute('chat.scroller'), host.attribute('composer.seat'), `_${STACK_PART}_x_1`])
  await t.page.waitForSelector(t.surface('mascot.crab-hit'), { timeout: 5000 })
  await t.page.waitForFunction((selector) => document.querySelector(selector)?.innerText.includes('0.0123'), t.surface('stats.inline-cost'), { timeout: 5000 })
}

/** The bubble's lines as the reader sees them: which line, its text, and its figures' colour. */
function readBubble(t) {
  return t.page.evaluate(([bubble, open, row, kind, figure]) => {
    const element = document.querySelector(bubble)
    if (element === null) return null
    return {
      open: element.hasAttribute(open),
      rows: [...element.querySelectorAll(row)].map((line) => ({
        kind: line.getAttribute(kind),
        text: line.innerText.replace(/\s+/g, ' ').trim(),
        colour: getComputedStyle(line.querySelector(figure)).color,
      })),
      font: getComputedStyle(element).fontFamily,
    }
  }, [t.surface('mascot.bubble'), t.surface.attribute('mascot.bubble-open'), t.surface('mascot.bubble-row'),
    t.surface.attribute('mascot.bubble-row-kind'), t.surface('mascot.bubble-figure')])
}

/** Rest the mouse on the crab, past the bubble's delay. */
async function restOnCrab(t) {
  await t.page.hover(t.surface('mascot.crab-hit'))
  await t.page.waitForTimeout(500)
}

export default spec({ page: 'stats-inline' }, ({ test }) => {
  test('resting on the crab shows the balance above the conversation\'s cost, the cost quieter and equal to the statistics line', async (t) => {
    await pricedCrab(t, true)
    await restOnCrab(t)
    const bubble = await readBubble(t)
    t.expectThat.equal(bubble?.open, true, 'the bubble opens')
    t.expectThat.equal(bubble.rows.map((line) => line.kind), ['balance', 'session'], 'the balance stands above the cost')
    t.expectThat.equal(bubble.rows[0].text.endsWith('¥12.34'), true, `the balance line carries the account's wallet (${bubble.rows[0].text})`)
    const line = await t.read.text(t.surface('stats.inline-cost'))
    t.expectThat.equal(bubble.rows[1].text.endsWith(line.trim()), true, `the cost is the statistics line's own figure (${bubble.rows[1].text} against ${line})`)
    t.expectThat.equal(bubble.rows[0].colour !== bubble.rows[1].colour, true, 'the cost takes a quieter ink than the balance')
    t.expectThat.equal(bubble.font.startsWith('"Claude Style Pixel"'), true, `the bubble is set in the pixel face (${bubble.font})`)

    await t.page.mouse.down()
    t.expectThat.equal((await readBubble(t)).open, false, 'a press on the crab closes the bubble')
    await t.page.mouse.up()
  })

  test('with the switch off, resting on the crab opens nothing', async (t) => {
    await pricedCrab(t, false)
    await restOnCrab(t)
    t.expectThat.equal((await readBubble(t))?.open ?? false, false, 'no bubble opens')
  })

  test('with no account and billing off, there is nothing to show and no bubble', async (t) => {
    await pricedCrab(t, true)
    await t.prefs({ billingCurrency: 'off' })
    await t.page.evaluate(() => { window.__balanceFixture = { ok: true, value: null } })
    await restOnCrab(t)
    t.expectThat.equal((await readBubble(t))?.open ?? false, false, 'no bubble opens')
  })
})
