/**
 * The dialog cap the scaled page writes (D81) and the one layer it exempts:
 * at a page zoom of 125% a dialog card the host opens is capped against the
 * page's own size, while dsh-video-skin's full-window boot layer
 * (packages/contracts/src/table.ts, issue #205) measures the window itself
 * and keeps the whole window at any scale.
 *
 * @capability dialog-cap
 * @features core
 * @risk At 125% the boot animation is capped 48px short of the window on some
 *   edge and the vendor screen stands inside a letterbox, or the cap's
 *   exemption leaks onto a plain dialog and it outgrows the window.
 */
import { host, spec, surface } from '../../fixtures/behaviour.mjs'

const BOOT = host('dsh-video-skin.boot')
const ZOOM = surface.attribute('skin.page-zoom')

/** Two cards the host might open at a window's size: one plain dialog in viewport units, one the boot layer measuring the window itself. */
const build = (t) => t.page.evaluate(([bootSelector, zoomAttr]) => {
  const stored = document.body.getAttribute(zoomAttr)
  const factor = stored === null ? 1 : Number.parseFloat(stored)
  // The page's own pixels: what a layer that measures the window writes, the
  // same space the cap speaks.
  const pageWidth = innerWidth / factor
  const pageHeight = innerHeight / factor
  const make = (className, sized) => {
    const card = document.createElement(className === null ? 'dialog' : 'div')
    if (className !== null) card.className = className
    card.style.cssText = sized
    document.body.appendChild(card)
    return card
  }
  make(null, 'position:fixed;top:0;left:0;width:100vw;height:100vh')
  make(bootSelector.replace('.', ''), 'position:fixed;top:0;left:0;width:' + pageWidth + 'px;height:' + pageHeight + 'px')
  const read = (selector) => {
    const element = document.querySelector(selector)
    const style = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return { maxWidth: style.maxWidth, maxHeight: style.maxHeight, box: [rect.width, rect.height] }
  }
  return { inner: [innerWidth, innerHeight], plain: read('dialog'), boot: read('.' + bootSelector.replace('.', '')) }
}, [BOOT, ZOOM])

export default spec({ page: 'desktop', bands: ['wide'] }, ({ test }) => {
  test('at 125% a plain dialog is capped against the page\'s own size and the boot layer keeps the whole window', async (t) => {
    await t.prefs({ pageZoom: '125' })
    const page = await build(t)
    // The page's own width is the window's over the factor; the cap is that
    // minus the card's own margin.
    const expectedWidth = page.inner[0] / 1.25 - 48
    const expectedHeight = page.inner[1] / 1.25 - 48
    const near = (a, b) => Math.abs(a - b) <= 1
    t.expectThat.equal(near(Number.parseFloat(page.plain.maxWidth), expectedWidth), true, 'the plain dialog\'s max-width is the page width minus the margin')
    t.expectThat.equal(near(Number.parseFloat(page.plain.maxHeight), expectedHeight), true, 'the plain dialog\'s max-height is the page height minus the margin')
    t.expectThat.equal(page.boot.maxWidth, 'none', 'the boot layer carries no width cap')
    t.expectThat.equal(page.boot.maxHeight, 'none', 'the boot layer carries no height cap')
    t.expectThat.equal(near(page.boot.box[0], page.inner[0]) && near(page.boot.box[1], page.inner[1]), true, 'the boot layer covers the window, in the viewport\'s own pixels')
    t.expectThat.equal(page.plain.box[0] < page.inner[0] - 40 && page.plain.box[1] < page.inner[1] - 40, true, 'the capped dialog stands smaller than the window')
  })

  test('at 100% the boot layer is uncapped as well and a plain dialog meets the same cap', async (t) => {
    const page = await build(t)
    t.expectThat.equal(page.boot.maxWidth, 'none', 'the boot layer carries no width cap at 100%')
    t.expectThat.equal(page.boot.maxHeight, 'none', 'the boot layer carries no height cap at 100%')
    t.expectThat.equal(Math.abs(Number.parseFloat(page.plain.maxWidth) - (page.inner[0] - 48)) <= 1, true, 'the plain dialog\'s cap is the window minus the margin')
  })
})
