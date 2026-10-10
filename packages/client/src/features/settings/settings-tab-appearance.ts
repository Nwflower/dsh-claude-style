import * as React from 'react'
import { MASCOT_BRAND, MASCOT_CRAB, MASCOT_DEEPY, MASCOT_OFF, MASCOT_SCOPE_ALL, MASCOT_SCOPE_HOME, PALETTE_CLAUDE, PALETTE_HOST, TYPEFACE_CLAUDE, TYPEFACE_HOST } from '../../constants'
import { settingsCopy } from '../../core/i18n'
import { resolveMascot } from '../../core/prefs'
import type { SettingsTab, SettingsView } from './settings-controls'

/**
 * The settings page's Appearance tab: who paints the colours and sets the
 * type, and the mascot with where it stands.
 */
export function createSettingsAppearanceTab(): SettingsTab {
  function rows(view: SettingsView) {
    const prefs = view.prefs
    const write = view.write
    const controls = view.controls
    const paletteOptions = [
      { value: PALETTE_CLAUDE, label: settingsCopy('paletteClaude', 'Claude') },
      { value: PALETTE_HOST, label: settingsCopy('paletteHost', 'Follow the host') },
    ]
    const typefaceOptions = [
      { value: TYPEFACE_CLAUDE, label: settingsCopy('typefaceClaude', 'Claude') },
      { value: TYPEFACE_HOST, label: settingsCopy('typefaceHost', 'Follow the host') },
    ]
    const mascotOptions = [
      { value: MASCOT_BRAND, label: settingsCopy('mascotBrand', 'Follow the brand') },
      { value: MASCOT_CRAB, label: settingsCopy('mascotCrab', 'Crab') },
      { value: MASCOT_DEEPY, label: settingsCopy('mascotDeepy', 'Deepy') },
      { value: MASCOT_OFF, label: settingsCopy('mascotOff', 'Off') },
    ]
    const mascotScopeOptions = [
      { value: MASCOT_SCOPE_HOME, label: settingsCopy('mascotScopeHome', 'Home') },
      { value: MASCOT_SCOPE_ALL, label: settingsCopy('mascotScopeAll', 'Home and conversation') },
    ]
    const mascotShown = resolveMascot(prefs) !== MASCOT_OFF
    return [
      {
        rank: 10,
        node: controls.row(
          'palette',
          settingsCopy('paletteTitle', 'Colours'),
          settingsCopy('paletteDesc', 'Claude uses the skin\'s own colours; Follow the host leaves the colours to DSH and to other theme plugins (a wallpaper plugin, say), and the skin keeps only its layout and controls.'),
          controls.segment(paletteOptions, prefs.palette, value => { write({ palette: value }) }),
        ),
      },
      {
        rank: 20,
        node: controls.row(
          'typeface',
          settingsCopy('typefaceTitle', 'Typefaces'),
          settingsCopy('typefaceDesc', 'Claude uses the Anthropic faces (or the lookalike Inter and Noto Serif when they are missing) and JetBrains Mono for code; Follow the host keeps the fonts DSH or another plugin sets.'),
          controls.segment(typefaceOptions, prefs.typeface, value => { write({ typeface: value }) }),
        ),
      },
      {
        rank: 30,
        node: controls.row(
          'mascot',
          settingsCopy('mascotTitle', 'Mascot'),
          settingsCopy('mascotDesc', 'The pixel companion on the input area\'s top edge, animated by what the agent is doing. Follow the brand shows the pixel crab under Claude and Deepy the whale under DeepSeek.'),
          controls.segment(mascotOptions, prefs.mascot, value => { write({ mascot: value }) }),
        ),
      },
      {
        rank: 40,
        node: controls.subRow(
          'mascotScope',
          settingsCopy('mascotScopeTitle', 'Where it appears'),
          settingsCopy('mascotScopeDesc', 'The new-conversation page alone, or the new-conversation page and the conversation.'),
          controls.segment(mascotScopeOptions, prefs.mascotScope, value => { write({ mascotScope: value }) }, !mascotShown),
          mascotShown,
        ),
      },
    ]
  }
  return { id: 'appearance', label: () => settingsCopy('tabAppearance', 'Appearance'), rows }
}
