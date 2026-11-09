/**
 * While an answer streams, the written-back figure under the composer grows with
 * the text on the page at each character's rough token share, and each tool call
 * row adds its tool's price once. When the step settles, the host's own total
 * takes over and nothing it covers is counted again.
 *
 * @capability context-stats
 * @features context-stats
 * @risk While the model streams, the token figure under the composer stands still, jumps by the whole answer twice when the step settles, prices a write like a read, keeps its own model's error after its settlements showed it, or counts a sidebar preview or a re-rendered tool call as new output.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { readWrittenBackTokens, seatStreamingStatsSession } from '../../fixtures/stats-session.mjs'

/**
 * A streaming container of the host's, filled the way a stream fills it. The
 * estimate takes a container's first reading as a baseline and counts from the
 * next due one, so the container stands empty well past that interval first.
 */
async function stream(t, text, { inside = true, id = 'stream' } = {}) {
  await t.page.evaluate(async ([scroller, streaming, words, within, key]) => {
    const parent = within ? document.querySelector(scroller) : document.body
    let container = document.getElementById(key)
    if (container === null) {
      container = document.createElement('div')
      container.id = key
      container.setAttribute(streaming, '')
      parent.append(container)
    }
    // Empty well past the reading interval: the first piece's batch then stands as
    // a due reading over that piece alone, so a loaded machine still shows growth.
    await new Promise((resolve) => setTimeout(resolve, 1000))
    for (const piece of words.match(/[\s\S]{1,4}/g) ?? []) {
      container.append(piece)
      await new Promise((resolve) => setTimeout(resolve, 40))
    }
    // One more change a full interval after the last due reading: whatever the
    // frame that carried the first reading cost, this batch is due.
    await new Promise((resolve) => setTimeout(resolve, 900))
    container.append('')
    container.setAttribute('data-test-tick', String(Date.now()))
  }, [t.host('chat.scroller'), t.host('chat.streaming-attribute'), text, inside, id])
  await t.settle()
}

/** A tool call row of the host's, mounted in the conversation and naming `tool` when given. */
async function callRow(t, id, tool = null) {
  await t.page.evaluate(([scroller, call, toolAttribute, key, toolName]) => {
    const row = document.createElement('div')
    row.setAttribute(call, key)
    row.id = key
    if (toolName !== null) {
      const view = document.createElement('span')
      view.setAttribute(toolAttribute, toolName)
      row.append(view)
    }
    document.querySelector(scroller).append(row)
  }, [t.host('chat.scroller'), t.host.attribute('chat.call'), t.host('chat.call-tool-attribute'), id, tool])
  await t.settle()
}

export default spec({ page: 'stats-inline' }, ({ test }) => {
  test('streamed text grows the written-back figure by its token share, wide characters by more', async (t) => {
    await seatStreamingStatsSession(t)
    const settled = await readWrittenBackTokens(t)
    t.expectThat.equal(settled, 100, 'the line starts on the settled total')
    await stream(t, 'abcdefghijklmnopqrstuvwxyz0123')
    const narrow = (await readWrittenBackTokens(t)) - settled
    t.expectThat.equal(narrow > 0 && narrow < 30, true, `thirty narrow characters add some but fewer than thirty tokens (added ${narrow})`)
    await stream(t, '你好世界你好世界你好世界你好世界你好世界你好世界你好世界一二', { id: 'wide' })
    const wide = (await readWrittenBackTokens(t)) - settled - narrow
    t.expectThat.equal(wide > narrow, true, `thirty wide characters add more than thirty narrow ones (${wide} against ${narrow})`)
  })

  test('a settlement hands the figure to the host\'s total, and the text it covers is not counted again', async (t) => {
    await seatStreamingStatsSession(t)
    await stream(t, 'abcdefghijklmnopqrstuvwxyz0123456789')
    t.expectThat.equal((await readWrittenBackTokens(t)) > 100, true, 'the stream raised the figure')
    await t.page.evaluate(() => window.__pushStats('tokenUsage', { outputTokens: 120 }))
    await t.settle()
    t.expectThat.equal(await readWrittenBackTokens(t), 120, 'the figure is the host\'s settled total')
  })

  test('a step the figure overshot writes the next one lower', async (t) => {
    await seatStreamingStatsSession(t)
    const settled = await readWrittenBackTokens(t)
    await stream(t, '你好世界'.repeat(50))
    const first = (await readWrittenBackTokens(t)) - settled
    // The host settles forty tokens for that step, well under what the figure added.
    await t.page.evaluate(() => window.__pushStats('tokenUsage', { outputTokens: 140 }))
    await t.settle()
    await stream(t, '你好世界'.repeat(50), { id: 'second' })
    const second = (await readWrittenBackTokens(t)) - 140
    t.expectThat.equal(first > 40, true, `the first stream added its share (${first})`)
    t.expectThat.equal(second < first, true, `the lowered multiplier writes the second stream lower (${second} against ${first})`)
  })

  test('a call row counts its tool\'s own price, a write several times a read', async (t) => {
    await seatStreamingStatsSession(t)
    const settled = await readWrittenBackTokens(t)
    await callRow(t, 'call-read', 'read')
    await stream(t, 'e')
    const read = (await readWrittenBackTokens(t)) - settled
    await callRow(t, 'call-write', 'write')
    await stream(t, 'f')
    const write = (await readWrittenBackTokens(t)) - settled - read
    t.expectThat.equal(read > 0 && read < 120, true, `a read adds its own price (added ${read})`)
    t.expectThat.equal(write > 400, true, `a write adds several times a read (added ${write})`)
  })

  test('a call row counts once, however often the host re-renders it', async (t) => {
    await seatStreamingStatsSession(t)
    await stream(t, 'abcd')
    const before = await readWrittenBackTokens(t)
    await callRow(t, 'call-1', 'write')
    await stream(t, 'e')
    const withCall = await readWrittenBackTokens(t)
    t.expectThat.equal(withCall - before >= 400, true, `the call adds its tool's price (added ${withCall - before})`)
    await t.page.evaluate(() => {
      const row = document.getElementById('call-1')
      const parent = row.parentElement
      row.remove()
      parent.append(row)
    })
    await stream(t, 'f')
    t.expectThat.equal((await readWrittenBackTokens(t)) - withCall < 5, true, 'the re-rendered row is not counted again')
  })

  test('text streaming outside the shown conversation is not counted', async (t) => {
    await seatStreamingStatsSession(t)
    const settled = await readWrittenBackTokens(t)
    await stream(t, 'abcdefghijklmnopqrstuvwxyz0123456789', { inside: false, id: 'elsewhere' })
    t.expectThat.equal(await readWrittenBackTokens(t), settled, 'the figure keeps the settled total')
  })
})
