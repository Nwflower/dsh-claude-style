/**
 * Ordinary interface text has its own percentage: the sidebar and composer grow
 * together, while page zoom stays a separate preference and reset removes it.
 *
 * @capability interface-font-size
 * @features core, composer, workspace, settings
 * @risk Interface text stays too small on mobile, or changing it accidentally scales the whole page and leaves stale overrides at reset.
 */
import { spec } from '../../fixtures/behaviour.mjs'

export default spec({ page: 'desktop' }, ({ test }) => {
  test('ordinary interface text scales immediately and resets independently of page zoom', async (t) => {
    const read = () => t.page.evaluate(([title, input, attribute, property, zoom]) => ({
      title: Number.parseFloat(getComputedStyle(document.querySelector(title)).fontSize),
      input: Number.parseFloat(getComputedStyle(document.querySelector(input)).fontSize),
      attribute: document.body.getAttribute(attribute),
      scale: document.body.style.getPropertyValue(property),
      zoom: document.body.getAttribute(zoom),
    }), [
      t.surface('sidebar.session-title'),
      t.host('composer.input'),
      t.surface.attribute('skin.interface-font-size'),
      t.surface.property('skin.interface-font-size'),
      t.surface.attribute('skin.page-zoom'),
    ])
    const base = await read()
    await t.prefs({ interfaceFontSize: '125' })
    const enlarged = await read()
    t.expectThat.equal(enlarged.title, base.title * 1.25, 'the sidebar title grows by 125%')
    t.expectThat.equal(enlarged.input, base.input * 1.25, 'the composer text grows by 125%')
    t.expectThat.equal(enlarged.attribute, '125', 'the chosen percentage reaches the document')
    t.expectThat.equal(enlarged.scale, '1.25', 'the scale reaches the ordinary font property')
    t.expectThat.equal(enlarged.zoom, base.zoom, 'page zoom does not move with interface font size')
    await t.prefs({ interfaceFontSize: '100' })
    const restored = await read()
    t.expectThat.equal(restored.title, base.title, 'the sidebar title returns to its original size')
    t.expectThat.equal(restored.input, base.input, 'the composer text returns to its original size')
    t.expectThat.equal(restored.attribute, null, 'the default removes the document attribute')
    t.expectThat.equal(restored.scale, '', 'the default removes the projected property')
  })
})
