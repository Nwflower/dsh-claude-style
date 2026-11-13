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
      const colour = () => t.page.evaluate(() => getComputedStyle(window.__inlineCodeSpec).color)
      t.expectThat.equal(await colour(), scheme === 'light' ? 'rgb(22, 22, 22)' : 'rgb(253, 253, 253)', 'the default keeps the current neutral ink')
      await t.prefs({ inlineCodeColor: 'classic' })
      t.expectThat.equal(await colour(), scheme === 'light' ? 'rgb(148, 51, 51)' : 'rgb(232, 160, 138)', 'the earlier choice paints the warm ink through the Claude override')
      await t.prefs({ inlineCodeColor: 'palette', paletteSchemes: ['{"id":"claude","code":{"light":"#123456","dark":"#fedcba"}}'] })
      t.expectThat.equal(await colour(), scheme === 'light' ? 'rgb(18, 52, 86)' : 'rgb(254, 220, 186)', 'an override names each appearance\'s own code colour')
      await t.prefs({ paletteColors: 'custom', paletteSchemes: ['{"id":"custom","base":"claude","code":{"light":"#112233","dark":"#445566"}}'] })
      t.expectThat.equal(await colour(), scheme === 'light' ? 'rgb(17, 34, 51)' : 'rgb(68, 85, 102)', 'the selected scheme keeps its own code colour')
      await t.page.evaluate(() => { window.__inlineCodeSpec.remove(); delete window.__inlineCodeSpec })
    })
  }
})
