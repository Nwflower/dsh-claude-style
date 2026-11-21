/**
 * @capability view-tabs
 * @features view-tabs
 * @risk Switching sessions briefly draws left-aligned tabs or forces layout during a large mounting batch.
 */
import { spec, host, surface } from '../../fixtures/behaviour.mjs'

const HEADER = host.attributes('shell.header-slot')
const TABS = host.attributes('header.conversation-tabs')
const CONTENT = host.attributes('chat.content')
const STRIP = surface.attribute('view-tabs.strip')

function switchSession(t) {
  return t.page.evaluate(async ([header, tabs, content, stripMark]) => {
    const settle = () => window.__dshSmokeProbe.settle()
    const applyAttributes = (node, attributes) => {
      for (const [name, value] of attributes) node.setAttribute(name, value)
    }
    const build = () => {
      const session = document.createElement('div')
      const slot = document.createElement('div')
      applyAttributes(slot, header)
      slot.style.width = 'min(400px, 100%)'
      const row = document.createElement('div')
      const list = document.createElement('div')
      applyAttributes(list, tabs)
      list.setAttribute('role', 'tablist')
      for (const label of ['Chat', 'Trajectory', 'Context']) {
        const tab = document.createElement('button')
        tab.setAttribute('role', 'tab')
        tab.textContent = label
        list.append(tab)
      }
      list.style.display = 'flex'
      row.append(list)
      slot.append(row)
      const body = document.createElement('div')
      applyAttributes(body, content)
      body.style.cssText = 'width:min(360px,100%);height:72px'
      session.append(slot, body)
      return { session, slot, row, list, body }
    }
    const previous = build()
    document.body.prepend(previous.session)
    await settle()

    const next = build()
    const read = () => {
      const strip = next.row.getBoundingClientRect()
      const header = next.slot.getBoundingClientRect()
      const list = next.list.getBoundingClientRect()
      return {
        marked: next.row.hasAttribute(stripMark),
        top: strip.top,
        right: strip.right,
        aligned: Math.abs(list.right - header.right) < 1 && list.left > header.left,
      }
    }
    // D40: no box reads are needed in the before-paint mutation callback.
    let boxReads = 0
    const originalRect = Element.prototype.getBoundingClientRect
    // cost: D40 — count synchronous box reads during the mounting batch.
    Element.prototype.getBoundingClientRect = function () {
      boxReads += 1
      return originalRect.call(this)
    }
    try {
      previous.session.replaceWith(next.session)
      const transcript = document.createElement('div')
      next.body.append(transcript)
      for (let index = 0; index < 1500; index++) {
        const line = document.createElement('div')
        line.append(document.createElement('span'), document.createElement('span'), document.createElement('span'))
        transcript.append(line)
      }
      const atMount = boxReads
      await new Promise((resolve) => queueMicrotask(() => queueMicrotask(resolve)))
      const inBatchCallback = boxReads - atMount
      const painted = await new Promise((resolve) => requestAnimationFrame(() => resolve(read())))
      await settle()
      return { painted, settled: read(), inBatchCallback }
    } finally {
      // cost: D40 — restore geometry reads after the sample.
      Element.prototype.getBoundingClientRect = originalRect
      next.session.remove()
    }
  }, [HEADER, TABS, CONTENT, STRIP])
}

export default spec({ page: 'view-tabs' }, ({ test }) => {
  test('a new session starts with a right-aligned view switch', async (t) => {
    const { painted, settled, inBatchCallback } = await switchSession(t)
    t.expectThat.equal(painted, settled, 'the first frame reads as the settled page')
    t.expectThat.equal(painted.marked && painted.aligned, true, 'the tabs are at the right of the new header')
    t.expectThat.equal(inBatchCallback, 0, 'the mounting batch reads no boxes')
  })
})
