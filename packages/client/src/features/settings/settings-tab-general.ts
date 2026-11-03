import * as React from 'react'
import { AUTO_POPOVER_ACCOUNT, AUTO_POPOVER_ALL, AUTO_POPOVER_OFF, BRAND_CLAUDE, BRAND_DEEPSEEK, PAGE_ZOOM_DEFAULT, PAGE_ZOOM_MAX, PAGE_ZOOM_MIN, PALETTE_COLORING_BRAND, PALETTE_COLORING_CUSTOM, USERNAME_MAX } from '../../constants'
import { COMBINE_SVGS } from 'virtual:dsh-claude-style/generated'
import { createHostToast } from '../../shared/host-toast'
import { pageZoomPercent } from '../../shared/page-zoom'
import { PercentControl } from './settings-percent-control'
import { PreviewCards } from '../../shared/preview-cards'
import type { Prefs } from '../../constants'
import type { PreviewOption } from '../../shared/preview-cards'
import type { SegmentOption, SettingsTab, SettingsView } from './settings-controls'
import { copy } from './copy'

/**
 * The settings page's General tab: the theme style, the username, the page's
 * own scale and the hover-open popovers; the rendering engine is the sodium
 * feature's own row, placed here by its manifest (D76).
 *
 * Each tab is a `{ id, label, rows(view) }` record: `rows` runs on every
 * render of the page (packages/client/src/features/settings/settings.ts) with the page's
 * view — the preferences, the write path, the controls and the username
 * field's state.
 */
export function createSettingsGeneralTab(): SettingsTab {
  const toast = createHostToast()

  /** The name of the colour card that is keeping the page's colours fixed. */
  function paletteName(colouring: Prefs['paletteColors']) {
    if (colouring === PALETTE_COLORING_CUSTOM) return copy('paletteCustom')
    return colouring === BRAND_DEEPSEEK ? copy('brandDeepseek') : copy('brandClaude')
  }

  /**
   * The theme style renders as a grid of large cards, each carrying the
   * brand's own mark: brands are presets, not sibling tiers of one setting.
   * The stylesheet picks the mark off the logo's data-brand, so a new brand
   * is one option here plus one rule in settings-cards.css.
   */
  function themePicker(prefs: Prefs, write: SettingsView['write']) {
    const options: PreviewOption<Prefs['brand']>[] = [
      // DeepSeek's lockup is one piece of art that already draws the mark with
      // its word; Claude's card carries the mark and the word as two pieces.
      {
        value: BRAND_DEEPSEEK,
        label: copy('brandDeepseek'),
        attributes: { 'data-brand': BRAND_DEEPSEEK },
        content: React.createElement('span', {
          className: 'dsh-claude-brand-card-lockup',
          'aria-hidden': 'true',
          dangerouslySetInnerHTML: { __html: COMBINE_SVGS.deepseek },
        }),
      },
      {
        value: BRAND_CLAUDE,
        label: copy('brandClaude'),
        attributes: { 'data-brand': BRAND_CLAUDE },
        content: [
          React.createElement('span', { key: 'mark', className: 'dsh-claude-brand-card-logo', 'data-brand': BRAND_CLAUDE, 'aria-hidden': 'true' }),
          React.createElement('span', { key: 'word', className: 'dsh-claude-brand-card-word dsh-claude-masked-word', 'aria-hidden': 'true' }),
        ],
      },
    ]
    return React.createElement(PreviewCards<Prefs['brand']>, {
      cardClass: 'dsh-claude-brand-card',
      options,
      value: prefs.brand,
      write: (value: Prefs['brand']) => write({ brand: value }),
      // The card names its own brand: the two cards draw their art differently
      // (Claude's mark beside its word, DeepSeek's lockup as one piece), so the
      // card, not the art inside it, is what a reader and the lane press.
      press: (option) => {
        write({ brand: option.value })
        if (prefs.paletteColors === PALETTE_COLORING_BRAND) return
        toast.show({
          text: copy('paletteFixed', { name: paletteName(prefs.paletteColors) }),
          actions: [{
            label: copy('paletteFollowBrand'),
            onClick: () => {
              write({ paletteColors: PALETTE_COLORING_BRAND })
              toast.hide()
            },
          }],
        })
      },
    })
  }

  function rows(view: SettingsView) {
    const prefs = view.prefs
    const write = view.write
    const controls = view.controls
    const autoPopoverOptions: SegmentOption<Prefs['autoPopover']>[] = [
      { value: AUTO_POPOVER_OFF, label: copy('autoPopoverOff') },
      { value: AUTO_POPOVER_ACCOUNT, label: copy('autoPopoverAccount') },
      { value: AUTO_POPOVER_ALL, label: copy('autoPopoverAll') },
    ]
    const username = view.username
    return [
      {
        rank: 10,
        node: controls.row(
          'brand',
          copy('brandTitle'),
          copy('brandDesc'),
          themePicker(prefs, write),
          { block: true },
        ),
      },
      {
        rank: 20,
        node: controls.row(
          'username',
          copy('usernameTitle'),
          copy('usernameDesc'),
          React.createElement('input', {
            type: 'text',
            className: 'dsh-claude-settings-input',
            value: username.value,
            maxLength: USERNAME_MAX,
            placeholder: copy('usernamePlaceholder'),
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
          'pageZoom',
          copy('pageZoomTitle'),
          copy('pageZoomDesc'),
          React.createElement(PercentControl, {
            percent: pageZoomPercent(prefs.pageZoom),
            min: PAGE_ZOOM_MIN,
            max: PAGE_ZOOM_MAX,
            defaultPercent: Number(PAGE_ZOOM_DEFAULT),
            fieldLabel: copy('pageZoomPercentLabel'),
            trackLabel: copy('pageZoomTrackLabel'),
            resetLabel: copy('pageZoomReset'),
            onPick: percent => { write({ pageZoom: String(percent) }) },
            onReset: () => { write({ pageZoom: PAGE_ZOOM_DEFAULT }) },
          }),
          { experimental: true },
        ),
      },
      {
        rank: 40,
        node: controls.row(
          'autoPopover',
          copy('autoPopoverTitle'),
          copy('autoPopoverDesc'),
          controls.segment(autoPopoverOptions, prefs.autoPopover, value => { write({ autoPopover: value }) }),
        ),
      },
    ]
  }
  return { id: 'general', label: () => copy('tabGeneral'), rows }
}
