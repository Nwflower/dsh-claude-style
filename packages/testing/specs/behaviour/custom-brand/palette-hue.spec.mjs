/**
 * A custom scheme over a low-chroma canvas keeps its hue through the derived
 * sidebar: the seed carries its hue outright, so a relative colour copying `h`
 * cannot fall to hue 0 and paint a warm cream sidebar pink (#370). The sidebar
 * tone moves only lightness and chroma, so the identity copy of the seed's hue
 * is the hue every derived rung takes.
 *
 * @capability custom-brand
 * @features brand
 * @risk A hex seed loses its oklch hue on a low-chroma canvas and every derived rung paints at hue 0.
 */
import { spec } from '../../fixtures/behaviour.mjs'

/** The hue of a computed oklch colour, or null where the browser reads it as powerless. */
function hueOf(computed) {
  const parts = /oklch\(([^)]+)\)/.exec(computed)
  if (parts === null) return null
  const hue = parts[1].trim().split(/\s+/)[2]
  return hue === 'none' ? null : Number.parseFloat(hue)
}

export default spec({ page: 'chat-fold' }, ({ test }) => {
  test('a parchment-based scheme keeps the canvas hue in the derived sidebar', async (t) => {
    const seedProperty = t.surface.property('brand.custom-canvas-light')
    await t.prefs({
      paletteColors: 'scheme-1',
      paletteSchemes: [JSON.stringify({ id: 'scheme-1', name: 'warm', base: 'parchment', accent: '#4d6bfe' })],
    })
    const reading = await t.page.evaluate((property) => {
      const seed = document.body.style.getPropertyValue(property)
      const probe = document.createElement('div')
      document.body.append(probe)
      const paint = (background) => {
        probe.style.background = ''
        probe.style.background = background
        return getComputedStyle(probe).backgroundColor
      }
      const canvas = paint(`var(${property})`)
      const copied = paint(`oklch(from var(${property}) l c h)`)
      probe.remove()
      return { seed, canvas, copied }
    }, seedProperty)
    t.expectThat.equal(/^oklch\(/.test(reading.seed), true, 'the canvas seed names its hue outright instead of standing as a hex: ' + reading.seed)
    const canvasHue = hueOf(reading.canvas)
    const copiedHue = hueOf(reading.copied)
    t.expectThat.equal(canvasHue !== null && canvasHue > 60 && canvasHue < 120, true, 'the parchment canvas keeps its warm hue: ' + reading.canvas)
    t.expectThat.equal(copiedHue !== null && Math.abs(copiedHue - canvasHue) < 0.5, true, 'a relative colour copying the seed hue keeps it instead of falling to pink: ' + JSON.stringify(reading))
    await t.prefs({ paletteColors: 'brand', paletteSchemes: [] })
  })
})
