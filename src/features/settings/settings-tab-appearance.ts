import * as React from 'react'
import { BRAND_CLAUDE, BRAND_DEEPSEEK, MASCOT_BRAND, MASCOT_CRAB, MASCOT_DEEPY, MASCOT_OFF, MASCOT_SCOPE_ALL, MASCOT_SCOPE_HOME, PALETTE_CLAUDE, PALETTE_HOST, TYPEFACE_CLAUDE, TYPEFACE_HOST } from '../../constants'
import { settingsCopy } from '../../core/i18n'
import { resolveMascot } from '../../core/prefs'
import type { Prefs } from '../../constants'
import type { SettingsTab, SettingsView } from './settings-controls'

/**
 * The settings page's Appearance tab: the brand, who paints the colours and
 * sets the type, and the mascot with where it stands.
 *
 * The brand choice renders as a grid of large cards, each carrying the
 * brand's own mark: brands are presets, not sibling tiers of one setting.
 */
export function createSettingsAppearanceTab(): SettingsTab {
  function brandPicker(prefs: Prefs, write: SettingsView['write']) {
    const brandOptions = [
      { value: BRAND_DEEPSEEK, label: settingsCopy('brandDeepseek', 'DeepSeek') },
      { value: BRAND_CLAUDE, label: settingsCopy('brandClaude', 'Claude') },
    ]
    // One card per brand: the brand's own mark above its name, the active
    // card outlined in the brand accent. The stylesheet picks the mark off
    // the logo's data-brand, so a new brand is one option here plus one
    // rule in settings.css.
    return React.createElement(
      'div',
      { className: 'dsh-claude-brand-picker', role: 'group' },
      brandOptions.map(option => React.createElement(
        'button',
        {
          key: option.value,
          type: 'button',
          className: 'dsh-claude-brand-card',
          'data-active': option.value === prefs.brand ? '' : undefined,
          'aria-pressed': option.value === prefs.brand ? 'true' : 'false',
          onClick: () => { if (option.value !== prefs.brand) write({ brand: option.value }) },
        },
        React.createElement('span', { className: 'dsh-claude-brand-card-logo', 'data-brand': option.value }),
        React.createElement('span', { className: 'dsh-claude-brand-card-name' }, option.label),
      )),
    )
  }

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
          'brand',
          settingsCopy('brandTitle', 'Brand mark'),
          settingsCopy('brandDesc', 'The brand mark in the sidebar and on the home page, and its colour family: warm for Claude, blue for DeepSeek. While Colours is set to Follow the host, only the mark changes.'),
          brandPicker(prefs, write),
          true,
        ),
      },
      {
        rank: 20,
        node: controls.row(
          'palette',
          settingsCopy('paletteTitle', 'Colours'),
          settingsCopy('paletteDesc', 'Claude uses the skin\'s own colours; Follow the host leaves the colours to DSH and to other theme plugins (a wallpaper plugin, say), and the skin keeps only its layout and controls.'),
          controls.segment(paletteOptions, prefs.palette, value => { write({ palette: value }) }),
        ),
      },
      {
        rank: 30,
        node: controls.row(
          'typeface',
          settingsCopy('typefaceTitle', 'Typefaces'),
          settingsCopy('typefaceDesc', 'Claude uses the Anthropic faces (or the lookalike Inter and Noto Serif when they are missing) and JetBrains Mono for code; Follow the host keeps the fonts DSH or another plugin sets.'),
          controls.segment(typefaceOptions, prefs.typeface, value => { write({ typeface: value }) }),
        ),
      },
      {
        rank: 40,
        node: controls.row(
          'mascot',
          settingsCopy('mascotTitle', 'Mascot'),
          settingsCopy('mascotDesc', 'The pixel companion on the input area\'s top edge, animated by what the agent is doing. Follow the brand shows the pixel crab under Claude and Deepy the whale under DeepSeek.'),
          controls.segment(mascotOptions, prefs.mascot, value => { write({ mascot: value }) }),
          true,
        ),
      },
      {
        rank: 50,
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
