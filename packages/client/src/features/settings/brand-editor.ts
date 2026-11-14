import * as React from 'react'
import { BRANDING_PRESET_LIMIT, BRANDING_PRESET_NAME_MAX, brandingVendorOf } from '@dsh-claude-style/contracts/branding-presets'
import type { BrandingAppearance, BrandInk } from '@dsh-claude-style/contracts/branding-presets'
import { BRAND_INK_ACCENT, BRAND_INK_ORIGINAL, BRAND_INK_TEXT } from '../../constants'
import { readPrefs, savePrefs } from '../../core/prefs'
import { cloneBrandImages, deleteBrandingPresetAssets } from '../../shared/custom-brand'
import { brandingInkOf, brandingInkPatch, brandingRecord, newBrandingPresetId, removeBrandingPresetPatch, storeBrandingPresetPatch } from '../../shared/branding-presets'
import { brandingLabel, usePageAppearance } from './brand-art'
import { Glyph } from './palette-parts'
import { createSettingsControls } from './settings-controls'
import { BrandLockup } from './settings-brand-lockup'
import type { Prefs } from '../../constants'
import { copy } from './copy'

/**
 * The editor of one brand set, the brand manager's right-hand pane: its name,
 * the appearance whose images are in hand, its ink, the lockup that edits its
 * images in place (settings-brand-lockup.ts), and the set's actions — use it,
 * copy it, delete it. The theme style's own art (`id` empty) and the built-in
 * vendor presets keep their name and images; only their ink is the reader's,
 * and a copy of them is a preset whose images can change. Only the reader's
 * presets are deleted. Every change is stored at once.
 */

const controls = createSettingsControls()

/** Whether the set `id` names stands: the theme style's art and the built-in presets always do, a reader's preset while its record is stored. */
export function brandingSetStands(prefs: Prefs, id: string) {
  return id === '' || brandingVendorOf(id) !== undefined || brandingRecord(prefs, id) !== undefined
}

/**
 * The editor of the set `id`. `open` moves the manager to another set (a copy
 * just made) and `leave` moves it off a set just deleted; `enter` is the side
 * the pane arrives from, following the set's place in the manager's list.
 */
export function BrandEditor(props: { prefs: Prefs, id: string, enter: 'above' | 'below' | null, open(id: string): void, leave(): void }) {
  const { prefs, id } = props
  const record = brandingVendorOf(id) === undefined ? brandingRecord(prefs, id) : undefined
  const page = usePageAppearance()
  const [mode, setMode] = React.useState<BrandingAppearance>(page)
  // The plate is the page's canvas, so the variant in hand follows the page when it flips.
  React.useEffect(() => setMode(page), [page])
  const [name, setName] = React.useState(record?.name ?? '')
  const [confirming, setConfirming] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  if (!brandingSetStands(prefs, id)) return null
  const selected = prefs.brandingPreset === id
  const canAdd = prefs.brandingPresets.length < BRANDING_PRESET_LIMIT
  const inkOptions: { value: BrandInk, label: string }[] = [
    { value: BRAND_INK_ORIGINAL, label: copy('brandInkOriginal') },
    { value: BRAND_INK_ACCENT, label: copy('brandInkAccent') },
    { value: BRAND_INK_TEXT, label: copy('brandInkText') },
  ]
  const run = (pending: Promise<void>) => {
    setBusy(true)
    setError(null)
    // A refusal from the host half is said under the lockup; the records stay as they were (D12).
    pending.then(() => setBusy(false), (reason: unknown) => {
      setBusy(false)
      setError(copy('brandingPresetFailed', { detail: reason instanceof Error ? reason.message : String(reason) }))
    })
  }
  const rename = (value: string) => {
    setName(value)
    if (record === undefined) return
    void savePrefs(storeBrandingPresetPatch(readPrefs(), { ...record, name: value }))
  }
  const duplicate = () => {
    run((async () => {
      const copyId = newBrandingPresetId(readPrefs())
      const cloned = await cloneBrandImages(readPrefs(), copyId, id)
      cloned.name = copy('brandingPresetCopyName', { name: brandingLabel(prefs, id) }).slice(0, BRANDING_PRESET_NAME_MAX)
      await savePrefs(storeBrandingPresetPatch(readPrefs(), cloned, true))
      props.open(copyId)
    })())
  }
  const remove = () => {
    if (record === undefined) return
    if (!confirming) {
      setConfirming(true)
      return
    }
    run((async () => {
      await savePrefs(removeBrandingPresetPatch(readPrefs(), record.id))
      await deleteBrandingPresetAssets(record.id)
      props.leave()
    })())
  }
  return React.createElement(
    'div',
    { className: 'dsh-claude-scheme-editor dsh-claude-brand-editor', 'data-enter': props.enter ?? undefined },
    React.createElement(
      'header',
      { className: 'dsh-claude-scheme-title' },
      record === undefined
        ? React.createElement('h3', { className: 'dsh-claude-scheme-name' }, brandingLabel(prefs, id))
        : React.createElement('input', {
          type: 'text',
          className: 'dsh-claude-scheme-name',
          value: name,
          maxLength: BRANDING_PRESET_NAME_MAX,
          placeholder: copy('brandingPresetDefaultName'),
          'aria-label': copy('paletteSchemeName'),
          spellCheck: false,
          autoComplete: 'off',
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => rename(event.target.value),
        }),
    ),
    React.createElement(BrandLockup, { key: mode, prefs, id, mode }),
    error === null ? null : React.createElement('div', { className: 'dsh-claude-brand-error', role: 'alert' }, error),
    React.createElement(
      'div',
      { className: 'dsh-claude-scheme-options' },
      // The theme style's art follows the page's appearance by itself: it has no variant to pick.
      id === '' ? null : React.createElement('span', { className: 'dsh-claude-scheme-seed-name' }, copy('brandingPresetVariants')),
      id === '' ? null : controls.segment<BrandingAppearance>([
        { value: 'light', label: copy('paletteLight') },
        { value: 'dark', label: copy('paletteDark') },
      ], mode, setMode),
      id === '' ? null : React.createElement('span'),
      React.createElement('span', { className: 'dsh-claude-scheme-seed-name' }, copy('brandInkTitle')),
      controls.segment<BrandInk>(inkOptions, brandingInkOf(prefs, id), ink => { void savePrefs(brandingInkPatch(readPrefs(), id, ink)) }),
    ),
    React.createElement(
      'footer',
      { className: 'dsh-claude-scheme-foot' },
      selected
        ? React.createElement('span', { className: 'dsh-claude-scheme-status' }, React.createElement(Glyph, { name: 'check' }), copy('paletteInUse'))
        : React.createElement('button', { type: 'button', className: 'dsh-claude-settings-button dsh-claude-scheme-button dsh-claude-scheme-primary', disabled: busy, onClick: () => { void savePrefs({ brandingPreset: id }) } }, copy('paletteUse')),
      canAdd ? null : React.createElement('span', { className: 'dsh-claude-scheme-limit' }, copy('brandingPresetLimit', { count: String(BRANDING_PRESET_LIMIT) })),
      React.createElement('span', { className: 'dsh-claude-scheme-foot-gap' }),
      React.createElement('button', { type: 'button', className: 'dsh-claude-settings-button dsh-claude-scheme-button', disabled: busy || !canAdd, onClick: duplicate }, copy('brandingPresetDuplicate')),
      record === undefined ? null : React.createElement('button', {
        type: 'button',
        className: 'dsh-claude-settings-button dsh-claude-scheme-button dsh-claude-scheme-danger',
        'data-confirming': confirming ? '' : undefined,
        disabled: busy,
        onClick: remove,
        onBlur: () => setConfirming(false),
      }, confirming ? copy('brandingPresetDeleteConfirm') : copy('brandingPresetDelete')),
    ),
  )
}
