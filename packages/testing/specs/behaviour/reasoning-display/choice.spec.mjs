/**
 * The reasoning display choice: continuous text keeps the host's own Markdown,
 * while the optional stepped window arrives and leaves with its preference.
 *
 * @capability reasoning-display
 * @features chat-fold
 * @risk The reader cannot restore continuous reasoning, or switching modes leaves a clipped, masked or translated row behind.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { EXPANDED_ATTRIBUTE, ROW_PHASE_ATTRIBUTE, RUNNING_STATE } from '@dsh-claude-style/contracts/dom'

export default spec({ page: 'chat-fold' }, ({ test }) => {
  test('continuous and stepped reasoning switch without leaving a window behind', async (t) => {
    const row = t.host('chat.think-row')
    const text = t.host('chat.reasoning-text')
    const window = t.surface('chat.reason-window')
    const capped = t.surface.attribute('chat.reason-capped')
    await t.prefs({ chatAnimations: true, motion: 'full', reasoningDisplay: 'continuous' })
    await t.page.evaluate(([rowSelector, phase, running, expanded]) => {
      const row = document.querySelector(rowSelector)
      row?.setAttribute(phase, running)
      row?.setAttribute(expanded, '')
    }, [row, ROW_PHASE_ATTRIBUTE, RUNNING_STATE, EXPANDED_ATTRIBUTE])
    await t.settle()
    t.expectThat.equal(await t.page.locator(window).count(), 0, 'continuous reasoning creates no window')

    await t.prefs({ reasoningDisplay: 'stepped' })
    await t.page.waitForSelector(window, { timeout: 5000 })
    await t.page.evaluate(([rowSelector, textSelector, phase, running]) => {
      const row = document.querySelector(rowSelector)
      const text = document.querySelector(textSelector)
      if (text === null) throw new Error('the fixture has no reasoning text')
      for (let index = 0; index < 40; index += 1) text.append(document.createElement('br'), document.createTextNode(`reasoning line ${index}`))
      row?.setAttribute(phase, 'ok')
      row?.setAttribute(phase, running)
    }, [row, text, ROW_PHASE_ATTRIBUTE, RUNNING_STATE])
    await t.page.waitForFunction(([windowSelector, attribute]) => {
      const window = document.querySelector(windowSelector)
      return window !== null && window.hasAttribute(attribute)
    }, [window, capped], { timeout: 5000 })
    t.expectThat.equal(await t.page.locator(window).count() > 0, true, 'the stepped choice installs its window')

    await t.prefs({ reasoningDisplay: 'continuous' })
    await t.page.waitForSelector(window, { state: 'detached', timeout: 5000 })
    t.expectThat.equal(await t.page.locator(`[${capped}]`).count(), 0, 'the capped mark leaves with the window')
    const transform = await t.page.locator(text).first().evaluate((element) => getComputedStyle(element).transform)
    t.expectThat.equal(transform, 'none', 'the host text keeps no offset from the stepped window')
  })
})
