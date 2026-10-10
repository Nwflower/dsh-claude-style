import { SEARCH_STYLE_ICON, SEARCH_STYLE_OVERLAY, SEARCH_STYLE_STANDALONE } from '../../constants'
import { settingsCopy } from '../../core/i18n'
import type { SettingsRow, SettingsTab, SettingsView } from './settings-controls'

/**
 * The settings page's Sidebar tab: the footer takeover, the search box and
 * the In progress / Archived view — three feature switches placed here by
 * their manifests (D42) — and the right sidebar's docked panels, whose look
 * belongs to no feature (packages/client/src/theme/chrome.css), so the tab
 * writes that one row itself.
 *
 * The search box's own style row belongs to the search feature too, and
 * follows its switch as a sub-row: a manifest carries one row, so the row
 * under it is written here, disabled while the box itself is off.
 */
export function createSettingsSidebarTab(): SettingsTab {
  const rows = (view: SettingsView): SettingsRow[] => {
    const prefs = view.prefs
    const write = view.write
    const controls = view.controls
    const searchOn = prefs.sidebarSearch !== false
    const searchStyleOptions = [
      { value: SEARCH_STYLE_ICON, label: settingsCopy('searchStyleIcon', 'Icon') },
      { value: SEARCH_STYLE_OVERLAY, label: settingsCopy('searchStyleOverlay', 'Cover the brand') },
      { value: SEARCH_STYLE_STANDALONE, label: settingsCopy('searchStyleStandalone', 'Standalone') },
    ]
    return [
      {
        rank: 30,
        node: controls.subRow(
          'searchStyle',
          settingsCopy('searchStyleTitle', 'Search box style'),
          settingsCopy('searchStyleDesc', 'Choose the search box style'),
          controls.segment(searchStyleOptions, prefs.searchStyle, value => { write({ searchStyle: value }) }, !searchOn),
          searchOn,
        ),
      },
      {
        rank: 40,
        node: controls.row(
          'dockCards',
          settingsCopy('dockCardsTitle', 'Float docked panels'),
          settingsCopy('dockCardsDesc', 'Draw the right sidebar\'s docked panels as floating cards: 8px inside the column, a 16px radius, a hairline and an elevation. Off fills the column and hugs its edges; a split gives each pane its own column.'),
          view.controls.toggle(view.prefs.dockCards !== false, value => { view.write({ dockCards: value }) }),
        ),
      },
    ]
  }
  return { id: 'sidebar', label: () => settingsCopy('tabSidebar', 'Sidebar'), rows }
}
