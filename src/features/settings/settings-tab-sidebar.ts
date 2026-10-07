import { settingsCopy } from '../../core/i18n'
import type { SettingsTab, SettingsView } from './settings-controls'

/**
 * The settings page's Sidebar tab: the footer takeover, the search box and
 * the In progress / Archived view.
 */
export function createSettingsSidebarTab(): SettingsTab {
  function rows(view: SettingsView) {
    const prefs = view.prefs
    const write = view.write
    const controls = view.controls
    return [
      controls.row(
        'collapseFooter',
        settingsCopy('collapseTitle', 'Collapse the sidebar settings area'),
        settingsCopy('collapseDesc', 'Fold the sidebar footer\'s settings entry into the account popover. Off restores the host\'s footer.'),
        controls.toggle(prefs.collapseFooter, value => { write({ collapseFooter: value }) }),
      ),
      controls.row(
        'sidebarSearch',
        settingsCopy('searchTitle', 'Sidebar search'),
        settingsCopy('searchDesc', 'A search box in the sidebar\'s brand row that finds sessions, projects, plugins, Skills and shortcuts. Off restores the host\'s brand row.'),
        controls.toggle(prefs.sidebarSearch, value => { write({ sidebarSearch: value }) }),
      ),
      controls.row(
        'workspaceView',
        settingsCopy('workspaceTitle', 'In progress / Archived view'),
        settingsCopy('workspaceDesc', 'Split the sidebar\'s workspace section into In progress and Archived; archived conversations can be restored or deleted. Off restores the host\'s workspace list.'),
        controls.toggle(prefs.workspaceView, value => { write({ workspaceView: value }) }),
      ),
    ]
  }
  return { id: 'sidebar', label: () => settingsCopy('tabSidebar', 'Sidebar'), rows }
}
