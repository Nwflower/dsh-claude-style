/**
 * What a selected scheme's link seed and contour drawing do to the page: the
 * link takes the scheme's colour per appearance, follows the accent while the
 * scheme names none, and the contour drawing is the scheme's own under either
 * brand.
 *
 * @capability custom-brand
 * @features brand
 * @risk A reader's link colour is ignored, the link stops following a changed accent, or the same scheme draws its dark contours differently under the two brands.
 */
import { host, spec, surface } from '../../fixtures/behaviour.mjs'

const EDGES_ATTR = surface.attribute('brand.custom-scheme')
const LINK_PROPERTY = surface.property('brand.custom-scheme')
const DARK_ATTR = host('shell.dark-theme')

const scheme = (record) => JSON.stringify({ id: 'custom', base: 'claude', ...record })

export default spec({ page: 'chat-fold' }, ({ test }) => {
  const readLink = (t) => t.page.evaluate((property) => {
    const probe = document.createElement('span')
    probe.style.color = `var(${property})`
    document.body.append(probe)
    const colour = getComputedStyle(probe).color
    probe.remove()
    return colour
  }, LINK_PROPERTY)
  const setScheme = async (t, dark, record) => {
    await t.prefs({ palette: 'claude', paletteColors: 'custom', paletteSchemes: [scheme(record)] })
    await t.page.evaluate(({ attribute, dark }) => document.body.toggleAttribute(attribute, dark), { attribute: DARK_ATTR, dark })
  }

  for (const appearance of ['light', 'dark']) {
    test(`the scheme's own link colour reaches the page in ${appearance}`, async (t) => {
      await setScheme(t, appearance === 'dark', { link: { light: '#123456', dark: '#abcdef' } })
      t.expectThat.equal(await readLink(t), appearance === 'light' ? 'rgb(18, 52, 86)' : 'rgb(171, 205, 239)', 'the named link colour is the page\'s link')
    })

    test(`a scheme naming no link colour derives it from its accent in ${appearance}`, async (t) => {
      await setScheme(t, appearance === 'dark', { accent: '#e53935' })
      const first = await readLink(t)
      await setScheme(t, appearance === 'dark', { accent: '#1e88e5' })
      const second = await readLink(t)
      t.expectThat.equal(first !== second, true, 'a changed accent moves the derived link')
      await setScheme(t, appearance === 'dark', { accent: '#e53935', link: { light: '#123456', dark: '#abcdef' } })
      t.expectThat.equal(await readLink(t) !== first, true, 'a named link colour replaces the derived one')
    })
  }

  for (const brand of ['claude', 'deepseek']) {
    test(`the scheme's contour drawing is its own under the ${brand} brand`, async (t) => {
      await t.prefs({ brand })
      await setScheme(t, true, { edges: 'surface' })
      t.expectThat.equal(await t.page.evaluate((attribute) => document.body.getAttribute(attribute), EDGES_ATTR), 'surface', 'the scheme names surface contours')
      await setScheme(t, true, { edges: 'highlight' })
      t.expectThat.equal(await t.page.evaluate((attribute) => document.body.getAttribute(attribute), EDGES_ATTR), 'highlight', 'the scheme names highlighted contours')
      await setScheme(t, true, {})
      const inherited = await t.page.evaluate((attribute) => document.body.getAttribute(attribute), EDGES_ATTR)
      t.expectThat.equal(inherited, 'highlight', 'a scheme naming none takes its base preset\'s drawing')
    })
  }
})
