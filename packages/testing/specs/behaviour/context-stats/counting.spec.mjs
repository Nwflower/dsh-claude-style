/**
 * The line of statistics under the composer counts from the figures it shows
 * to a new reading over a few frames, and writes the reading at once when the
 * reader asked for reduced motion.
 *
 * @capability context-stats
 * @features context-stats
 * @risk Figures under the composer jump around, count backwards, or — for a reader who asked for reduced motion — keep rolling every time a turn lands.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { seatStatsSession } from '../../fixtures/stats-session.mjs'

/** The stand-in's session, on 2 turns and 100 tokens written back. */
const seatSession = (t) => seatStatsSession(t,
  { turns: 2, steps: 20, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 10000, decodeTokens: 1000 },
  { uncachedInputTokens: 1000, cacheReadTokens: 9000, cacheWriteTokens: 0, outputTokens: 100 })

/**
 * Land a new reading of 22 turns and record the turns figure — the line's first
 * figure, in whichever language the host speaks — on every frame until it
 * reaches the reading, then until the page settles. The count paints its own
 * frames and asks the scheduler for no pass, so the settle rule alone would
 * stop reading while it still travels.
 */
async function turnsWhileLanding(t) {
  return t.page.evaluate(async (line) => {
    const turns = () => {
      const text = document.querySelector(line)?.innerText ?? ''
      return Number(/\d[\d,]*/.exec(text)?.[0]?.replace(/,/g, '') ?? NaN)
    }
    window.__pushStats('sessionStats', { turns: 22, steps: 220 })
    const counting = await window.__dshSmokeProbe.until(turns, (readings) => readings.at(-1) === 22, 'the turns figure to reach the new reading')
    return counting.concat(await window.__dshSmokeProbe.watch(turns))
  }, t.surface('stats.inline-line'))
}

export default spec({ page: 'stats-inline' }, ({ test }) => {
  test('a new reading is counted to from the figure on show, never backwards', async (t) => {
    await seatSession(t)
    const turns = await turnsWhileLanding(t)
    t.expectThat.equal(turns[0], 2, 'the line starts on the figure it showed')
    t.expectThat.equal(turns.at(-1), 22, 'the line ends on the new reading')
    t.expectThat.sequenceMonotonic(turns, 'the turns figure counts up')
    t.expectThat.equal(turns.some((value) => value > 2 && value < 22), true, 'the count passes through the figures between')
  })

  test('under reduced motion a new reading is written at once', async (t) => {
    await t.prefs({ motion: 'reduced' })
    await seatSession(t)
    const turns = await turnsWhileLanding(t)
    t.expectThat.equal(turns.filter((value) => value > 2 && value < 22), [], 'no figure between the two readings is ever shown')
    t.expectThat.equal(turns.at(-1), 22, 'the line shows the new reading')
  })

  /**
   * The session's cost is a segment of the line in its own place: between the
   * written-back tokens and the cache share, standing as the currency symbol
   * and a dash until the host prices the session.
   */
  test('the session cost is a segment of the line, ahead of the cache share', async (t) => {
    await t.prefs({ motion: 'reduced' })
    await seatSession(t)
    const order = await t.page.evaluate(([line, cost]) => {
      const root = document.querySelector(line)
      const figure = root === null ? null : root.querySelector(cost)
      if (root === null || figure === null || figure.parentElement === null) return null
      const segments = [...root.children]
      const index = segments.indexOf(figure.parentElement)
      return {
        index,
        last: segments.length - 1,
        hidden: figure.parentElement.hidden,
        text: figure.textContent,
      }
    }, [t.surface('stats.inline-line'), t.surface('stats.inline-cost')])
    t.expectThat.equal(order !== null && order.index > 0 && order.index < order.last, true,
      `the cost stands between the tokens and the cache share (${JSON.stringify(order)})`)
    t.expectThat.equal(order === null ? null : order.hidden, false, 'the segment keeps its place')
    t.expectThat.equal(order === null ? null : order.text, '¥—', 'no price snapshot answered, so the segment stands as a dash')
  })

  /** The reader can take billing off: the segment is not drawn and nothing is asked. */
  test('with billing off the cost segment is not drawn', async (t) => {
    await t.prefs({ motion: 'reduced', billingCurrency: 'off' })
    await seatSession(t)
    const hidden = await t.page.evaluate(([line, cost]) => {
      const root = document.querySelector(line)
      const figure = root === null ? null : root.querySelector(cost)
      return figure === null ? null : figure.parentElement.hidden
    }, [t.surface('stats.inline-line'), t.surface('stats.inline-cost')])
    t.expectThat.equal(hidden, true, 'billing off hides the segment')
  })
})
