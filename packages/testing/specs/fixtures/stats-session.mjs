/** The one route the stand-in's cost fixture prices. */
const COST_ROUTE = 'smoke-model'

/** A price document that prices COST_ROUTE alone, the same at every hour, for `window.__costFixture`. */
const COST_PRICES = {
  schemaVersion: 1,
  updatedAt: '2026-10-22',
  schedule: { timeZone: 'UTC', peakDays: [], peakWindows: [], holidays: [] },
  models: {
    [COST_ROUTE]: {
      CNY: { offPeak: { cacheHit: 1, cacheMiss: 2, output: 4 }, peak: { cacheHit: 1, cacheMiss: 2, output: 4 } },
      USD: { offPeak: { cacheHit: 0.1, cacheMiss: 0.2, output: 0.4 }, peak: { cacheHit: 0.1, cacheMiss: 0.2, output: 0.4 } },
    },
  },
  aliases: {},
  catalog: {},
}

/** A settled session the cost lines price: its statistics and its billed tokens. */
const PRICED_STATS = { turns: 2, steps: 20, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 10000, decodeTokens: 1000 }
const PRICED_USAGE = { uncachedInputTokens: 1000, cacheReadTokens: 9000, cacheWriteTokens: 0, outputTokens: 100 }

/**
 * The stand-in's statistics session, seated the way the host seats it (D92):
 * the card and its dock move into the active phase's session column, and both
 * projections land their first readings.
 */
async function seatStatsSession(t, stats, usage) {
  await t.page.evaluate(([card, phase, session, statsValue, usageValue]) => {
    const element = document.querySelector(card)
    const dock = element.nextElementSibling
    const wrapper = document.createElement('div')
    wrapper.setAttribute(phase, 'active')
    const column = document.createElement('div')
    column.setAttribute(session, 'smoke-stats')
    element.parentElement.insertBefore(wrapper, element)
    wrapper.append(column)
    column.append(element, dock)
    window.__pushStats('sessionStats', statsValue)
    window.__pushStats('tokenUsage', usageValue)
  }, [t.host('composer.card'), t.host('shell.phase'), t.host('conversation.session-attribute'), stats, usage])
  await t.settle()
}

/** The standard streaming session: reduced motion and 100 settled output tokens. */
async function seatStreamingStatsSession(t) {
  await t.prefs({ motion: 'reduced' })
  await seatStatsSession(t,
    { turns: 1, steps: 1, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 1000, decodeTokens: 100 },
    { uncachedInputTokens: 1000, cacheReadTokens: 9000, cacheWriteTokens: 0, outputTokens: 100 })
}

/** Read the settled output figure after the down arrow in the inline statistics. */
async function readWrittenBackTokens(t) {
  const text = await t.read.text(t.surface('stats.inline-line'))
  const figure = /↓\s*([\d,]+)/.exec(text ?? '')
  return figure === null ? null : Number(figure[1].replace(/,/g, ''))
}

export { COST_ROUTE, COST_PRICES, PRICED_STATS, PRICED_USAGE, seatStatsSession, seatStreamingStatsSession, readWrittenBackTokens }
