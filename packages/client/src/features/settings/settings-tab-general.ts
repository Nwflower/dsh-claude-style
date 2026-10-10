import * as React from 'react'
import { AUTO_POPOVER_ACCOUNT, AUTO_POPOVER_ALL, AUTO_POPOVER_OFF, BAN_LOCALE_EN, BAN_LOCALE_ZH, BRAND_CLAUDE, BRAND_DEEPSEEK, MOTION_FULL, MOTION_REDUCED, MOTION_SYSTEM, USERNAME_MAX } from '../../constants'
import { settingsCopy } from '../../core/i18n'
import type { Prefs } from '../../constants'
import type { SettingsTab, SettingsView } from './settings-controls'

/**
 * The settings page's General tab: the theme style, the username, the
 * animation choice, the hover-open popovers and the account-hold easter
 * egg's language.
 *
 * Each tab is a `{ id, label, rows(view) }` record: `rows` runs on every
 * render of the page (packages/client/src/features/settings/settings.ts) with the page's
 * view — the preferences, the write path, the controls and the username
 * field's state.
 */
export function createSettingsGeneralTab(): SettingsTab {
  /**
   * The theme style renders as a grid of large cards, each carrying the
   * brand's own mark: brands are presets, not sibling tiers of one setting.
   * The stylesheet picks the mark off the logo's data-brand, so a new brand
   * is one option here plus one rule in settings.css.
   */
  function themePicker(prefs: Prefs, write: SettingsView['write']) {
    const brandOptions = [
      { value: BRAND_DEEPSEEK, label: settingsCopy('brandDeepseek', 'DeepSeek') },
      { value: BRAND_CLAUDE, label: settingsCopy('brandClaude', 'Claude') },
    ]
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
    const motionOptions = [
      { value: MOTION_SYSTEM, label: settingsCopy('motionSystem', 'Follow the system') },
      { value: MOTION_REDUCED, label: settingsCopy('motionReduced', 'Reduced') },
      { value: MOTION_FULL, label: settingsCopy('motionFull', 'Always') },
    ]
    const autoPopoverOptions = [
      { value: AUTO_POPOVER_OFF, label: settingsCopy('autoPopoverOff', 'Off') },
      { value: AUTO_POPOVER_ACCOUNT, label: settingsCopy('autoPopoverAccount', 'Account only') },
      { value: AUTO_POPOVER_ALL, label: settingsCopy('autoPopoverAll', 'All') },
    ]
    const banLocaleOptions = [
      { value: BAN_LOCALE_ZH, label: settingsCopy('banLocaleZh', '中文') },
      { value: BAN_LOCALE_EN, label: settingsCopy('banLocaleEn', 'English') },
    ]
    const username = view.username
    return [
      {
        rank: 10,
        node: controls.row(
          'brand',
          settingsCopy('brandTitle', 'Theme style'),
          settingsCopy('brandDesc', 'The brand mark in the sidebar and on the home page, and its colour family: warm for Claude, blue for DeepSeek. While Colours is set to Follow the host, only the mark changes.'),
          themePicker(prefs, write),
          true,
        ),
      },
      {
        rank: 20,
        node: controls.row(
          'username',
          settingsCopy('usernameTitle', 'Username'),
          settingsCopy('usernameDesc', 'The name shown in the new-conversation greeting and the account row. Leave empty to use the signed-in account name, then the HDSL launcher name, then the local system user.'),
          React.createElement('input', {
            type: 'text',
            className: 'dsh-claude-settings-input',
            value: username.value,
            maxLength: USERNAME_MAX,
            placeholder: settingsCopy('usernamePlaceholder', 'Auto-detect account or host user'),
            spellCheck: false,
            autoComplete: 'off',
            onChange: username.onChange,
            onBlur: username.onBlur,
            onKeyDown: username.onKeyDown,
          }),
        ),
      },
      {
        rank: 30,
        node: controls.row(
          'motion',
          settingsCopy('motionTitle', 'Animation'),
          settingsCopy('motionDesc', 'Follow the system keeps the system\'s animation setting in charge; Reduced holds animations on their still frame; Always plays them. The background-work ring turns in every setting.'),
          controls.segment(motionOptions, prefs.motion, value => { write({ motion: value }) }),
        ),
      },
      {
        rank: 40,
        node: controls.row(
          'autoPopover',
          settingsCopy('autoPopoverTitle', 'Open popovers on hover'),
          settingsCopy('autoPopoverDesc', 'Which popovers open on hover. "Account only" keeps it to the sidebar account popover; "All" adds the permission, model, session-stats and home-page pickers. Off leaves every popover click-to-open.'),
          controls.segment(autoPopoverOptions, prefs.autoPopover, value => { write({ autoPopover: value }) }),
        ),
      },
      {
        rank: 50,
        node: controls.row(
          'banLocale',
          settingsCopy('banLocaleTitle', 'Account-hold easter egg language'),
          settingsCopy('banLocaleDesc', 'The language of the account-hold easter egg page (open it from the account row at the top of the sidebar footer popover). It does not follow the interface language.'),
          controls.segment(banLocaleOptions, prefs.banLocale, value => { write({ banLocale: value }) }),
        ),
      },
    ]
  }
  return { id: 'general', label: () => settingsCopy('tabGeneral', 'General'), rows }
}
