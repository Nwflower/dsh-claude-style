/**
 * The inline-code ink a Claude preset override carries: the earlier `classic`
 * choice, read once from a stored form, becomes that override, and a scheme the
 * reader selected keeps its own code colour over it.
 *
 * @capability custom-brand
 * @features brand
 * @risk A reader who chose the warm ink loses it on upgrade, the default ink changes without a choice, or a scheme's own code colour is overridden.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { samePaint } from '../../fixtures/colour.mjs'

export default spec({ page: 'chat-fold' }, ({ test }) => {
  for (const scheme of ['light', 'dark']) {
    test('the earlier warm-ink choice becomes the Claude override and a reader scheme keeps its own colour in ' + scheme, async t => {
      await t.prefs({ palette: 'claude', paletteColors: 'brand', inlineCodeColor: 'palette', paletteSchemes: [], customCode: '' })
      await t.page.evaluate(({ dark, enabled }) => document.body.toggleAttribute(dark, enabled), {
        dark: t.host('shell.dark-theme'), enabled: scheme === 'dark',
      })
      await t.page.evaluate(() => {
        const code = document.createElement('code')
        code.textContent = 'inline'
        document.body.append(code)
        window.__inlineCodeSpec = code
      })
      const painted = () => t.page.evaluate(() => getComputedStyle(window.__inlineCodeSpec).color)
      const inkIs = async (hex) => samePaint(t, await painted(), hex)
      t.expectThat.equal(await inkIs(scheme === 'light' ? '#161616' : '#fdfdfd'), true, 'the default keeps the current neutral ink')
      await t.prefs({ inlineCodeColor: 'classic' })
      t.expectThat.equal(await inkIs(scheme === 'light' ? '#943333' : '#e8a08a'), true, 'the earlier choice paints the warm ink through the Claude override')
      await t.prefs({ inlineCodeColor: 'palette', paletteSchemes: ['{"id":"claude","code":{"light":"#123456","dark":"#fedcba"}}'] })
      t.expectThat.equal(await inkIs(scheme === 'light' ? '#123456' : '#fedcba'), true, 'an override names each appearance\'s own code colour')
      await t.prefs({ paletteColors: 'custom', paletteSchemes: ['{"id":"custom","base":"claude","code":{"light":"#112233","dark":"#445566"}}'] })
      t.expectThat.equal(await inkIs(scheme === 'light' ? '#112233' : '#445566'), true, 'the selected scheme keeps its own code colour')
      await t.page.evaluate(() => { window.__inlineCodeSpec.remove(); delete window.__inlineCodeSpec })
    })
  }
})
