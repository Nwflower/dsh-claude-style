import { BRANDING_PRESET_LIMIT, findBrandingPreset, parseBrandingPreset, serializeBrandingPreset } from '@dsh-claude-style/contracts/branding-presets'
import type { BrandingPreset } from '@dsh-claude-style/contracts/branding-presets'
import type { Prefs } from '../constants'

export function storedBrandingPresets(prefs: Prefs) {
  return prefs.brandingPresets.map(parseBrandingPreset)
}

export function selectedBrandingPreset(prefs: Prefs) {
  return prefs.brandingPreset === '' ? undefined : findBrandingPreset(prefs.brandingPresets, prefs.brandingPreset)
}

export function storeBrandingPresetPatch(prefs: Prefs, preset: BrandingPreset, select = false): Partial<Prefs> {
  const text = serializeBrandingPreset(preset)
  const records = prefs.brandingPresets.filter(entry => parseBrandingPreset(entry).id !== preset.id)
  records.push(text)
  if (records.length > BRANDING_PRESET_LIMIT) throw new Error('branding presets exceed the record limit')
  const patch: Partial<Prefs> = { brandingPresets: records }
  if (select) patch.brandingPreset = preset.id
  return patch
}

export function removeBrandingPresetPatch(prefs: Prefs, id: string): Partial<Prefs> {
  const patch: Partial<Prefs> = { brandingPresets: prefs.brandingPresets.filter(entry => parseBrandingPreset(entry).id !== id) }
  if (prefs.brandingPreset === id) patch.brandingPreset = ''
  return patch
}

export function newBrandingPresetId(prefs: Prefs) {
  const used = new Set(storedBrandingPresets(prefs).map(preset => preset.id))
  let at = 1
  while (used.has('preset-' + at)) at++
  return 'preset-' + at
}
