import { BRAND_INK_ACCENT, BRAND_INK_ORIGINAL, BRAND_INK_TEXT, BRANDING_PRESET_LIMIT, brandingVendorOf, findBrandingPreset, parseBrandingPreset, serializeBrandingPreset } from '@dsh-claude-style/contracts/branding-presets'
import type { BrandingPreset, BrandInk } from '@dsh-claude-style/contracts/branding-presets'
import type { Prefs } from '../constants'

/**
 * The brand sets a reader picks from: the theme style's own art (the empty id),
 * the built-in vendor presets (vendor-brands.ts) and the reader's own records.
 * A record whose id names a built-in preset carries only the reader's ink for it.
 */

/** The reader's own presets, in their stored order; a built-in preset's ink record is not one. */
export function storedBrandingPresets(prefs: Prefs) {
  return prefs.brandingPresets.map(parseBrandingPreset).filter(preset => brandingVendorOf(preset.id) === undefined)
}

/** The record stored under `id`: a reader's preset, or the ink a built-in preset was given. */
export function brandingRecord(prefs: Prefs, id: string) {
  return id === '' ? undefined : findBrandingPreset(prefs.brandingPresets, id)
}

/** The reader's preset the page paints, or undefined while it paints the theme style's art or a built-in preset. */
export function selectedBrandingPreset(prefs: Prefs) {
  return brandingVendorOf(prefs.brandingPreset) === undefined ? brandingRecord(prefs, prefs.brandingPreset) : undefined
}

/** The ink the set `id` is painted in: the theme style's own choice for its art, a preset's own otherwise (its images' colours when it names none). */
export function brandingInkOf(prefs: Prefs, id = prefs.brandingPreset): BrandInk {
  if (id === '') return prefs.brandInk
  return brandingRecord(prefs, id)?.ink ?? BRAND_INK_ORIGINAL
}

/** The colour an ink paints a shape in, or null for the art's own ink (`--dsh-claude-logo-ink` as the brand's token block gives it). */
export function brandInkColour(ink: BrandInk) {
  return ink === BRAND_INK_ACCENT ? 'var(--dsw-alias-brand-primary)' : ink === BRAND_INK_TEXT ? 'var(--dsw-alias-label-primary)' : null
}

/** Store a preset in its own place in the list (a new one goes last), so the cards keep their order while one is edited. */
export function storeBrandingPresetPatch(prefs: Prefs, preset: BrandingPreset, select = false): Partial<Prefs> {
  const text = serializeBrandingPreset(preset)
  const at = prefs.brandingPresets.findIndex(entry => parseBrandingPreset(entry).id === preset.id)
  const records = [...prefs.brandingPresets]
  if (at === -1) records.push(text)
  else records[at] = text
  if (records.length > BRANDING_PRESET_LIMIT) throw new Error('branding presets exceed the record limit')
  const patch: Partial<Prefs> = { brandingPresets: records }
  if (select) patch.brandingPreset = preset.id
  return patch
}

/**
 * Give the set `id` the ink `ink`: the theme style's art keeps it in
 * `brandInk`, a reader's preset in its record, and a built-in preset in a
 * record of its own that leaves once the ink is the images' own again.
 */
export function brandingInkPatch(prefs: Prefs, id: string, ink: BrandInk): Partial<Prefs> {
  if (id === '') return { brandInk: ink }
  const record = brandingRecord(prefs, id)
  if (brandingVendorOf(id) !== undefined && ink === BRAND_INK_ORIGINAL) {
    return record === undefined ? {} : { brandingPresets: prefs.brandingPresets.filter(entry => parseBrandingPreset(entry).id !== id) }
  }
  if (record === undefined && brandingVendorOf(id) === undefined) throw new Error(`the branding preset "${id}" is not stored`)
  const next: BrandingPreset = { ...(record ?? { id, name: '' }), ink }
  if (ink === BRAND_INK_ORIGINAL) delete next.ink
  return storeBrandingPresetPatch(prefs, next)
}

export function removeBrandingPresetPatch(prefs: Prefs, id: string): Partial<Prefs> {
  const patch: Partial<Prefs> = { brandingPresets: prefs.brandingPresets.filter(entry => parseBrandingPreset(entry).id !== id) }
  if (prefs.brandingPreset === id) patch.brandingPreset = ''
  return patch
}

export function newBrandingPresetId(prefs: Prefs) {
  const used = new Set(prefs.brandingPresets.map(entry => parseBrandingPreset(entry).id))
  let at = 1
  while (used.has('preset-' + at)) at++
  return 'preset-' + at
}
