/**
 * The sidebar's mark and wordmark follow the reader's logo ink on the macOS
 * desktop span and the web/Windows button, through both colour schemes.
 *
 * @capability custom-brand
 * @features brand, shared
 * @risk The macOS desktop brand stays black or white after the reader selects the accent because its non-interactive span misses a button-only colour rule.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { mountSidebarBrand, readSidebarBrandInk } from '../../fixtures/sidebar-brand.mjs'

export default spec({ page: 'chat-fold' }, ({ test }) => {
  for (const tag of ['span', 'button']) {
    for (const scheme of ['light', 'dark']) {
      test(`${tag} brand art follows each logo ink in ${scheme} mode`, async (t) => {
        await t.prefs({ brand: 'claude', palette: 'claude', paletteColors: 'brand', brandInk: 'original' })
        await t.page.evaluate(({ dark, scheme }) => document.body.toggleAttribute(dark, scheme === 'dark'), {
          dark: t.host('shell.dark-theme'), scheme,
        })
        await mountSidebarBrand(t, tag)
        for (const patch of [
          { brandInk: 'original' },
          { brandInk: 'accent' },
          { brandInk: 'text' },
          { brandInk: 'accent', paletteColors: 'custom', customAccent: '#e53935' },
        ]) {
          await t.prefs(patch)
          const { expected, art } = await readSidebarBrandInk(t)
          t.expectThat.equal(art.length, 2, 'both the mark and wordmark are present')
          for (const { part, fill, mask } of art) {
            t.expectThat.equal(mask !== 'none', true, `${part} is drawn as brand art`)
            t.expectThat.equal(fill, expected, `${tag} ${part} takes the ${patch.brandInk} ink in ${scheme} mode`)
          }
        }
      })
    }
  }
})
