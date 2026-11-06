/**
 * The stand-in's statistics session, seated the way the host seats it (D86):
 * the composer card and its dock move into the active phase's session column,
 * whose id is the one the stand-in's projections answer for, and the two
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

export { seatStatsSession, seatStreamingStatsSession, readWrittenBackTokens }
