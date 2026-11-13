/**
 * Resting the mouse on the mascot opens a pixel bubble: the account balance,
 * gifted wallets included, on top, and under it, quieter, what the
 * conversation on screen has cost — the same figure the statistics line
 * prints, with the balance carrying as many places and falling as that cost
 * grows. A press on the mascot
 * closes it, and with nothing to show there is no bubble.
 *
 * @capability mascot
 * @features mascot, context-stats, model
 * @risk Hovering the mascot shows nothing, shows a cost that disagrees with the statistics line, or leaves an empty bubble over the composer for a reader with no account and billing off.
 */
import { CONVERSATION_PARTS } from '@dsh-claude-style/engine/parts-table'
import { spec, host } from '../../fixtures/behaviour.mjs'
import { COST_PRICES, COST_ROUTE, PRICED_STATS, PRICED_USAGE, seatStatsSession } from '../../fixtures/stats-session.mjs'

/** The class stem the part walk marks as the composer's stack, which the crab stands on. */
const STACK_PART = Object.keys(CONVERSATION_PARTS).find((stem) => CONVERSATION_PARTS[stem] === 'composer-stack')

/** 12340 micro units of a yuan, which the statistics line writes as ¥0.0123. */
const TOTAL = { cny: 12340, usd: 1720, partial: false, model: COST_ROUTE }

/** The crab on a priced conversation. */
async function pricedCrab(t) {
  await t.prefs({ motion: 'reduced', mascot: 'crab', mascotScope: 'all' })
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
  test('resting on the crab shows the balance above the conversation\'s cost, the cost quieter and equal to the statistics line, the balance falling as it grows', async (t) => {
    await pricedCrab(t)
    // The platform's own long decimals, and a gifted wallet beside the topped-up one.
    await t.page.evaluate(() => {
      window.__balanceFixture = { ok: true, value: { status: 'ready', value: [{ currency: 'CNY', balance: '1.6062994000000000' }], bonusWallets: [{ currency: 'CNY', balance: '10.00' }] } }
    })
    await restOnCrab(t)
    const bubble = await readBubble(t)
    t.expectThat.equal(bubble?.open, true, 'the bubble opens')
    t.expectThat.equal(bubble.rows.map((line) => line.kind), ['balance', 'session'], 'the balance stands above the cost')
    t.expectThat.equal(bubble.rows[0].text.endsWith('¥11.6063'), true,
      `the balance counts the gifted wallet in and carries the cost's four places (${bubble.rows[0].text})`)
    const line = await t.read.text(t.surface('stats.inline-cost'))
    t.expectThat.equal(bubble.rows[1].text.endsWith(line.trim()), true, `the cost is the statistics line's own figure (${bubble.rows[1].text} against ${line})`)
    t.expectThat.equal(bubble.rows[0].colour !== bubble.rows[1].colour, true, 'the cost takes a quieter ink than the balance')
    t.expectThat.equal(bubble.font.startsWith('"Claude Style Pixel"'), true, `the bubble is set in the pixel face (${bubble.font})`)

    // The conversation settles ¥0.1 more while the bubble stands open: the
    // balance falls by as much without asking the platform again.
    await t.page.waitForTimeout(1600)
    await t.page.evaluate(([value, usage]) => {
      window.__costFixture.value = value
      window.__pushStats('tokenUsage', usage)
    }, [{ ...TOTAL, cny: TOTAL.cny + 100000 }, PRICED_USAGE])
    await t.page.waitForFunction((selector) => document.querySelector(selector)?.innerText.includes('0.1123'), t.surface('stats.inline-cost'), { timeout: 5000 })
    const spent = await readBubble(t)
    t.expectThat.equal(spent.rows.map((line) => line.text.split(' ').pop()), ['¥11.5063', '¥0.1123'],
      'the balance falls by what the conversation spent since it was read')

    await t.page.mouse.down()
    t.expectThat.equal((await readBubble(t)).open, false, 'a press on the crab closes the bubble')
    await t.page.mouse.up()
  })

  test('an external provider keeps the session estimate without the platform balance, and either platform route restores the balance', async (t) => {
    await pricedCrab(t)
    await t.page.evaluate(async (model) => {
      window.__balanceFixture = { ok: true, value: { status: 'ready', value: [{ currency: 'CNY', balance: '10.00' }], bonusWallets: [] } }
      await window.__dshSmokeHost.modelDirectories.directoryFor('smoke-stats').select({ provider: 'gateway', model })
    }, COST_ROUTE)
    await restOnCrab(t)
    const external = await readBubble(t)
    t.expectThat.equal(external.rows.map((line) => line.kind), ['session'], 'an external route shows only its session estimate')
    t.expectThat.equal(external.rows[0].text.endsWith('¥0.0123'), true, 'the estimate remains priced for the same model id')

    for (const provider of ['deepseek-official', 'deepseek-account']) {
      await t.page.evaluate(async ([provider, model]) => {
        await window.__dshSmokeHost.modelDirectories.directoryFor('smoke-stats').select({ provider, model })
        window.__pushStats('tokenUsage', {})
      }, [provider, COST_ROUTE])
      await t.page.waitForFunction(([bubble, row, kind]) => document.querySelector(bubble)?.querySelector(`${row}[${kind}="balance"]`),
        [t.surface('mascot.bubble'), t.surface('mascot.bubble-row'), t.surface.attribute('mascot.bubble-row-kind')], { timeout: 5000 })
      t.expectThat.equal((await readBubble(t)).rows.map((line) => line.kind), ['balance', 'session'], `${provider} restores the platform balance`)
    }
  })

  test('with no account and billing off, there is nothing to show and no bubble', async (t) => {
    await pricedCrab(t)
    await t.prefs({ billingCurrency: 'off' })
    await t.page.evaluate(() => { window.__balanceFixture = { ok: true, value: null } })
    await restOnCrab(t)
    t.expectThat.equal((await readBubble(t))?.open ?? false, false, 'no bubble opens')
  })
})
