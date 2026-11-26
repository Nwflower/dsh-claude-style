import * as React from 'react'
import { COMPOSER_SCOPE_OFF } from '../../constants'
import { copy } from './copy'
import type { SettingsGroup, SettingsRow, SettingsTab, SettingsView } from './settings-controls'

/**
 * The settings page's Composer (`composer`) tab: the input restyle, permission
 * and model controls above, and the composer's context meter and live statistics
 * bar below. Feature rows come from their manifests (D76); this tab adds the
 * imperative quick-provider trigger under `modelPicker`.
 */
export function createSettingsComposerTab(): SettingsTab {
  /** What the quick-provider trigger reads: how many, or nothing chosen. */
  function quickSummary(chosen: string[]) {
    if (chosen.length === 0) return copy('quickNone')
    return copy('quickCount', { count: chosen.length })
  }

  /**
   * The model-picker group's imperative quick-provider sub-row. Folds away with
   * the other `modelPicker` sub-rows while `modelPicker` is off, and dims while
   * the composer restyle itself is off.
   */
  function composerRows(view: SettingsView): SettingsRow[] {
    const { prefs, write, quickTrigger } = view
    if (!prefs.modelPicker) return []
    const pickerOn = prefs.composerScope !== COMPOSER_SCOPE_OFF
    return [
      {
        rank: 40,
        node: view.controls.subRow(
          'quickProviders',
          copy('quickTitle'),
          copy('quickDesc'),
          React.createElement('button', {
            type: 'button',
            ref: quickTrigger,
            className: 'dsh-claude-settings-picker',
            disabled: !pickerOn,
            'aria-haspopup': 'menu',
            'aria-expanded': 'false',
            onClick() {
              const api = view.quickProviderApi()
              if (api === null || quickTrigger.current === null) return
              api.toggle(quickTrigger.current, next => { write({ quickProviders: next }) })
            },
          }, quickSummary(prefs.quickProviders)),
          pickerOn,
        ),
      },
    ]
  }

  function groups(_view: SettingsView): SettingsGroup[] {
    return [
      { id: 'composer', label: () => copy('groupComposer'), rows: composerRows },
      { id: 'statistics', label: () => copy('groupStatistics') },
    ]
  }

  return { id: 'composer', label: () => copy('tabComposer'), groups }
}
