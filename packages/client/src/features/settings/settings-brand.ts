import * as React from 'react'
import { BRAND_INK_ACCENT, BRAND_INK_ORIGINAL, BRAND_INK_TEXT } from '../../constants'
import { BrandLockup } from './settings-brand-lockup'
import type { SegmentOption, SettingsRow, SettingsView } from './settings-controls'
import type { Prefs } from '../../constants'
import { copy } from './copy'

/**
 * The Appearance tab's custom brand rows (D96), which open the tab: the switch
 * that keeps the sidebar's brand area on the page, then the brand area drawn as
 * the lockup the reader edits in place (settings-brand-lockup.ts), with how the
 * images are inked as its sub-row. The name and the two images are the reader's
 * own data, written through the page's write path and the host half's brand
 * routes, so the lockup edits the same values the sidebar paints.
 */

/**
 * The custom brand rows, ranked ahead of every other row on the tab: the switch
 * that keeps the sidebar's brand area on the page, the lockup the reader edits in
 * place under it (titleless), and how
 * the images are inked as that block's sub-row.
 */
export function brandRows(view: SettingsView): SettingsRow[] {
  const { prefs, write } = view
  const inkOptions: SegmentOption<Prefs['brandInk']>[] = [
    { value: BRAND_INK_ORIGINAL, label: copy('brandInkOriginal') },
    { value: BRAND_INK_ACCENT, label: copy('brandInkAccent') },
    { value: BRAND_INK_TEXT, label: copy('brandInkText') },
  ]
  return [
    {
      rank: 5,
      node: view.controls.row(
        'sidebarBrand',
        copy('brandLockupTitle'),
        copy('brandLockupDesc'),
        view.controls.toggle(prefs.sidebarBrand, on => { write({ sidebarBrand: on }) }),
      ),
    },
    {
      rank: 6,
      node: view.controls.row(
        'brandLockup',
        null,
        null,
        React.createElement(BrandLockup, { prefs, write }),
        { block: true },
      ),
    },
    {
      rank: 7,
      node: view.controls.subRow(
        'brandInk',
        copy('brandInkTitle'),
        copy('brandInkDesc'),
        view.controls.segment(inkOptions, prefs.brandInk, value => { write({ brandInk: value }) }),
        true,
      ),
    },
  ]
}
