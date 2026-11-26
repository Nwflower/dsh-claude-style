import { copy } from './copy'
import type { SettingsGroup, SettingsTab, SettingsView } from './settings-controls'

/**
 * The settings page's Chat (`conversation`) tab: header and view controls above,
 * transcript presentation and message rewind below. Every row comes from its
 * owning feature manifest (D76).
 */
export function createSettingsConversationTab(): SettingsTab {
  function groups(_view: SettingsView): SettingsGroup[] {
    return [
      { id: 'conversation-header', label: () => copy('groupConversationHeader') },
      { id: 'conversation', label: () => copy('groupConversation') },
    ]
  }

  return { id: 'conversation', label: () => copy('tabConversation'), groups }
}
