/**
 * A full-window host overlay keeps the window's edges while dialog cards inside
 * it keep their own viewport caps. The recharge page's native view reads the
 * overlay's remaining space below its header.
 *
 * @capability page-scale
 * @features core
 * @risk The dialog card cap shrinks the recharge overlay and exposes the background below and beside its native view.
 */
import { PAGE_PARTS } from '@dsh-claude-style/engine/parts-table'
import { spec, surface } from '../../fixtures/behaviour.mjs'
import { partClass } from '../../fixtures/parts.mjs'

const PART = surface.attribute('skin.part')
const ZOOM = surface.attribute('skin.page-zoom')

/** PlatformOverlay's body-portal structure and stylesheet layout, without opening a payment page. */
const mount = (t) => t.page.evaluate((overlayClass) => {
  const overlay = document.createElement('div')
  overlay.id = 'recharge-overlay'
  overlay.className = overlayClass
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column'
  const header = document.createElement('div')
  header.style.cssText = 'height:48px;flex-shrink:0'
  const viewport = document.createElement('div')
  viewport.id = 'recharge-viewport'
  viewport.style.cssText = 'flex:1;min-height:0;position:relative'
  const card = document.createElement('div')
  card.id = 'recharge-dialog-card'
  card.setAttribute('role', 'dialog')
  card.style.cssText = 'position:absolute;width:200vw;height:200vh'
  viewport.append(card)
  overlay.append(header, viewport)
  document.body.append(overlay)
}, partClass(PAGE_PARTS, 'overlay'))

const read = (t) => t.page.evaluate(() => {
  const box = (id) => {
    const element = document.getElementById(id)
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, maxWidth: style.maxWidth, maxHeight: style.maxHeight }
  }
  return { width: innerWidth, height: innerHeight, overlay: box('recharge-overlay'), viewport: box('recharge-viewport'), card: box('recharge-dialog-card') }
})

export default spec({ page: 'desktop', bands: ['wide', 'phone'] }, ({ test }) => {
  for (const zoom of ['1', '0.8', '1.25', '1.5']) {
    test(`at page zoom ${zoom} the recharge overlay fills the window and its inner dialog stays capped`, async (t) => {
      await t.prefs({ pageZoom: String(Number(zoom) * 100) })
      t.expectThat.equal((await t.read.attribute('body', ZOOM)) ?? '1', zoom, 'the page uses the requested zoom')
      await mount(t)
      await t.settle()
      t.expectThat.equal(await t.read.attribute('#recharge-overlay', PART), 'overlay', 'the parts walk recognizes the host overlay')
      const check = async () => {
        const result = await read(t)
        const near = (a, b) => Math.abs(a - b) <= 1
        t.expectThat.equal(result.overlay.maxWidth, 'none', 'the full-window overlay has no card width cap')
        t.expectThat.equal(result.overlay.maxHeight, 'none', 'the full-window overlay has no card height cap')
        for (const name of ['overlay', 'viewport']) {
          const box = result[name]
          t.expectThat.equal(near(box.left, 0) && near(box.right, result.width), true, `${name} reaches both window sides`)
          t.expectThat.equal(near(box.bottom, result.height), true, `${name} reaches the window bottom`)
        }
        t.expectThat.equal(near(result.overlay.top, 0), true, 'the overlay reaches the window top')
        t.expectThat.equal(near(result.viewport.top, 48 * Number(zoom)), true, 'the viewport begins below the header')
        t.expectThat.equal(near(Number.parseFloat(result.card.maxWidth), result.width / Number(zoom) - 48), true, 'the inner dialog retains its page-width cap')
        t.expectThat.equal(near(Number.parseFloat(result.card.maxHeight), result.height / Number(zoom) - 48), true, 'the inner dialog retains its page-height cap')
      }
      await check()
      const size = t.page.viewportSize()
      await t.page.setViewportSize({ width: size.width - 60, height: size.height - 80 })
      await t.settle()
      await check()
      await t.page.evaluate(() => document.getElementById('recharge-overlay').remove())
      await t.settle()
      await mount(t)
      await t.settle()
      t.expectThat.equal(await t.read.attribute('#recharge-overlay', PART), 'overlay', 'a reopened overlay is recognized again')
      await check()
    })
  }
})
