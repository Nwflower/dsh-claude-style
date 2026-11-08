/**
 * The dialog cap the scaled page writes (D81) and the two layers it exempts:
 * at a page zoom of 125% a dialog card the host opens is capped against the
 * page's own size, while dsh-video-skin's full-window boot layer
 * (packages/contracts/src/table.ts, issue #205) measures the window itself and
 * keeps the whole window at any scale, and the image preview's backdrop — the
 * `role="dialog"` root the host portals onto the body, with its own mask inside
 * (ui-primitives' ImageLightbox, issue #278) — keeps the window's edges too.
 *
 * @capability dialog-cap
 * @features core
 * @risk At 125% the boot animation is capped 48px short of the window on some
 *   edge and the vendor screen stands inside a letterbox, the image preview
 *   exposes the page behind its backdrop at the right and bottom edges, or the
 *   cap's exemption leaks onto a plain dialog and it outgrows the window.
 */
import { PAGE_PARTS } from '@dsh-claude-style/engine/parts-table'
import { host, spec, surface } from '../../fixtures/behaviour.mjs'
import { partClass } from '../../fixtures/parts.mjs'

const BOOT = host('dsh-video-skin.boot')
const ZOOM = surface.attribute('skin.page-zoom')
const PART = surface.attribute('skin.part')

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

/**
 * ImageLightbox's portalled tree, without opening a preview over a real image:
 * the backdrop is the `role="dialog"` root, the mask and the staged image stand
 * inside it, and a dialog card inside the stage is what the cap must still reach.
 */
const mountPreview = (t) => t.page.evaluate((backdropClass) => {
  const backdrop = document.createElement('div')
  backdrop.id = 'image-preview'
  backdrop.className = backdropClass
  backdrop.setAttribute('role', 'dialog')
  backdrop.setAttribute('aria-modal', 'true')
  backdrop.style.cssText = 'position:fixed;inset:0'
  const mask = document.createElement('div')
  mask.id = 'image-preview-mask'
  mask.setAttribute('aria-hidden', 'true')
  mask.style.cssText = 'position:absolute;inset:0'
  const card = document.createElement('div')
  card.id = 'image-preview-card'
  card.setAttribute('role', 'dialog')
  card.style.cssText = 'position:absolute;width:200vw;height:200vh'
  backdrop.append(mask, card)
  document.body.append(backdrop)
}, partClass(PAGE_PARTS, 'backdrop'))

/** The preview's own box against the window, and the card inside it against the cap. */
const readPreview = (t) => t.page.evaluate((partAttr) => {
  const backdrop = document.getElementById('image-preview')
  const style = getComputedStyle(backdrop)
  const rect = backdrop.getBoundingClientRect()
  const card = document.getElementById('image-preview-card')
  return {
    part: backdrop.getAttribute(partAttr),
    maxWidth: style.maxWidth,
    maxHeight: style.maxHeight,
    window: [innerWidth, innerHeight],
    edges: [Math.round(rect.left), Math.round(rect.top), Math.round(innerWidth - rect.right), Math.round(innerHeight - rect.bottom)],
    cardMaxWidth: getComputedStyle(card).maxWidth,
  }
}, PART)

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

  test('the image preview covers the window and the dialog card inside it keeps its cap', async (t) => {
    await mountPreview(t)
    await t.settle()
    const preview = await readPreview(t)
    t.expectThat.equal(preview.part, 'backdrop', 'the parts walk recognizes the preview backdrop')
    t.expectThat.equal(preview.maxWidth, 'none', 'the preview backdrop carries no width cap')
    t.expectThat.equal(preview.maxHeight, 'none', 'the preview backdrop carries no height cap')
    t.expectThat.equal(preview.edges.every((edge) => Math.abs(edge) <= 1), true, `the backdrop reaches all four window edges: ${JSON.stringify(preview.edges)} of ${JSON.stringify(preview.window)}`)
    const factor = Number.parseFloat((await t.read.attribute('body', ZOOM)) ?? '1')
    t.expectThat.equal(Math.abs(Number.parseFloat(preview.cardMaxWidth) - (preview.window[0] / factor - 48)) <= 1, true, 'a dialog card inside the preview keeps its page-width cap')
  })
})
