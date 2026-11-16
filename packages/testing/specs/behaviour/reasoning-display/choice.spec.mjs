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
    const heightProperty = t.surface.property('chat.reason-window-height')
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
    const natural = await t.page.evaluate(([windowSelector, textSelector, heightProperty]) => {
      const frame = document.querySelector(windowSelector)
      const content = frame?.querySelector(textSelector)
      if (!(frame instanceof HTMLElement) || !(content instanceof HTMLElement)) return null
      return {
        heightProperty: frame.style.getPropertyValue(heightProperty),
        willChange: getComputedStyle(content).willChange,
        difference: Math.abs(frame.getBoundingClientRect().height - content.getBoundingClientRect().height),
      }
    }, [window, text, heightProperty])
    t.expectThat.equal(natural?.heightProperty, '', 'below the cap the window keeps its natural height without an inline height')
    t.expectThat.equal(natural?.willChange, 'auto', 'below the cap the text reserves no compositor layer')
    t.expectThat.equal((natural?.difference ?? Infinity) <= 1, true, 'the natural window follows the text height')
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
    const cappedStyle = await t.page.evaluate(([windowSelector, textSelector, heightProperty]) => {
      const frame = document.querySelector(windowSelector)
      const content = frame?.querySelector(textSelector)
      return {
        heightProperty: frame instanceof HTMLElement ? frame.style.getPropertyValue(heightProperty) : null,
        willChange: content instanceof Element ? getComputedStyle(content).willChange : null,
      }
    }, [window, text, heightProperty])
    t.expectThat.equal(cappedStyle.heightProperty, '400px', 'the cap is the only fixed height the window writes')
    t.expectThat.equal(cappedStyle.willChange, 'transform', 'the compositor layer arrives with the capped steps')

    await t.prefs({ reasoningDisplay: 'continuous' })
    await t.page.waitForSelector(window, { state: 'detached', timeout: 5000 })
    t.expectThat.equal(await t.page.locator(`[${capped}]`).count(), 0, 'the capped mark leaves with the window')
    const transform = await t.page.locator(text).first().evaluate((element) => getComputedStyle(element).transform)
    t.expectThat.equal(transform, 'none', 'the host text keeps no offset from the stepped window')
  })

  test('a catch-up glides over the wait instead of snapping the backlog', async (t) => {
    const row = t.host('chat.think-row')
    const text = t.host('chat.reasoning-text')
    const window = t.surface('chat.reason-window')
    const capped = t.surface.attribute('chat.reason-capped')
    await t.prefs({ chatAnimations: true, motion: 'full', reasoningDisplay: 'stepped' })
    await t.page.evaluate(([rowSelector, phase, running, expanded]) => {
      const element = document.querySelector(rowSelector)
      element?.setAttribute(phase, running)
      element?.setAttribute(expanded, '')
    }, [row, ROW_PHASE_ATTRIBUTE, RUNNING_STATE, EXPANDED_ATTRIBUTE])
    await t.settle()
    // Record every written step with the glide time it was given, so the burst's
    // own catch-up is read wherever it lands instead of at a guessed moment.
    await t.page.evaluate(([textSelector]) => {
      const content = document.querySelector(textSelector)
      window.__glide = []
      let last = content.style.transform
      const sample = () => {
        const now = content.style.transform
        if (now !== last) { window.__glide.push({ from: last, to: now, dur: content.style.transitionDuration }); last = now }
        if (window.__glide.length < 400) requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    }, [text])
    // A burst far past the cap: the catch-up glides over the wait, not one snap.
    await t.page.evaluate(([rowSelector, textSelector, phase, running]) => {
      const element = document.querySelector(rowSelector)
      const content = document.querySelector(textSelector)
      for (let index = 0; index < 40; index += 1) content.append(document.createElement('br'), document.createTextNode(`reasoning line ${index}`))
      element?.setAttribute(phase, 'ok')
      element?.setAttribute(phase, running)
    }, [row, text, ROW_PHASE_ATTRIBUTE, RUNNING_STATE])
    await t.page.waitForFunction(([windowSelector, attribute]) => {
      const frame = document.querySelector(windowSelector)
      return frame !== null && frame.hasAttribute(attribute)
    }, [window, capped], { timeout: 5000 })
    await t.page.waitForTimeout(2000)
    const glide = await t.page.evaluate(([windowSelector, textSelector, stepProperty, holdProperty]) => {
      const frame = document.querySelector(windowSelector)
      const content = document.querySelector(textSelector)
      const style = getComputedStyle(frame)
      const ms = value => value.endsWith('ms') ? Number.parseFloat(value) : Number.parseFloat(value) * 1000
      const px = value => { const m = /translateY\((-?[\d.]+)px\)/.exec(value || ''); return m === null ? 0 : -Number(m[1]) }
      const step = Math.round(Number.parseFloat(getComputedStyle(content).lineHeight)) * 2
      return {
        records: (window.__glide || []).map(r => ({ delta: px(r.to) - px(r.from), dur: ms(r.dur || '0ms') })),
        base: ms(style.getPropertyValue(stepProperty).trim()),
        hold: ms(style.getPropertyValue(holdProperty).trim()),
        step,
      }
    }, [window, text, t.surface.property('chat.reason-step'), t.surface.property('chat.reason-hold')])
    const caught = glide.records.filter(r => r.delta > glide.step)
    t.expectThat.equal(caught.length > 0 && caught.every(r => r.dur > glide.base), true, 'a long catch-up glides over the wait instead of snapping: ' + JSON.stringify(glide.records.slice(0, 6)))
    t.expectThat.equal(glide.records.every(r => r.dur >= glide.base && r.dur <= glide.hold), true, 'every glide stays between the step and the wait: ' + JSON.stringify({ base: glide.base, hold: glide.hold, records: glide.records.slice(0, 6) }))
    await t.prefs({ reasoningDisplay: 'continuous' })
  })
})
