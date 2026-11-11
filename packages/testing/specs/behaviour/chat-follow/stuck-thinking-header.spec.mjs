/**
 * An expanded thinking row whose sticky header has reached the top of the
 * conversation scroller stands still while streamed growth slides the column (D94).
 *
 * @capability chat-follow
 * @features chat-follow
 * @risk As long reasoning streams in continuous mode, the sticky thinking header jumps downward on every chunk and flickers hover state under a stationary pointer.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import {
  CHAT_RUNNING_SELECTOR,
  DISCLOSURE_HEADER_SELECTOR,
  EXPANDED_ATTRIBUTE,
  FOLLOWING_TAIL_ATTRIBUTE,
  ROW_PHASE_ATTRIBUTE,
  RUNNING_STATE,
  STREAMING_ATTRIBUTE,
  THINK_ROW_SELECTOR,
} from '@dsh-claude-style/contracts/dom'

export default spec({ page: 'chat-follow' }, ({ test }) => {
  test('a stuck thinking header stays at the scroller top while streamed growth slides the column', async (t) => {
    const flowSelector = t.host('chat.flow')
    const scrollerSelector = t.host('chat.scroller')
    await t.prefs({ chatAnimations: true, motion: 'full', reasoningDisplay: 'continuous' })

    const result = await t.page.evaluate(async ([
      flowSel,
      scrollerSel,
      thinkSel,
      headerSel,
      runningSel,
      followAttr,
      phaseAttr,
      runningVal,
      expandedAttr,
      streamAttr,
    ]) => {
      const flow = document.querySelector(flowSel)
      const scroller = document.querySelector(scrollerSel)
      if (flow === null || scroller === null || flow.parentElement === null) throw new Error('missing chat flow or scroller')
      flow.parentElement.setAttribute(followAttr, '')

      const thinkAttr = thinkSel.slice(1, -1).split('=')
      const headerAttr = headerSel.slice(1, -1)
      const runAttr = runningSel.slice(1, -1)

      const think = document.createElement('div')
      think.setAttribute(thinkAttr[0], thinkAttr[1].replaceAll('"', ''))
      think.setAttribute(phaseAttr, runningVal)
      think.setAttribute(expandedAttr, '')

      const header = document.createElement('div')
      header.setAttribute(headerAttr, '')
      header.style.cssText = 'position:sticky;top:0;height:24px'

      const body = document.createElement('div')
      body.setAttribute(streamAttr, '')
      body.style.height = '900px'
      think.append(header, body)

      const waitRow = document.createElement('div')
      waitRow.setAttribute(runAttr, '')
      waitRow.style.height = '24px'

      flow.append(think, waitRow)
      scroller.scrollTop = scroller.scrollHeight
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

      // Warm up baseline scrollTop on a tiny growth, then measure a full 48px streamed chunk.
      body.style.height = '904px'
      scroller.scrollTop = scroller.scrollHeight
      await new Promise((r) => setTimeout(r, 280))

      const baselineTop = header.getBoundingClientRect().top
      body.style.height = '952px'
      scroller.scrollTop = scroller.scrollHeight
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

      const columnShift = new DOMMatrix(getComputedStyle(flow).transform).m42
      const midDrift = Math.abs(header.getBoundingClientRect().top - baselineTop)
      think.remove()
      waitRow.remove()
      return { columnShift, midDrift }
    }, [
      flowSelector,
      scrollerSelector,
      THINK_ROW_SELECTOR,
      DISCLOSURE_HEADER_SELECTOR,
      CHAT_RUNNING_SELECTOR,
      FOLLOWING_TAIL_ATTRIBUTE,
      ROW_PHASE_ATTRIBUTE,
      RUNNING_STATE,
      EXPANDED_ATTRIBUTE,
      STREAMING_ATTRIBUTE,
    ])

    t.expectThat.equal(result.columnShift > 4, true, `the column slides while content arrives (${result.columnShift}px)`)
    t.expectThat.equal(result.midDrift <= 1.5, true, `the stuck header stays pinned at the scroller top (drift ${result.midDrift}px)`)
  }, { frames: true })
})
