/**
 * User-message folding follows structural changes without depending on a scan
 * of every assistant-text update.
 *
 * @capability message-fold
 * @features chat-fold
 * @risk A user message arrives or its bubble is replaced while content-only passes are skipped, leaving a long message uncapped or leaving its old fold control behind.
 */
import { spec } from '../../fixtures/behaviour.mjs'

export default spec({ page: 'chat-fold' }, ({ test }) => {
  test('new, replaced and reattached user bubbles keep exactly one fold control', async (t) => {
    await t.prefs({ chatAnimations: true, motion: 'full', reasoningDisplay: 'continuous' })
    const scroller = t.host('chat.scroller')
    const flowAttribute = t.host.attribute('chat.flow')
    const kindAttribute = t.host('chat.user-row')
    const streamingAttribute = t.host('chat.streaming-attribute')
    const bubbleAttribute = t.host.attribute('chat.message-bubble')
    const foldAttribute = t.surface.attribute('chat.message-fold')
    const toggle = t.surface('chat.message-fold-toggle')
    await t.page.evaluate(([scrollerSelector, flow, kind, bubble]) => {
      const column = document.createElement('div')
      column.setAttribute(flow, '')
      const row = document.createElement('div')
      row.setAttribute(kind, 'user')
      const message = document.createElement('div')
      message.setAttribute(bubble, '')
      for (let index = 0; index < 30; index += 1) {
        const line = document.createElement('div')
        line.style.height = '24px'
        line.textContent = `A long user message line ${index}`
        message.append(line)
      }
      row.append(message)
      column.append(row)
      document.querySelector(scrollerSelector).prepend(column)
      window.__messageFoldFixture = { column, row, message }
    }, [scroller, flowAttribute, kindAttribute, bubbleAttribute])

    const folded = () => t.page.evaluate((attribute) => window.__messageFoldFixture.message.hasAttribute(attribute), foldAttribute)
    await t.page.waitForSelector(toggle, { timeout: 5000 })
    t.expectThat.equal(await t.page.locator(toggle).count(), 1, 'the new long message gets one control')
    t.expectThat.equal(await folded(), true, 'the new long message is capped')

    await t.page.evaluate((attribute) => {
      const fixture = window.__messageFoldFixture
      const replacement = fixture.message.cloneNode(true)
      replacement.removeAttribute(attribute)
      fixture.message.replaceWith(replacement)
      fixture.message = replacement
    }, foldAttribute)
    await t.page.waitForFunction((attribute) => window.__messageFoldFixture.message.hasAttribute(attribute), foldAttribute, { timeout: 5000 })
    t.expectThat.equal(await t.page.locator(toggle).count(), 1, 'replacing the bubble carries no old control over')

    await t.page.evaluate(() => {
      const fixture = window.__messageFoldFixture
      fixture.row.remove()
    })
    await t.settle()
    await t.page.evaluate(() => {
      const fixture = window.__messageFoldFixture
      fixture.column.append(fixture.row)
    })
    await t.settle()
    t.expectThat.equal(await t.page.locator(toggle).count(), 1, 'reattaching the row rebuilds one control')
    t.expectThat.equal(await folded(), true, 'the reattached message is measured again')

    await t.page.evaluate(([kind, streaming]) => {
      const answer = document.createElement('div')
      answer.setAttribute(kind, 'assistant-step')
      answer.setAttribute(streaming, '')
      window.__messageFoldFixture.column.append(answer)
      window.__messageFoldFixture.answer = answer
    }, [kindAttribute, streamingAttribute])
    for (let index = 0; index < 3; index += 1) {
      await t.page.evaluate((index) => {
        window.__messageFoldFixture.answer.textContent += ` streamed ${index}`
      }, index)
      await t.settle()
      t.expectThat.equal(await t.page.locator(toggle).count(), 1, 'assistant growth leaves the user control alone')
      t.expectThat.equal(await folded(), true, 'assistant growth preserves the user message state')
    }
    await t.page.evaluate(() => {
      window.__messageFoldFixture.column.remove()
      delete window.__messageFoldFixture
    })
  })
})
