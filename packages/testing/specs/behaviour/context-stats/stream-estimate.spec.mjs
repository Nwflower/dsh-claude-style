/**
 * The written-back figure's full readings ride on the interval the estimate
 * declares (#211): every reading walks each streaming container's text, so a
 * batch inside the window answers structure alone. The first reading and a
 * settlement's correction stay immediate; the window is judged on the page clock.
 *
 * @capability context-stats
 * @features context-stats
 * @risk During a long answer the token figure under the composer flickers with every token's arrival, burning a layout walk per flick; or, at the answer's end, the settled total waits a full window before it shows.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { readWrittenBackTokens, seatStreamingStatsSession } from '../../fixtures/stats-session.mjs'

/**
 * An empty streaming container of the host's, mounted long enough for the
 * estimate's next reading to stand as its baseline. Returns the page clock at
 * the tick that took the reading.
 */
async function baselineContainer(t) {
  return t.page.evaluate(async ([scroller, streaming]) => {
    const parent = document.querySelector(scroller)
    const container = document.createElement('div')
    container.setAttribute(streaming, '')
    parent.append(container)
    // Past the reading interval, so the tick's batch is a due reading over an
    // empty container: the baseline the growth below is counted from.
    await new Promise((resolve) => setTimeout(resolve, 1000))
    container.append('')
    container.setAttribute('data-test-tick', String(Date.now()))
    return performance.now()
  }, [t.host('chat.scroller'), t.host('chat.streaming-attribute')])
}

/** A word of text on the page, the way a stream lands it. */
async function landText(t, text) {
  return t.page.evaluate(async ([word]) => {
    const container = document.querySelector('[data-test-tick]')
    container.append(word)
    await new Promise((resolve) => setTimeout(resolve, 30))
    return performance.now()
  }, [text])
}

/** A tick the way a stream keeps arriving, answered with the page clock. */
async function tick(t) {
  return t.page.evaluate(() => {
    const container = document.querySelector('[data-test-tick]')
    container.append('')
    container.setAttribute('data-test-tick', String(Date.now()))
    return performance.now()
  })
}

export default spec({ page: 'stats-inline' }, ({ test }) => {
  test('between two readings the figure stands: a batch inside the window scans nothing, on the page clock', async (t) => {
    await seatStreamingStatsSession(t)
    const at = await baselineContainer(t)
    t.expectThat.equal(await readWrittenBackTokens(t), 100, 'the baseline over an empty container adds nothing')
    // Text lands; then a batch driven inside the window, before the new answer's
    // reading is due. The pass it triggers is not a due reading: the figure stands.
    await landText(t, 'abcdefghijklmnopqrst')
    const mid = await t.page.evaluate(async ([from, line]) => {
      const container = document.querySelector('[data-test-tick]')
      while (performance.now() - from < 350) await new Promise((resolve) => setTimeout(resolve, 25))
      container.append('')
      container.setAttribute('data-test-tick', String(Date.now()))
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 30)))
      return { at: performance.now() - from, text: document.querySelector(line)?.innerText ?? '' }
    }, [at, t.surface('stats.inline-line')])
    const midFigure = /↓\s*([\d,]+)/.exec(mid.text)
    t.expectThat.equal(mid.at < 800, true, `the inside batch came within the window (${Math.round(mid.at)} ms)`)
    t.expectThat.equal(midFigure === null ? null : Number(midFigure[1].replace(/,/g, '')), 100,
      'inside the window the figure stands on the settled total')
    // A batch past the window is the next due reading. The tick only queues that
    // pass, so the figure is read once the page has settled on it.
    await t.page.evaluate((wait) => new Promise((resolve) => setTimeout(resolve, wait)), 700)
    await tick(t)
    await t.settle()
    const grown = await readWrittenBackTokens(t)
    t.expectThat.equal(grown !== null && grown > 100, true, 'the due reading counts the text the window held')
  })
  test('a settlement is corrected on the next frame, inside the window', async (t) => {
    await seatStreamingStatsSession(t)
    const at = await baselineContainer(t)
    await landText(t, 'abcdefghijklmnopqrst')
    t.expectThat.equal(await readWrittenBackTokens(t), 100, 'mid-window text does not move the figure')
    // The answer's step settles while the window is still open: the settlement
    // makes the next reading due, and the host's total takes over on the next frame.
    const pushedAt = await t.page.evaluate(() => {
      window.__pushStats('tokenUsage', { outputTokens: 130 })
      return performance.now()
    })
    // The skin answers the push in a scheduler pass, which is a frame's work:
    // read after it, never race the read against it.
    await t.page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined)))))
    const settled = await readWrittenBackTokens(t)
    const readAt = await t.page.evaluate(() => performance.now())
    t.expectThat.equal(settled, 130, "the figure is the host's settled total on the next frame")
    t.expectThat.equal(readAt - pushedAt < 800, true, 'the correction lands inside the window')
    t.expectThat.equal(readAt - at >= 0, true, 'the reading answers after the baseline')
  }, { frames: true })
})
