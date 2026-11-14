import * as React from 'react'
import { BRANDING_PRESET_LIMIT, BRANDING_PRESET_NAME_MAX } from '@dsh-claude-style/contracts/branding-presets'
import type { BrandingAppearance, BrandingPreset } from '@dsh-claude-style/contracts/branding-presets'
import { readPrefs, savePrefs } from '../../core/prefs'
import { cloneBrandImages, deleteBrandingPresetAssets, pageAppearance } from '../../shared/custom-brand'
import { newBrandingPresetId, removeBrandingPresetPatch, storeBrandingPresetPatch, storedBrandingPresets } from '../../shared/branding-presets'
import { brandingLabel } from './brand-art'
import { Glyph } from './palette-parts'
import { createSettingsControls } from './settings-controls'
import { BrandLockup } from './settings-brand-lockup'
import type { Prefs } from '../../constants'
import { copy } from './copy'

/**
 * The editor of one brand set, the brand manager's right-hand pane: its name,
 * the appearance whose images are in hand, the lockup that edits them in place
 * (settings-brand-lockup.ts), and the set's actions — use it, copy it, delete
 * it. The images kept outside any preset (`id` empty) have one variant for
 * both appearances and no name of their own, and are never deleted. Every
 * change is stored at once.
 */

const controls = createSettingsControls()

/** The set `id` names among the stored presets; the empty id is the images kept outside any preset. */
export function brandingSet(prefs: Prefs, id: string): BrandingPreset | undefined | null {
  if (id === '') return undefined
  return storedBrandingPresets(prefs).find(preset => preset.id === id) ?? null
}

/**
 * The editor of the set `id`. `open` moves the manager to another set (a copy
 * just made) and `leave` moves it off a set just deleted; `enter` is the side
 * the pane arrives from, following the set's place in the manager's list.
 */
export function BrandEditor(props: { prefs: Prefs, id: string, enter: 'above' | 'below' | null, open(id: string): void, leave(): void }) {
  const { prefs, id } = props
  const preset = brandingSet(prefs, id)
  const [mode, setMode] = React.useState<BrandingAppearance>(pageAppearance)
  const [name, setName] = React.useState(preset?.name ?? '')
  const [confirming, setConfirming] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  if (preset === null) return null
  const selected = prefs.brandingPreset === id
  const canAdd = storedBrandingPresets(prefs).length < BRANDING_PRESET_LIMIT
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
    if (preset === undefined) return
    void savePrefs(storeBrandingPresetPatch(readPrefs(), { ...preset, name: value }))
  }
  const duplicate = () => {
    run((async () => {
      const copyId = newBrandingPresetId(readPrefs())
      const cloned = await cloneBrandImages(copyId, preset)
      cloned.name = copy('brandingPresetCopyName', { name: brandingLabel(preset) }).slice(0, BRANDING_PRESET_NAME_MAX)
      await savePrefs(storeBrandingPresetPatch(readPrefs(), cloned, true))
      props.open(copyId)
    })())
  }
  const remove = () => {
    if (preset === undefined) return
    if (!confirming) {
      setConfirming(true)
      return
    }
    run((async () => {
      await savePrefs(removeBrandingPresetPatch(readPrefs(), preset.id))
      await deleteBrandingPresetAssets(preset.id)
      props.leave()
    })())
  }
  return React.createElement(
    'div',
    { className: 'dsh-claude-scheme-editor dsh-claude-brand-editor', 'data-enter': props.enter ?? undefined },
    React.createElement(
      'header',
      { className: 'dsh-claude-scheme-title' },
      preset === undefined
        ? React.createElement('h3', { className: 'dsh-claude-scheme-name' }, brandingLabel(undefined))
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
    // The images kept outside any preset are one variant for both appearances: there is no other to pick.
    preset === undefined ? null : React.createElement(
      'div',
      { className: 'dsh-claude-scheme-options' },
      React.createElement('span', { className: 'dsh-claude-scheme-seed-name' }, copy('brandingPresetVariants')),
      controls.segment<BrandingAppearance>([
        { value: 'light', label: copy('paletteLight') },
        { value: 'dark', label: copy('paletteDark') },
      ], mode, setMode),
    ),
    React.createElement(BrandLockup, { key: mode, prefs, preset, mode }),
    error === null ? null : React.createElement('div', { className: 'dsh-claude-brand-error', role: 'alert' }, error),
    React.createElement(
      'footer',
      { className: 'dsh-claude-scheme-foot' },
      selected
        ? React.createElement('span', { className: 'dsh-claude-scheme-status' }, React.createElement(Glyph, { name: 'check' }), copy('paletteInUse'))
        : React.createElement('button', { type: 'button', className: 'dsh-claude-settings-button dsh-claude-scheme-button dsh-claude-scheme-primary', disabled: busy, onClick: () => { void savePrefs({ brandingPreset: id }) } }, copy('paletteUse')),
      canAdd ? null : React.createElement('span', { className: 'dsh-claude-scheme-limit' }, copy('brandingPresetLimit', { count: String(BRANDING_PRESET_LIMIT) })),
      React.createElement('span', { className: 'dsh-claude-scheme-foot-gap' }),
      React.createElement('button', { type: 'button', className: 'dsh-claude-settings-button dsh-claude-scheme-button', disabled: busy || !canAdd, onClick: duplicate }, copy('brandingPresetDuplicate')),
      preset === undefined ? null : React.createElement('button', {
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
