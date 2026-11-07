/**
 * The session's cost lands on the line even when the reader leaves the
 * conversation before the host's total arrives, and the answer the old
 * conversation asked for is not taken for the new one's.
 *
 * @capability context-stats
 * @features context-stats
 * @risk A switch during the first cost ask strands the total: the line keeps the currency's dash for the rest of the page's life.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { COST_PRICES as prices, COST_ROUTE as ROUTE, PRICED_STATS as stats, PRICED_USAGE as usage, seatStatsSession } from '../../fixtures/stats-session.mjs'

/** 12340 micro units of a yuan, as the line writes it. */
const TOTAL = { cny: 12340, usd: 1720, partial: false, model: ROUTE }
/** What the old conversation's answer carries; it must never reach the line. */
const STALE = { cny: 999000000, usd: 1, partial: false, model: ROUTE }

/**
 * Show one conversation id, then nudge a pass: the scheduler follows childList
 * changes, and this switch writes an attribute.
 */
async function showSession(t, id) {
  await t.page.evaluate(([attribute, next]) => {
    const host = document.querySelector(`[${attribute}]`)
    host.setAttribute(attribute, next)
    const nudge = document.createElement('span')
    document.body.appendChild(nudge)
    nudge.remove()
  }, [t.host('conversation.session-attribute'), id])
  await t.settle()
}

export default spec({ page: 'stats-inline' }, ({ test }) => {
  test('a switch during the cost ask still prices the conversation it lands on', async (t) => {
    await t.prefs({ motion: 'reduced' })
    await t.page.evaluate((priceDocument) => {
      window.__costRequests = []
      window.__costReleasers = []
      window.__costFixture = { prices: priceDocument, hold: true }
    }, prices)
    await seatStatsSession(t, stats, usage)
    await t.page.waitForFunction(() => (window.__costReleasers || []).length === 1, undefined, { timeout: 5000 })

    // The reader leaves the conversation while its total is still on the way,
    // and that total lands after the switch.
    await showSession(t, '')
    await t.page.evaluate((value) => window.__costReleasers[0](value), STALE)
    await t.settle()

    // Coming back asks again for the conversation now on screen.
    await showSession(t, 'smoke-stats')
    await t.page.waitForFunction(() => (window.__costReleasers || []).length === 2, undefined, { timeout: 5000 })
    const asked = await t.page.evaluate(() => window.__costRequests.filter((one) => one.id !== null).map((one) => one.id))
    t.expectThat.equal(asked, ['smoke-stats', 'smoke-stats'], 'both asks name the conversation on screen')

    await t.page.evaluate((value) => window.__costReleasers[1](value), TOTAL)
    await t.settle()
    t.expectThat.equal(await t.read.text(t.surface('stats.inline-cost')), '¥0.0123',
      'the settled total is written where the dash stood')
  })
})
