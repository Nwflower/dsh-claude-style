/**
 * Structured logo presets and their independent selection (D73, D97).
 *
 * @capability custom-brand
 * @features brand
 * @risk YAML-defined presets disappear or lose their stable selection, one invalid asset removes valid presets, or replacing one variant clears the other.
 */
import { expect, test } from 'vitest'
import { brandingAsset, newBrandingPresetId, normalizeBrandingPresets, preferenceWritePatch, removeBrandingPresetPatch, selectedBrandingPreset, storeBrandingPresetPatch, withBrandingAsset } from '@dsh-claude-style/client/pure'
import { clampPrefs } from '@dsh-claude-style/contracts/prefs'
import type { BrandingPreset } from '@dsh-claude-style/contracts/branding-presets'
import type { PrefKey } from '@dsh-claude-style/contracts/prefs'

test('structured YAML schemes and logo presets enter the canonical stores', () => {
  const prefs = clampPrefs({
    paletteColors: 'company-ocean',
    paletteSchemes: [{ id: 'company-ocean', name: 'Company Ocean', base: 'deepseek', accent: '#2855D9', background: { light: '#F7F9FF', dark: '#111827' } }],
    brandingPreset: 'company-primary',
    brandingPresets: [{ id: 'company-primary', name: 'Company Primary', mark: { light: './branding/primary-light.svg', dark: './branding/primary-dark.svg' }, wordmark: './branding/wordmark.svg' }],
  })
  expect(prefs.paletteSchemes).toHaveLength(1)
  expect(prefs.paletteSchemes[0]).toContain('"accent":"#2855d9"')
  expect(prefs.brandingPresets).toHaveLength(1)
  expect(selectedBrandingPreset(prefs)?.name).toBe('Company Primary')
  expect(brandingAsset(selectedBrandingPreset(prefs)!, 'mark', 'dark')).toBe('./branding/primary-dark.svg')
  expect(brandingAsset(selectedBrandingPreset(prefs)!, 'wordmark', 'dark')).toBe('./branding/wordmark.svg')
})

test('invalid records and selections fall back without discarding valid presets', () => {
  const { entries, problems } = normalizeBrandingPresets([
    JSON.stringify({ id: 'valid', name: 'Valid' }),
    JSON.stringify({ id: 'also-valid', name: 'Also valid', mark: '../outside.svg' }),
    '{not-json',
  ])
  expect(entries).toHaveLength(1)
  expect(problems).toHaveLength(2)
  const prefs = clampPrefs({ brandingPreset: 'missing', brandingPresets: entries })
  expect(prefs.brandingPreset).toBe('')
  expect(prefs.brandingPresets).toEqual(entries)
})

test('variant replacement is independent and a single variant covers both appearances', () => {
  let preset: BrandingPreset = { id: 'company', name: 'Company', mark: './branding/shared.svg' }
  expect(brandingAsset(preset, 'mark', 'dark')).toBe('./branding/shared.svg')
  preset = withBrandingAsset(preset, 'mark', 'dark', '@managed/mark-dark')
  expect(brandingAsset(preset, 'mark', 'light')).toBe('./branding/shared.svg')
  expect(brandingAsset(preset, 'mark', 'dark')).toBe('@managed/mark-dark')
  preset = withBrandingAsset(preset, 'mark', 'dark', null)
  expect(brandingAsset(preset, 'mark', 'light')).toBe('./branding/shared.svg')
  expect(brandingAsset(preset, 'mark', 'dark')).toBe('./branding/shared.svg')
  preset = withBrandingAsset(preset, 'mark', 'light', null)
  expect(preset.mark).toBeUndefined()
})

test('UI overlays merge new base records without resurrecting deleted ones', () => {
  const prefs = clampPrefs({
    brandingPreset: 'company',
    brandingPresets: [{ id: 'company', name: 'Base' }, { id: 'deleted', name: 'Deleted' }, { id: 'later', name: 'Later' }],
    brandingPresetOverrides: [{ id: 'company', name: 'Edited' }, { id: 'preset-1', name: 'Created' }],
    brandingPresetDeleted: ['deleted'],
    brandingPresetOverride: 'preset-1',
  })
  expect(prefs.brandingPresets.map(text => JSON.parse(text).name)).toEqual(['Edited', 'Created', 'Later'])
  expect(prefs.brandingPreset).toBe('preset-1')
})

test('file-owned writes become overrides and carry deletion tombstones', () => {
  const locked = new Set<PrefKey>(['paletteSchemes', 'paletteColors', 'brandingPresets', 'brandingPreset'])
  const patch = preferenceWritePatch({
    paletteSchemes: [],
    paletteColors: 'brand',
    brandingPresets: [],
    brandingPreset: '',
  }, locked)
  expect(patch.paletteSchemeOverrides).toEqual([])
  expect(patch.paletteColorsOverride).toBe('brand')
  expect(patch.brandingPresetOverrides).toEqual([])
  expect(patch.brandingPresetOverride).toBe('')
  expect(patch.paletteSchemes).toBeUndefined()
  expect(patch.paletteColors).toBeUndefined()
  expect(patch.brandingPresets).toBeUndefined()
  expect(patch.brandingPreset).toBeUndefined()
})

test('renaming keeps the selected id and deleting only removes that record', () => {
  let prefs = clampPrefs({ brandingPreset: 'company', brandingPresets: [{ id: 'company', name: 'Before' }, { id: 'other', name: 'Other' }] })
  prefs = { ...prefs, ...storeBrandingPresetPatch(prefs, { id: 'company', name: 'After' }, true) }
  expect(selectedBrandingPreset(prefs)?.name).toBe('After')
  expect(newBrandingPresetId(prefs)).toBe('preset-1')
  const removed = removeBrandingPresetPatch(prefs, 'company')
  expect(removed.brandingPreset).toBe('')
  expect(removed.brandingPresets).toHaveLength(1)
})
