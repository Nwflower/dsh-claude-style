/**
 * The header band's right-panel open stamp follows the visible Session's panel
 * alone: a retained Session hidden behind `[hidden]` keeps its own open mark
 * without leaving the frame stamped, toggling `[hidden]` on session switch
 * flips the stamp immediately, and unrelated `[hidden]` toggles elsewhere on
 * the page do not force visibility reads on the rightbar panels.
 *
 * @capability header-band
 * @features header-band
 * @risk Switching away from a Session with a retained open right panel leaves the header's collapse button shown on the next Session, or every unrelated `[hidden]` change on the page triggers synchronous visibility checks on the rightbar panels.
 */
import { host, spec, surface } from '../../fixtures/behaviour.mjs'
import { localClass } from '../../fixtures/parts.mjs'

const ROOT_SLOT = host.attributes('shell.root-slot')
const RIGHTBAR_PANEL = host.attributes('shell.rightbar-panel')
const RIGHTBAR_OPEN = host('shell.rightbar-open')
const RIGHTBAR_OPEN_STAMP = surface.attribute('header-band.rightbar-open')
const FRAME_CLASS = localClass('frame')

/** Mount a layout frame with two retained-style rightbar session layers and an unrelated sibling. */
async function mountRightbarSessions(t) {
  await t.page.evaluate(([rootAttrs, panelAttrs, openAttr, frameClass]) => {
    const apply = (node, pairs) => {
      for (const [name, value] of pairs) node.setAttribute(name, value)
    }
    const root = document.createElement('div')
    root.id = 'specRightbarRoot'
    apply(root, rootAttrs)
    const frame = document.createElement('div')
    frame.id = 'specRightbarFrame'
    frame.className = frameClass

    const makeSession = (id, hidden, open) => {
      const layer = document.createElement('div')
      layer.id = id
      layer.hidden = hidden
      const panel = document.createElement('div')
      apply(panel, panelAttrs)
      if (open) panel.setAttribute(openAttr, '')
      panel.style.cssText = 'width:320px;height:200px'
      layer.append(panel)
      return { layer, panel }
    }

    const sessionA = makeSession('specSessionA', false, true)
    const sessionB = makeSession('specSessionB', true, false)
    frame.append(sessionA.layer, sessionB.layer)
    root.append(frame)

    const unrelated = document.createElement('div')
    unrelated.id = 'specUnrelatedNode'
    document.body.append(root, unrelated)
  }, [ROOT_SLOT, RIGHTBAR_PANEL, RIGHTBAR_OPEN, FRAME_CLASS])
  await t.settle()
}

export default spec({ page: 'chat-fold' }, ({ test }) => {
  test('the frame open stamp follows the visible session and ignores unrelated hidden toggles', async (t) => {
    await mountRightbarSessions(t)

    const stamped = () => t.page.evaluate((attr) => {
      return document.getElementById('specRightbarFrame').hasAttribute(attr)
    }, RIGHTBAR_OPEN_STAMP)

    t.expectThat.equal(await stamped(), true, 'an open panel in the visible session stamps the frame')

    // Switch to Session B: Session A is retained behind `hidden` with its open mark intact.
    await t.page.evaluate(() => {
      document.getElementById('specSessionA').hidden = true
      document.getElementById('specSessionB').hidden = false
    })
    await t.settle()
    t.expectThat.equal(await stamped(), false, 'hiding the open session clears the stamp even though its retained panel keeps the open mark')

    // Switch back to Session A: its open panel returns to the screen.
    await t.page.evaluate(() => {
      document.getElementById('specSessionB').hidden = true
      document.getElementById('specSessionA').hidden = false
    })
    await t.settle()
    t.expectThat.equal(await stamped(), true, 'returning to the open session restores the stamp')

    // Toggling `hidden` outside the rightbar must not force checkVisibility() on the panels.
    const visibilityReads = await t.page.evaluate(() => {
      const panels = [...document.querySelectorAll('#specRightbarFrame > div > div')]
      let reads = 0
      const originals = panels.map((panel) => {
        const original = panel.checkVisibility.bind(panel)
        panel.checkVisibility = (options) => {
          reads += 1
          return original(options)
        }
        return [panel, original]
      })
      const unrelated = document.getElementById('specUnrelatedNode')
      unrelated.hidden = true
      unrelated.hidden = false
      return new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          for (const [panel, original] of originals) panel.checkVisibility = original
          resolve(reads)
        }))
      })
    })
    t.expectThat.equal(visibilityReads, 0, 'unrelated hidden toggles trigger zero visibility reads on rightbar panels')
  })
})
