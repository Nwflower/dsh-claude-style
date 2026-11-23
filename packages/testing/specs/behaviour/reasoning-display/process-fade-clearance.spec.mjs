/**
 * Inside a capped process body scrolled to its end, a stepped thinking row's
 * cap leaves its header clear of the host's 24px `.fadeTop` mask in both flat
 * and column process layouts and when a shorter viewport shrinks `50vh`.
 *
 * @capability reasoning-display
 * @features chat-fold,process-column
 * @risk A stepped reasoning window as tall as the enclosing process body pushes the thinking row's header into `.fadeTop` so its top half fades out.
 */
import { spec, host } from '../../fixtures/behaviour.mjs'
import {
  ASSISTANT_STEP_KIND,
  CHAT_GROUP_PART_ATTRIBUTE,
  CHAT_GROUP_PART_REASONING,
  EXPANDED_ATTRIBUTE,
  FLOW_KIND_ATTRIBUTE,
  ROW_PHASE_ATTRIBUTE,
  RUNNING_STATE,
  TOOL_CALL_KIND,
} from '@dsh-claude-style/contracts/dom'

const HOST_FADE_TOP_PX = 24

async function mountScrolledGroup(t) {
  const scrollerSelector = t.host('chat.scroller')
  const pairs = {
    group: host.attributes('process.group'),
    body: host.attributes('process.body'),
    content: host.attributes('process.content'),
    think: host.attributes('chat.think-row'),
    disclosure: host.attributes('fold.disclosure'),
    expandable: host.attributes('fold.expandable'),
    text: host.attributes('chat.reasoning-text'),
  }
  await t.page.evaluate(([scroller, attrs, flowKind, partAttr, stepKind, toolKind, reasonPart, phaseAttr, running, expanded]) => {
    const createWith = (entries, id) => {
      const el = document.createElement('div')
      if (id !== undefined) el.id = id
      for (const [key, val] of entries) el.setAttribute(key, val)
      return el
    }

    const content = createWith(attrs.content)
    for (let index = 0; index < 8; index += 1) {
      const call = createWith([[flowKind, toolKind]])
      call.style.height = '28px'
      call.textContent = `call ${index}`
      content.append(call)
    }

    const header = createWith([...attrs.disclosure, ...attrs.expandable, ['role', 'button'], ['aria-expanded', 'true']], 'fade-clearance-header')
    header.style.lineHeight = '24px'
    header.textContent = '思考'

    const markdown = createWith(attrs.text)
    markdown.style.lineHeight = '23px'
    markdown.innerHTML = Array.from({ length: 36 }, (_, line) => `reasoning line ${line}`).join('<br>')

    const thinkBody = document.createElement('div')
    thinkBody.style.padding = '4px 0'
    thinkBody.append(markdown)

    const think = createWith([...attrs.think, [phaseAttr, running], [expanded, '']], 'fade-clearance-think')
    think.append(header, thinkBody)

    const item = createWith([[flowKind, stepKind], [partAttr, reasonPart]])
    item.append(think)
    content.append(item)

    const body = createWith(attrs.body, 'fade-clearance-body')
    body.append(content)
    const group = createWith(attrs.group)
    group.append(body)
    document.querySelector(scroller)?.append(group)
  }, [
    scrollerSelector,
    pairs,
    FLOW_KIND_ATTRIBUTE,
    CHAT_GROUP_PART_ATTRIBUTE,
    ASSISTANT_STEP_KIND,
    TOOL_CALL_KIND,
    CHAT_GROUP_PART_REASONING,
    ROW_PHASE_ATTRIBUTE,
    RUNNING_STATE,
    EXPANDED_ATTRIBUTE,
  ])
}

async function readClearance(t) {
  const windowSelector = t.surface('chat.reason-window')
  const cappedAttr = t.surface.attribute('chat.reason-capped')
  const heightProperty = t.surface.property('chat.reason-window-height')
  await t.page.waitForFunction(([sel, attr]) => {
    const el = document.querySelector(`#fade-clearance-think ${sel}`)
    return el !== null && el.hasAttribute(attr)
  }, [windowSelector, cappedAttr], { timeout: 5000 })
  return t.page.evaluate(([sel, prop]) => {
    const body = document.getElementById('fade-clearance-body')
    const header = document.getElementById('fade-clearance-header')
    const win = document.querySelector(`#fade-clearance-think ${sel}`)
    body.scrollTop = body.scrollHeight
    const bodyRect = body.getBoundingClientRect()
    const headerRect = header.getBoundingClientRect()
    return {
      scrollTop: Math.round(body.scrollTop),
      headerTop: Math.round(headerRect.top - bodyRect.top),
      writtenCap: Number.parseFloat(win.style.getPropertyValue(prop)),
    }
  }, [windowSelector, heightProperty])
}

export default spec({ page: 'composer' }, ({ test }) => {
  test('the stepped reasoning cap keeps the thinking header below the process body top fade in flat, column, and short caps', async (t) => {
    const initialViewport = t.page.viewportSize()
    await t.prefs({ chatAnimations: true, motion: 'full', reasoningDisplay: 'stepped', processRows: 'flat' })
    await mountScrolledGroup(t)

    const flat = await readClearance(t)
    t.expectThat.equal(flat.scrollTop > 0, true, 'earlier rows scroll above the active thinking row')
    t.expectThat.equal(flat.headerTop >= HOST_FADE_TOP_PX, true, `flat layout keeps the thinking header clear of the 24px fade (${flat.headerTop}px)`)

    await t.prefs({ processRows: 'column' })
    await t.settle()
    const column = await readClearance(t)
    t.expectThat.equal(column.headerTop >= HOST_FADE_TOP_PX, true, `column layout keeps the thinking header clear of the 24px fade (${column.headerTop}px)`)

    try {
      await t.page.setViewportSize({ width: initialViewport?.width ?? 1280, height: 520 })
      await t.settle()
      const shortCap = await readClearance(t)
      t.expectThat.equal(shortCap.writtenCap < flat.writtenCap, true, `a shorter process body clamps the stepped window below the default cap (${shortCap.writtenCap}px < ${flat.writtenCap}px)`)
      t.expectThat.equal(shortCap.headerTop >= HOST_FADE_TOP_PX, true, `a shorter process body still keeps the thinking header clear of the 24px fade (${shortCap.headerTop}px)`)
    } finally {
      if (initialViewport !== null) await t.page.setViewportSize(initialViewport)
    }
  })
})
