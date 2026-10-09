import { settingsCopy } from '../../core/i18n'
import type { SettingsRow, SettingsTab, SettingsView } from './settings-controls'

/**
 * The settings page's Sidebar tab: the footer takeover, the search box and
 * the In progress / Archived view — three feature switches placed here by
 * their manifests (D42) — and the right sidebar's docked panels, whose look
 * belongs to no feature (packages/client/src/theme/chrome.css), so the tab
 * writes that one row itself.
 */
export function createSettingsSidebarTab(): SettingsTab {
  const rows = (view: SettingsView): SettingsRow[] => [{
    rank: 40,
    node: view.controls.row(
      'dockCards',
      settingsCopy('dockCardsTitle', 'Float docked panels'),
      settingsCopy('dockCardsDesc', 'Draw the right sidebar\'s docked panels as floating cards: 8px inside the column, a 16px radius, a hairline and an elevation. Off fills the column and hugs its edges; a split gives each pane its own column.'),
      view.controls.toggle(view.prefs.dockCards !== false, value => { view.write({ dockCards: value }) }),
    ),
  }]
  return { id: 'sidebar', label: () => settingsCopy('tabSidebar', 'Sidebar'), rows }
}
