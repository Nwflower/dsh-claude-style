import type { BrandImageKind } from './brand'
import { appearancePair, normalizeRecords, parseRecordObject } from './records'

/** Named logo images kept independently of the selected colour scheme. */
export const BRANDING_PRESET_LIMIT = 16
export const BRANDING_PRESET_ENTRY_MAX = 1600
export const BRANDING_PRESET_NAME_MAX = 40
export const BRANDING_PRESET_ID_MAX = 40
export const BRANDING_ASSET_REF_MAX = 240

export type BrandingAppearance = 'light' | 'dark'
export type BrandingSlot = 'mark-light' | 'mark-dark' | 'wordmark-light' | 'wordmark-dark'
export const BRANDING_SLOTS: readonly BrandingSlot[] = ['mark-light', 'mark-dark', 'wordmark-light', 'wordmark-dark']

export interface BrandingAssetPair {
  light?: string
  dark?: string
}

/** How the brand art is painted: in its own colours, in the accent, or as a shape in the text colour. */
export const BRAND_INK_ORIGINAL = 'original'
export const BRAND_INK_ACCENT = 'accent'
export const BRAND_INK_TEXT = 'text'
export const BRAND_INKS = [BRAND_INK_ORIGINAL, BRAND_INK_ACCENT, BRAND_INK_TEXT] as const
export type BrandInk = typeof BRAND_INKS[number]

/** A named set of brand images and the ink they are painted in; a record without `ink` paints in the images' own colours. */
export interface BrandingPreset {
  id: string
  name: string
  mark?: string | BrandingAssetPair
  wordmark?: string | BrandingAssetPair
  ink?: BrandInk
}

const ID = /^[a-z0-9][a-z0-9-]*$/

/**
 * The vendor lockups the skin carries (packages/assets/src/icons/combine/)
 * offered as built-in presets, by brand id. A built-in preset's id is the brand
 * id under VENDOR_PREFIX; it needs no record to be selected, and a record with
 * its id carries only the reader's ink for it.
 */
export const BRANDING_VENDORS = ['openai', 'gemini', 'qwen', 'kimicode', 'zcode', 'minimax', 'grok', 'xiaomimimo'] as const
const VENDOR_PREFIX = 'vendor-'

/** The built-in presets' ids, in the order the manager lists them. */
export const BRANDING_VENDOR_IDS: readonly string[] = BRANDING_VENDORS.map(brand => VENDOR_PREFIX + brand)

/** The vendor brand id a built-in preset's id names, or undefined for any other id. */
export function brandingVendorOf(id: string): string | undefined {
  if (!id.startsWith(VENDOR_PREFIX)) return undefined
  const brand = id.slice(VENDOR_PREFIX.length)
  return (BRANDING_VENDORS as readonly string[]).includes(brand) ? brand : undefined
}

export function brandingSlot(kind: BrandImageKind, appearance: BrandingAppearance): BrandingSlot {
  return kind + '-' + appearance as BrandingSlot
}

/** A managed slot or a portable path below the plugin's own home directory. */
function assetRef(value: unknown, what: string): string {
  if (typeof value !== 'string' || value === '' || value.length > BRANDING_ASSET_REF_MAX) throw new Error(what + ' is not an asset reference')
  if (value.startsWith('@managed/')) {
    const slot = value.slice('@managed/'.length)
    if (!BRANDING_SLOTS.includes(slot as BrandingSlot)) throw new Error(what + ' names an unknown managed slot')
    return value
  }
  if (!value.startsWith('./branding/') && !value.startsWith('branding/')) throw new Error(what + ' must be a managed slot or a relative branding path')
  if (value.includes('\\') || value.includes('\0') || value.split('/').includes('..')) throw new Error(what + ' leaves the branding directory')
  return value
}

function asset(value: unknown, what: string): string | BrandingAssetPair | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'string') return assetRef(value, what)
  return appearancePair(value, what, assetRef)
}

/** The asset used for one appearance; a single image or one supplied variant covers both. */
export function brandingAsset(preset: BrandingPreset, kind: BrandImageKind, appearance: BrandingAppearance): string | undefined {
  const value = preset[kind]
  if (typeof value === 'string') return value
  if (value === undefined) return undefined
  return value[appearance] ?? value[appearance === 'light' ? 'dark' : 'light']
}

/** Return the preset with one variant replaced; empty pairs are removed. */
export function withBrandingAsset(preset: BrandingPreset, kind: BrandImageKind, appearance: BrandingAppearance, ref: string | null): BrandingPreset {
  const current = preset[kind]
  const pair: BrandingAssetPair = typeof current === 'string' ? { light: current, dark: current } : { ...current }
  if (ref === null) delete pair[appearance]
  else pair[appearance] = assetRef(ref, kind)
  const next = { ...preset }
  if (pair.light === undefined && pair.dark === undefined) delete next[kind]
  else next[kind] = pair
  return next
}

export function parseBrandingPreset(text: string): BrandingPreset {
  const record = parseRecordObject(text)
  const id = record.id
  if (typeof id !== 'string' || id.length > BRANDING_PRESET_ID_MAX || !ID.test(id)) throw new Error('the id is not 1–40 lowercase letters, digits or hyphens')
  const name = typeof record.name === 'string' ? record.name.trim() : ''
  if (name.length > BRANDING_PRESET_NAME_MAX) throw new Error('the name is longer than 40 characters')
  const preset: BrandingPreset = { id, name }
  const mark = asset(record.mark, 'mark')
  const wordmark = asset(record.wordmark, 'wordmark')
  if (mark !== undefined) preset.mark = mark
  if (wordmark !== undefined) preset.wordmark = wordmark
  if (record.ink !== undefined) {
    if (!BRAND_INKS.includes(record.ink as BrandInk)) throw new Error('the ink is not one of ' + BRAND_INKS.join(', '))
    preset.ink = record.ink as BrandInk
  }
  return preset
}

export function serializeBrandingPreset(preset: BrandingPreset) {
  const record: Record<string, unknown> = { id: preset.id, name: preset.name }
  if (preset.mark !== undefined) record.mark = preset.mark
  if (preset.wordmark !== undefined) record.wordmark = preset.wordmark
  if (preset.ink !== undefined) record.ink = preset.ink
  return JSON.stringify(record)
}

/** Canonical records, with one bad entry isolated from every valid preset. */
export function normalizeBrandingPresets(list: readonly string[]) {
  return normalizeRecords(list, parseBrandingPreset, serializeBrandingPreset, 'branding preset')
}

export function findBrandingPreset(entries: readonly string[], id: string) {
  for (const text of entries) {
    const preset = parseBrandingPreset(text)
    if (preset.id === id) return preset
  }
  return undefined
}
