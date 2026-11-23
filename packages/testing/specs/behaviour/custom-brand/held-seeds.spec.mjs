/**
 * A selected scheme's seeds survive a replaced <body> style attribute: another
 * plugin writing the whole attribute drops them while the scheme's attribute
 * stays, and the scheme's card fill would resolve to nothing, leaving the
 * account and More menus transparent (#437). The engine writes the set back
 * before the next frame; a seed removed by name stays removed.
 *
 * @capability custom-brand
 * @features brand
 * @risk A replaced body style attribute leaves the scheme attribute without its seeds and every popover card transparent.
 */
import { spec } from '../../fixtures/behaviour.mjs'

export default spec({ page: 'account' }, ({ test }) => {
  test('a replaced body style attribute gets the scheme seeds back before the next frame', async (t) => {
    const seed = t.surface.property('brand.custom-canvas-light')
    const card = t.surface.property('brand.card-scheme')
    const scheme = t.surface.attribute('brand.card-scheme')
    await t.prefs({
      paletteColors: 'scheme-1',
      paletteSchemes: [JSON.stringify({ id: 'scheme-1', name: 'held', base: 'claude', background: { light: '#f5f0e8' } })],
    })
    const reading = await t.page.evaluate(async ({ seed, card, scheme }) => {
      const body = document.body
      const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()))
      const read = () => ({
        scheme: body.hasAttribute(scheme),
        seed: body.style.getPropertyValue(seed),
        card: getComputedStyle(body).getPropertyValue(card).trim(),
      })
      const before = read()
      body.setAttribute('style', 'color: inherit')
      const dropped = read()
      await frame()
      const replaced = { ...read(), foreign: body.style.getPropertyValue('color') }
      body.removeAttribute('style')
      await frame()
      const removed = read()
      body.style.removeProperty(seed)
      await frame()
      const named = read()
      return { before, dropped, replaced, removed, named }
    }, { seed, card, scheme })
    t.expectThat.equal(reading.before.card !== '' && reading.before.seed !== '', true, 'the selected scheme paints its card: ' + JSON.stringify(reading.before))
    t.expectThat.equal(reading.dropped.scheme && reading.dropped.card === '', true, 'the replaced attribute leaves the scheme attribute with an unpainted card: ' + JSON.stringify(reading.dropped))
    t.expectThat.equal(reading.replaced.card, reading.before.card, 'the card fill comes back after a setAttribute replacement')
    t.expectThat.equal(reading.replaced.foreign, 'inherit', 'the other writer\'s own declaration stays beside the restored seeds')
    t.expectThat.equal(reading.removed.card, reading.before.card, 'the card fill comes back after the attribute is removed')
    t.expectThat.equal(reading.named.seed, '', 'a seed removed by name stays removed')
    await t.prefs({ paletteColors: 'brand', paletteSchemes: [] })
  })
})
