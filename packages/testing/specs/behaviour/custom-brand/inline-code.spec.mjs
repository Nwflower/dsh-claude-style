/**
 * Claude's optional 0.19.7 warm inline-code ink in both schemes, with the
 * reader-authored colour card keeping precedence.
 *
 * @capability custom-brand
 * @features brand
 * @risk The classic choice changes the default palette or overrides a colour the reader authored.
 */
import { spec } from '../../fixtures/behaviour.mjs'

export default spec({ page: 'chat-fold' }, ({ test }) => {
  for (const scheme of ['light', 'dark']) {
    test('classic warm ink and custom-card precedence in ' + scheme, async t => {
      await t.prefs({ palette: 'claude', paletteColors: 'brand', inlineCodeColor: 'palette', customCode: '' })
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
      t.expectThat.equal(await colour(), scheme === 'light' ? 'rgb(148, 51, 51)' : 'rgb(232, 160, 138)', 'classic restores the 0.19.7 warm ink')
      await t.prefs({ paletteColors: 'custom', customCode: '#123456' })
      t.expectThat.equal(await colour(), 'rgb(18, 52, 86)', 'the reader-authored card keeps its own code colour')
      await t.page.evaluate(() => { window.__inlineCodeSpec.remove(); delete window.__inlineCodeSpec })
    })
  }
})
