import * as React from 'react'
import { HOME_LAYOUT_CLASSIC, HOME_LAYOUT_STUDIO } from '../../constants'
import { settingsCopy } from '../../core/i18n'
import type { SettingsTab, SettingsView } from './settings-controls'

/**
 * The settings page's Composer tab: the composer restyle's scope, the home
 * layout, the model picker with its quick providers, and the permission
 * control. The effort slider rides the model picker: the host keeps its
 * own effort choice inside its own model menu, so the two go together.
 */
export function createSettingsComposerTab(): SettingsTab {
  /** What the quick-provider trigger reads: how many, or nothing chosen. */
  function quickSummary(chosen: string[]) {
    if (chosen.length === 0) return settingsCopy('quickNone', 'None')
    return settingsCopy('quickCount', '{count} providers', { count: chosen.length })
  }

  function rows(view: SettingsView) {
    const prefs = view.prefs
    const write = view.write
    const controls = view.controls
    const scopeOptions = [
      { value: 'off', label: settingsCopy('scopeOff', 'Off') },
      { value: 'hero', label: settingsCopy('scopeHero', 'Home only') },
      { value: 'conversation', label: settingsCopy('scopeConversation', 'Conversation only') },
      { value: 'all', label: settingsCopy('scopeAll', 'All') },
    ]
    const homeLayoutOptions = [
      { value: HOME_LAYOUT_CLASSIC, label: settingsCopy('homeClassic', 'Classic') },
      { value: HOME_LAYOUT_STUDIO, label: settingsCopy('homeStudio', 'Studio') },
    ]
    const quickTrigger = view.quickTrigger
    return [
      controls.row(
        'composerScope',
        settingsCopy('composerTitle', 'Composer restyle'),
        settingsCopy('composerDesc', 'Which input area the skin restyles: the new-conversation page, the conversation, or both. Off restores the host\'s composer.'),
        controls.segment(scopeOptions, prefs.composerScope, value => { write({ composerScope: value }) }),
      ),
      controls.row(
        'homeLayout',
        settingsCopy('homeTitle', 'Home layout'),
        settingsCopy('homeDesc', 'The new-conversation page layout. Classic is the centered hero with the input card; Studio moves the greeting to the top left, pins the composer to the bottom and shows usage in between.'),
        controls.segment(homeLayoutOptions, prefs.homeLayout, value => { write({ homeLayout: value }) }),
      ),
      controls.row(
        'modelPicker',
        settingsCopy('pickerTitle', 'Redraw the model picker'),
        settingsCopy('pickerDesc', 'Replace the composer\'s model menu with the two-level Claude-style menu. Off restores the host\'s model menu.'),
        controls.toggle(prefs.modelPicker, value => { write({ modelPicker: value }) }),
      ),
      controls.subRow(
        'quickProviders',
        settingsCopy('quickTitle', 'Quick providers'),
        settingsCopy('quickDesc', 'Picked providers follow the official service in the picker\'s first level, one rule between providers. A provider removed from the catalog stays in the list marked "Removed"; uncheck it to clear it.'),
        React.createElement('button', {
          type: 'button',
          ref: quickTrigger,
          className: 'dsh-claude-settings-picker',
          disabled: !prefs.modelPicker,
          'aria-haspopup': 'menu',
          'aria-expanded': 'false',
          onClick() {
            const api = view.quickProviderApi()
            if (api === null || quickTrigger.current === null) return
            api.toggle(quickTrigger.current, next => { write({ quickProviders: next }) })
          },
        }, quickSummary(prefs.quickProviders)),
        prefs.modelPicker,
      ),
      controls.row(
        'permissionsControl',
        settingsCopy('permissionsTitle', 'Redraw the permission control'),
        settingsCopy('permissionsDesc', 'Replace the composer\'s permission menu with a segmented control and move the session numbers into the context popover. Off restores the host\'s permission menu and statistics dialogs.'),
        controls.toggle(prefs.permissionsControl, value => { write({ permissionsControl: value }) }),
      ),
    ]
  }
  return { id: 'composer', label: () => settingsCopy('tabComposer', 'Composer'), rows }
}
