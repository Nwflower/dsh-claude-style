import * as React from 'react'
import { BRANDING_PRESET_LIMIT } from '@dsh-claude-style/contracts/branding-presets'
import type { BrandingAppearance } from '@dsh-claude-style/contracts/branding-presets'
import { cloneBrandImages, deleteBrandingPresetAssets } from '../../shared/custom-brand'
import { newBrandingPresetId, removeBrandingPresetPatch, selectedBrandingPreset, storeBrandingPresetPatch, storedBrandingPresets } from '../../shared/branding-presets'
import type { Prefs } from '../../constants'
import type { SettingsView } from './settings-controls'
import { copy } from './copy'
import { savePrefs } from '../../core/prefs'

interface PresetBarProps {
  prefs: Prefs
  write: SettingsView['write']
  mode: BrandingAppearance
  setMode: (mode: BrandingAppearance) => void
  busy: boolean
  setBusy: (busy: boolean) => void
  setError: (message: string | null) => void
}

/** Manage named logo presets independently of the selected colour scheme. */
export function PresetBar(props: PresetBarProps) {
  const presets = storedBrandingPresets(props.prefs)
  const current = selectedBrandingPreset(props.prefs)
  const [renaming, setRenaming] = React.useState(false)
  const [name, setName] = React.useState('')
  const [confirming, setConfirming] = React.useState(false)
  const run = (pending: Promise<void>) => {
    props.setBusy(true)
    props.setError(null)
    pending.then(() => props.setBusy(false), (reason: unknown) => {
      props.setBusy(false)
      props.setError(copy('brandingPresetFailed', { detail: reason instanceof Error ? reason.message : String(reason) }))
    })
  }
  const create = () => {
    const id = newBrandingPresetId(props.prefs)
    run((async () => {
      await savePrefs(storeBrandingPresetPatch(props.prefs, { id, name: copy('brandingPresetDefaultName') }, true))
    })())
  }
  const duplicate = () => {
    const id = newBrandingPresetId(props.prefs)
    run((async () => {
      const cloned = await cloneBrandImages(id, current)
      cloned.name = current === undefined ? copy('brandingPresetLegacyCopy') : copy('brandingPresetCopyName', { name: current.name || current.id })
      await savePrefs(storeBrandingPresetPatch(props.prefs, cloned, true))
    })())
  }
  const remove = () => {
    if (current === undefined) return
    if (!confirming) {
      setConfirming(true)
      return
    }
    setConfirming(false)
    run((async () => {
      await savePrefs(removeBrandingPresetPatch(props.prefs, current.id))
      await deleteBrandingPresetAssets(current.id)
    })())
  }
  const saveName = () => {
    if (current === undefined) return
    const next = { ...current, name: name.trim().slice(0, 40) }
    run((async () => {
      await savePrefs(storeBrandingPresetPatch(props.prefs, next, true))
      setRenaming(false)
    })())
  }
  return React.createElement(
    'div',
    { className: 'dsh-claude-brand-presets', 'data-busy': props.busy ? '' : undefined },
    React.createElement(
      'select',
      {
        className: 'dsh-claude-brand-preset-select',
        value: props.prefs.brandingPreset,
        disabled: props.busy,
        'aria-label': copy('brandingPresetLabel'),
        onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
          const value = event.target.value
          run((async () => { await savePrefs({ brandingPreset: value }) })())
        },
      },
      React.createElement('option', { value: '' }, copy('brandingPresetLegacy')),
      presets.map(preset => React.createElement('option', { key: preset.id, value: preset.id }, preset.name || preset.id)),
    ),
    React.createElement('button', { type: 'button', disabled: props.busy || presets.length >= BRANDING_PRESET_LIMIT, onClick: create }, copy('brandingPresetNew')),
    React.createElement('button', { type: 'button', disabled: props.busy || presets.length >= BRANDING_PRESET_LIMIT, onClick: duplicate }, copy('brandingPresetDuplicate')),
    current === undefined ? null : React.createElement('button', { type: 'button', disabled: props.busy, onClick: () => { setName(current.name); setRenaming(true) } }, copy('brandingPresetRename')),
    current === undefined ? null : React.createElement('button', { type: 'button', disabled: props.busy, onClick: remove }, copy(confirming ? 'brandingPresetDeleteConfirm' : 'brandingPresetDelete')),
    confirming ? React.createElement('button', { type: 'button', onClick: () => setConfirming(false) }, copy('brandingPresetCancel')) : null,
    current === undefined ? null : React.createElement(
      'span',
      { className: 'dsh-claude-brand-preset-appearances', role: 'group', 'aria-label': copy('brandingPresetVariants') },
      (['light', 'dark'] as const).map(mode => React.createElement('button', {
        key: mode,
        type: 'button',
        'aria-pressed': props.mode === mode,
        onClick: () => props.setMode(mode),
      }, copy(mode === 'light' ? 'brandingPresetLight' : 'brandingPresetDark'))),
    ),
    renaming && current !== undefined ? React.createElement(
      'span',
      { className: 'dsh-claude-brand-preset-rename' },
      React.createElement('input', {
        value: name,
        maxLength: 40,
        autoFocus: true,
        'aria-label': copy('brandingPresetRename'),
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value),
        onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter') { event.preventDefault(); saveName() }
          if (event.key === 'Escape') { event.preventDefault(); setRenaming(false) }
        },
      }),
      React.createElement('button', { type: 'button', onClick: saveName }, copy('brandingPresetSave')),
    ) : null,
  )
}
