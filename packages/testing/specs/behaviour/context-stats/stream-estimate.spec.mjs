/**
 * The written-back figure's full readings ride on the interval the estimate
 * declares (#211): each one walks every streaming container's text, so the
 * readings between a stream's first and its settlement answer structure alone
 * and mid-window text does not move the figure. Around that window everything
 * stays immediate: the very first reading, and a settlement's correction,
 * which lands on the next frame whatever the window says. The window itself
 * is judged on the page's own clock, the one allowance a duration gets.
 *
 * @capability context-stats
 * @features context-stats
 * @risk During a long answer the token figure under the composer flickers with every token's arrival, burning a layout walk per flick; or, at the answer's end, the settled total waits a full window before it shows.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { readWrittenBackTokens, seatStreamingStatsSession } from '../../fixtures/stats-session.mjs'

/**
 * An empty streaming container of the host's inside the conversation, mounted
 * long enough for the estimate's next reading — due at its first ask — to
 * stand as the container's baseline. Returns the page clock at the tick that
 * took the reading.
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
    // Text lands; then, a batch driven inside the window — after the old
    // 100 ms answer would have scanned, before this one's 800 ms does. The
    // pass it triggers is not a due reading here: the figure stands.
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
    // A batch past the window is the next due reading: it counts the text.
    await t.page.evaluate((wait) => new Promise((resolve) => setTimeout(resolve, wait)), 700)
    await tick(t)
    const grown = await readWrittenBackTokens(t)
    t.expectThat.equal(grown !== null && grown > 100, true, 'the due reading counts the text the window held')
  })
  test('a settlement is corrected on the next frame, inside the window', async (t) => {
    await seatStreamingStatsSession(t)
    const at = await baselineContainer(t)
    await landText(t, 'abcdefghijklmnopqrst')
    t.expectThat.equal(await readWrittenBackTokens(t), 100, 'mid-window text does not move the figure')
    // The answer's step settles while the window is still open. The
    // settlement makes the next reading due whatever the clock says, and the
    // host's own total takes over on the very next frame.
    const pushedAt = await t.page.evaluate(() => {
      window.__pushStats('tokenUsage', { outputTokens: 130 })
      return performance.now()
    })
    const settled = await readWrittenBackTokens(t)
    const readAt = await t.page.evaluate(() => performance.now())
    t.expectThat.equal(settled, 130, "the figure is the host's settled total on the next frame")
    t.expectThat.equal(readAt - pushedAt < 800, true, 'the correction lands inside the window')
    t.expectThat.equal(readAt - at >= 0, true, 'the reading answers after the baseline')
  })
})
