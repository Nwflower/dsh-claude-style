/**
 * Folding keeps a stepped reasoning window's cap until the height animation has
 * settled, and rows inside a rolling container use their real layout.
 *
 * @capability reasoning-display
 * @features chat-fold,row-skip
 * @risk Removing the cap mid-roll re-lays out the whole step, and skipping a rolling row gives the fold an estimated height.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { EXPANDED_ATTRIBUTE, FLOW_KIND_ATTRIBUTE, ROW_PHASE_ATTRIBUTE, RUNNING_STATE, TOOL_CALL_KIND, WORKSPACE_ROW_EXPANDED_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'

export default spec({ page: 'chat-fold' }, ({ test }) => {
  test('the stepped window keeps its cap through the automatic fold and leaves after it', async (t) => {
    const window = t.surface('chat.reason-window')
    const capped = t.surface.attribute('chat.reason-capped')
    const rolling = t.surface.attribute('chat.rolling')
    const heightProperty = t.surface.property('chat.reason-window-height')
    await t.prefs({ chatAnimations: true, motion: 'full', reasoningDisplay: 'stepped' })
    await t.page.evaluate(([expanded, phase, running, aria]) => {
      const row = document.getElementById('debugGrow')
      const button = row.querySelector('button')
      row.setAttribute(phase, running)
      row.setAttribute(expanded, '')
      button.setAttribute(aria, 'true')
      button.addEventListener('click', () => {
        const open = row.hasAttribute(expanded)
        row.toggleAttribute(expanded, !open)
        button.setAttribute(aria, String(!open))
      })
      // The fold glide only takes controls inside the host's chat flow.
      document.getElementById('debugFlow').append(row)
    }, [EXPANDED_ATTRIBUTE, ROW_PHASE_ATTRIBUTE, RUNNING_STATE, WORKSPACE_ROW_EXPANDED_ATTRIBUTE])
    await t.page.waitForSelector('#debugGrow ' + window + '[' + capped + ']', { timeout: 5000 })
    // The fold owns the body's height for one roll, so the cap it starts from is a
    // value of that roll alone. A round trip that lands after the roll's own mark
    // can outlast the roll on a loaded runner, so the read is taken in the page, in
    // the task that marks the body, and kept for the assertion.
    await t.page.evaluate(([phase, selector, rollingAttribute, cappedAttribute, property]) => {
      window.__foldStart = null
      const body = document.getElementById('debugGrowBody')
      const observer = new MutationObserver(() => {
        if (!body.hasAttribute(rollingAttribute)) return
        observer.disconnect()
        const frame = document.querySelector(selector)
        const element = frame instanceof HTMLElement ? frame : null
        window.__foldStart = {
          height: element === null ? null : element.style.getPropertyValue(property),
          capped: element !== null && element.hasAttribute(cappedAttribute),
        }
      })
      observer.observe(body, { attributes: true, attributeFilter: [rollingAttribute] })
      document.getElementById('debugGrow')?.setAttribute(phase, 'ok')
    }, [ROW_PHASE_ATTRIBUTE, '#debugGrow ' + window, rolling, capped, heightProperty])
    const during = await t.page.waitForFunction(() => window.__foldStart ?? null, undefined, { timeout: 5000 })
    t.expectThat.equal(await during.jsonValue(), { height: '400px', capped: true }, 'the fold starts from one stable capped height')
    await t.page.waitForSelector('#debugGrow ' + window, { state: 'detached', timeout: 5000 })
    t.expectThat.equal(await t.page.locator('#debugGrow ' + window).count(), 0, 'the window leaves once the fold no longer owns the height')
  })

  test('a rolling ancestor suspends row skipping until the height animation leaves', async (t) => {
    const row = '#performanceToolRow'
    const laidOut = t.surface.attribute('row-skip.laid-out')
    const rolling = t.surface.attribute('chat.rolling')
    await t.page.evaluate(([kind, tool]) => {
      const element = document.createElement('div')
      element.id = 'performanceToolRow'
      element.setAttribute(kind, tool)
      element.textContent = 'tool output'
      document.getElementById('debugTurnFlow').append(element)
    }, [FLOW_KIND_ATTRIBUTE, TOOL_CALL_KIND])
    await t.page.waitForFunction(([selector, attribute]) => document.querySelector(selector)?.hasAttribute(attribute) === true, [row, laidOut])
    const read = () => t.page.evaluate((selector) => {
      const style = getComputedStyle(document.querySelector(selector))
      return { visibility: style.contentVisibility, intrinsic: style.containIntrinsicSize }
    }, row)
    const before = await read()
    t.expectThat.equal(before.visibility, 'auto', 'the laid-out row ordinarily skips off-screen layout')
    await t.page.evaluate((attribute) => { document.getElementById('debugTurnFlow')?.setAttribute(attribute, '') }, rolling)
    const during = await read()
    t.expectThat.equal(during.visibility, 'visible', 'the rolling row uses real layout')
    t.expectThat.equal(during.intrinsic, 'none', 'the rolling row carries no estimated height')
    await t.page.evaluate((attribute) => { document.getElementById('debugTurnFlow')?.removeAttribute(attribute) }, rolling)
    t.expectThat.equal((await read()).visibility, 'auto', 'the ordinary skipping rule returns with the row\'s settled layout')
  })
})
