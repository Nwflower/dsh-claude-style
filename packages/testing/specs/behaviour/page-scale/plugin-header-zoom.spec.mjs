/**
 * The plugin manager page measures an out-of-flow `[data-plugin-bar][data-measuring]`
 * clone via `getBoundingClientRect()` and writes those offsets back as CSS pixel
 * custom properties. Under page zoom the clone is counter-scaled so the toolbar
 * stays aligned with the header's right edge rather than clipping outside `clip-path: inset(0)`.
 *
 * @capability page-scale
 * @features core
 * @risk Under 110% or 125% page zoom the plugin manager's refresh and install buttons shift past the header's right edge and are clipped out of view.
 */
import { PLUGIN_BAR_ATTRIBUTE, PLUGIN_MEASURING_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { spec, surface } from '../../fixtures/behaviour.mjs'

const ZOOM = surface.attribute('skin.page-zoom')

export default spec({ page: 'desktop' }, ({ test }) => {
  for (const zoom of ['1.1', '1.25']) {
    test(`at a page zoom of ${zoom} the plugin header measuring clone yields unclipped CSS pixel offsets`, async (t) => {
      await t.prefs({ pageZoom: String(Math.round(Number(zoom) * 100)) })
      t.expectThat.equal(await t.read.attribute('body', ZOOM), zoom, `the page is drawn at ${zoom}`)
      const result = await t.page.evaluate(([barAttr, measuringAttr]) => {
        const style = document.createElement('style')
        style.textContent = `
          #test-plugin-body { position: relative; width: 800px; padding: 0 48px; box-sizing: border-box; }
          #test-plugin-body > [${barAttr}] { width: calc(100% + 96px); margin-inline: -48px; padding-inline: 48px; box-sizing: border-box; }
          #test-plugin-body > [${barAttr}] > header { display: flex; justify-content: space-between; width: 100%; max-width: 960px; margin: 0 auto; }
          #test-plugin-body > [${barAttr}][${measuringAttr}] { position: absolute; top: 0; left: 0; margin: 0; visibility: hidden; }
          #test-plugin-body > .test-plugin-natural > header { position: relative; height: 64px; clip-path: inset(0); }
          #test-plugin-body > .test-plugin-natural .test-plugin-part { position: absolute; left: var(--plugin-part-x); top: var(--plugin-part-y); width: var(--plugin-part-width); }
        `
        document.head.append(style)
        const body = document.createElement('div')
        body.id = 'test-plugin-body'
        const bar = document.createElement('div')
        bar.setAttribute(barAttr, '')
        bar.innerHTML = `
          <header>
            <h1 class="test-plugin-part test-plugin-title" style="margin:0;width:120px;height:28px">Plugins</h1>
            <div class="test-plugin-part test-plugin-toolbar" style="width:200px;height:28px">Actions</div>
          </header>
        `
        body.append(bar)
        document.body.append(body)
        const clone = bar.cloneNode(true)
        clone.setAttribute(measuringAttr, '')
        clone.style.width = `${bar.getBoundingClientRect().width}px`
        body.append(clone)
        const headBox = clone.querySelector('header').getBoundingClientRect()
        const cloneParts = clone.querySelectorAll('.test-plugin-part')
        const liveParts = bar.querySelectorAll('.test-plugin-part')
        cloneParts.forEach((part, index) => {
          const box = part.getBoundingClientRect()
          liveParts[index].style.setProperty('--plugin-part-x', `${box.x - headBox.x}px`)
          liveParts[index].style.setProperty('--plugin-part-y', `${box.y - headBox.y}px`)
          liveParts[index].style.setProperty('--plugin-part-width', `${box.width}px`)
        })
        clone.remove()
        bar.classList.add('test-plugin-natural')
        const liveHead = bar.querySelector('header').getBoundingClientRect()
        const liveToolbar = bar.querySelector('.test-plugin-toolbar').getBoundingClientRect()
        const gapRight = Math.abs(liveHead.right - liveToolbar.right)
        body.remove()
        style.remove()
        return { headRight: liveHead.right, toolbarRight: liveToolbar.right, gapRight }
      }, [PLUGIN_BAR_ATTRIBUTE, PLUGIN_MEASURING_ATTRIBUTE])
      t.expectThat.equal(result.gapRight <= 1.5, true,
        `toolbar right edge aligns with header right edge without clipping (${JSON.stringify(result)})`)
    })
  }
})
