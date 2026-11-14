/**
 * A tool body's output arriving: a batch the page mounts on its own is never
 * replayed, the body a reader opens sweeps two rows at a time, a single line
 * arriving on its own is drawn at once, and nothing is left on a row once its
 * batch has landed.
 *
 * @capability tool-lines
 * @features chat-tool-lines
 * @risk The output of every tool call in a restored conversation replays line by line as the page opens, or the body a reader opens lands as one block with its rows never arriving.
 */
import { spec } from '../../fixtures/behaviour.mjs'

export default spec({ page: 'chat-tool-lines' }, ({ test }) => {
  test('a conversation arriving on its own stands still, and the body a press opens sweeps', async (t) => {
    const rows = t.host('chat.tool-output-row')
    const marked = `[${t.surface.attribute('chat.tool-line')}]`
    // The offsets the browser plays on the marked rows, in document order.
    const delays = () => t.page.evaluate((selector) => [...document.querySelectorAll(selector)].map((row) => row.getAnimations()
      .map((animation) => animation.effect === null ? null : Number(animation.effect.getComputedTiming().delay))
      .filter((delay) => delay !== null)[0] ?? null), marked)

    // The rows the page opened onto were never played.
    t.expectThat.equal(await t.read.count(marked), 0, 'the rows the page opens onto stand as the host drew them')
    t.expectThat.equal(await t.read.count(rows), 9, 'the fixture carries the rows of a terminal, a read card and both sides of a diff')

    // A batch nothing asked for: the page drawing a conversation. It stands.
    await t.page.evaluate((selector) => {
      const layer = document.querySelector(selector)?.parentElement
      const row = document.createElement('div')
      row.textContent = 'a restored line'
      layer?.append(row)
    }, rows)
    await t.settle()
    t.expectThat.equal(await t.read.count(marked), 0, 'a conversation the page mounts on its own is never replayed')

    // Four rows a press opened: two at a time, the pair after a pair.
    await t.page.evaluate((selector) => {
      const layer = document.querySelector(selector)?.parentElement
      if (layer === null) throw new Error('the fixture has no layer of rows to stream into')
      document.body.click()
      for (let index = 0; index < 4; index += 1) {
        const row = document.createElement('div')
        row.textContent = 'streamed line ' + index
        layer.append(row)
      }
    }, rows)
    await t.page.waitForFunction((selector) => document.querySelectorAll(selector).length === 4, marked, { timeout: 5000 })
    const sweep = await delays()
    t.expectThat.equal([sweep[0], sweep[1]], [0, 0], 'the first two rows of a chunk wait for nothing')
    t.expectThat.equal(sweep[2], sweep[3], 'the next two rows stand at one offset')
    t.expectThat.equal(sweep[2] > 0, true, 'the second chunk waits its turn')

    // The marks come off once the batch has landed: nothing is left on the rows.
    await t.page.waitForFunction((selector) => document.querySelectorAll(selector).length === 0, marked, { timeout: 5000 })
    t.expectThat.equal(await t.read.count(marked), 0, 'the arrival leaves no mark behind')

    // A line streaming in on its own is drawn at once: its mark is written
    // before the paint and its offset stands at nothing. The reading happens in
    // the page on the mutation that writes the mark, so a slow frame between the
    // append and the read cannot find the mark already gone.
    const single = await t.page.evaluate(([selector, attribute]) => new Promise((resolve) => {
      const layer = document.querySelector(selector)?.parentElement
      if (layer === null) {
        resolve('no layer')
        return
      }
      document.body.click()
      const row = document.createElement('div')
      row.textContent = 'one more line'
      const read = () => {
        const animation = row.getAnimations().find((one) => one.effect !== null)
        resolve(animation === undefined ? null : Number(animation.effect.getComputedTiming().delay))
      }
      const watch = new MutationObserver(() => {
        if (!row.hasAttribute(attribute)) return
        watch.disconnect()
        read()
      })
      watch.observe(row, { attributes: true, attributeFilter: [attribute] })
      layer.append(row)
      setTimeout(() => { watch.disconnect(); read() }, 2000)
    }), [rows, t.surface.attribute('chat.tool-line')])
    t.expectThat.equal(single, 0, 'a single line waits for nothing')
  })
})
