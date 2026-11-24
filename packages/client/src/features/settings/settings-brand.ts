import { brandCardsNode, brandManageButton } from './brand-cards'
import type { SettingsRow, SettingsView } from './settings-controls'
import { copy } from './copy'

/**
 * The Appearance tab's custom brand rows (D97), which open the tab: the switch
 * that keeps the sidebar's brand area on the page with the brand manager's door
 * beside it, and the card of the set the page paints under it
 * (brand-cards.ts). The card and the door stand while the switch is on; the
 * sets themselves — their images, their ink, which one is used — are edited in
 * the manager (brand-manager.ts), which writes the same values the sidebar
 * paints.
 */
export function brandRows(view: SettingsView): SettingsRow[] {
  const { prefs, write } = view
  return [
    {
      rank: 5,
      node: view.controls.row(
        'sidebarBrand',
        copy('brandLockupTitle'),
        null,
        view.controls.toggle(prefs.sidebarBrand, on => { write({ sidebarBrand: on }) }),
        { lead: prefs.sidebarBrand ? brandManageButton() : null },
      ),
    },
    ...(prefs.sidebarBrand ? [{ rank: 6, node: brandCardsNode(view) }] : []),
  ]
}
