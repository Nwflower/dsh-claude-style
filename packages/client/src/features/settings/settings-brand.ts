import { BRAND_INK_ACCENT, BRAND_INK_ORIGINAL, BRAND_INK_TEXT } from '../../constants'
import { brandCardsNode, brandManageButton } from './brand-cards'
import type { SegmentOption, SettingsRow, SettingsView } from './settings-controls'
import type { Prefs } from '../../constants'
import { copy } from './copy'

/**
 * The Appearance tab's custom brand rows (D97), which open the tab: the switch
 * that keeps the sidebar's brand area on the page with the brand manager's door
 * beside it, the cards of the brand sets under it (brand-cards.ts), and how the
 * images are inked as that block's sub-row. The cards and the door stand while
 * the switch is on; the sets themselves are edited in the manager
 * (brand-manager.ts), which writes the same values the sidebar paints.
 */
export function brandRows(view: SettingsView): SettingsRow[] {
  const { prefs, write } = view
  const inkOptions: SegmentOption<Prefs['brandInk']>[] = [
    { value: BRAND_INK_ORIGINAL, label: copy('brandInkOriginal') },
    { value: BRAND_INK_ACCENT, label: copy('brandInkAccent') },
    { value: BRAND_INK_TEXT, label: copy('brandInkText') },
  ]
  return [
    {
      rank: 5,
      node: view.controls.row(
        'sidebarBrand',
        copy('brandLockupTitle'),
        copy('brandLockupDesc'),
        view.controls.toggle(prefs.sidebarBrand, on => { write({ sidebarBrand: on }) }),
        { lead: prefs.sidebarBrand ? brandManageButton() : null },
      ),
    },
    ...(prefs.sidebarBrand ? [{ rank: 6, node: brandCardsNode(view) }] : []),
    {
      rank: 7,
      node: view.controls.subRow(
        'brandInk',
        copy('brandInkTitle'),
        copy('brandInkDesc'),
        view.controls.segment(inkOptions, prefs.brandInk, value => { write({ brandInk: value }) }),
        true,
      ),
    },
  ]
}
