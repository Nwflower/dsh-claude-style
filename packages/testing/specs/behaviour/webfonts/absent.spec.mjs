/**
 * An install without the optional Anthropic faces costs the page no font
 * request (issue #259): the skin declares a `@font-face` only for a face the host
 * reports it holds, so the page asks for the faces the package ships and nothing
 * else, while a copy installed on the system still resolves through the stacks.
 *
 * @capability webfonts
 * @features contracts
 * @risk Every load asks for three files the package does not carry, filling the network panel with 404s on an install that never had them.
 */
import { spec } from '../../fixtures/behaviour.mjs'

/** The file names the page requested under the fonts route. */
const requestedFaces = (t) => t.page.evaluate(() => performance.getEntriesByType('resource')
  .map(entry => entry.name)
  .filter(name => name.includes('/dsh-claude-style/fonts/'))
  .map(name => name.slice(name.indexOf('/dsh-claude-style/fonts/') + '/dsh-claude-style/fonts/'.length)))

export default spec({ page: 'shell' }, ({ test }) => {
  test('a host without the optional faces is asked for none of them, and the faces the package ships still load', async (t) => {
    const faces = await requestedFaces(t)
    t.expectThat.equal(faces.length > 0, true, `the page asked the fonts route for the faces it ships (${faces.join(', ')})`)
    t.expectThat.equal(faces.filter(name => name.startsWith('Anthropic')), [], 'no optional face is requested')
    const registered = await t.page.evaluate(() => [...document.fonts].map(face => face.family))
    t.expectThat.equal(registered.filter(family => family.startsWith('Anthropic')), [], 'no optional face is declared')
  })
})
