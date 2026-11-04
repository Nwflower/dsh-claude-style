/**
 * The Brand row's switch: the sidebar's brand area leaves the page and comes
 * back, while the row the host draws it in keeps standing for the sidebar
 * toggle (theme/sidebar.css).
 *
 * @capability custom-brand
 * @features brand
 * @risk The switch writes the preference but the sidebar keeps painting the brand area, leaving an empty row where it stood.
 */
import { spec, surface } from '../../fixtures/behaviour.mjs'
import { mountSidebarBrand } from '../../fixtures/sidebar-brand.mjs'

const BRAND = `[${surface.attribute('skin.part')}~="brand-button"]`

export default spec({ page: 'chat-fold' }, ({ test }) => {
  test('the switch takes the sidebar brand area off the page and brings it back', async (t) => {
    await t.prefs({ sidebarBrand: true })
    await mountSidebarBrand(t, 'button')
    t.expectThat.visible(await t.read.box(BRAND), 'the brand area stands while the switch is on')
    await t.prefs({ sidebarBrand: false })
    t.expectThat.absent(await t.read.box(BRAND), 'the brand area goes while the switch is off')
    await t.prefs({ sidebarBrand: true })
    t.expectThat.visible(await t.read.box(BRAND), 'the brand area comes back with the switch')
  })
})
