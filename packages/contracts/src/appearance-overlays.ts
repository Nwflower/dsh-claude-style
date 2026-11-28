/**
 * UI-owned appearance overlay contract shared by host storage, preference
 * clamping, and browser overlay transport (D73).
 */
import { BRANDING_PRESET_ID_MAX, normalizeBrandingPresets } from './branding-presets'
import { PALETTE_SCHEME_ID_MAX, normalizePaletteSchemes } from './palette-schemes'
import { isPlainObject } from './records'

export interface AppearanceOverlay {
  paletteSchemeOverrides: string[]
  paletteSchemeDeleted: string[]
  paletteColorsOverride: string
  brandingPresetOverrides: string[]
  brandingPresetDeleted: string[]
  brandingPresetOverride: string
}

export const APPEARANCE_OVERLAY_DEFAULT: Readonly<AppearanceOverlay> = Object.freeze({
  paletteSchemeOverrides: [],
  paletteSchemeDeleted: [],
  paletteColorsOverride: '',
  brandingPresetOverrides: [],
  brandingPresetDeleted: [],
  brandingPresetOverride: '',
})

/** Preference keys that persist in the UI overlay file rather than the host settings form. */
export const APPEARANCE_OVERLAY_KEYS = [
  'paletteSchemeOverrides',
  'paletteSchemeDeleted',
  'paletteColorsOverride',
  'brandingPresetOverrides',
  'brandingPresetDeleted',
  'brandingPresetOverride',
] as const

/** Preference keys whose UI edits route into the appearance overlay so file-defined bases stay intact. */
export const APPEARANCE_RECORD_KEYS = [
  'paletteSchemes',
  'paletteColors',
  'brandingPresets',
  'brandingPreset',
] as const

/** Preference list keys that accept structured YAML record objects before JSON string clamping. */
export const STRUCTURED_RECORD_LIST_KEYS = [
  'paletteSchemes',
  'paletteSchemeOverrides',
  'brandingPresets',
  'brandingPresetOverrides',
] as const

/** Clone the default overlay with fresh empty arrays so callers never mutate shared defaults. */
export function emptyAppearanceOverlay(): AppearanceOverlay {
  return {
    paletteSchemeOverrides: [],
    paletteSchemeDeleted: [],
    paletteColorsOverride: '',
    brandingPresetOverrides: [],
    brandingPresetDeleted: [],
    brandingPresetOverride: '',
  }
}

/** Validate and normalize one persisted or submitted overlay payload. */
export function normalizeAppearanceOverlay(value: unknown, palettePresets: readonly string[]): AppearanceOverlay {
  if (!isPlainObject(value)) throw new Error('the overlay is not an object')
  const palette = normalizePaletteSchemes(
    Array.isArray(value.paletteSchemeOverrides) ? value.paletteSchemeOverrides.filter((entry): entry is string => typeof entry === 'string') : [],
    palettePresets,
  )
  const branding = normalizeBrandingPresets(
    Array.isArray(value.brandingPresetOverrides) ? value.brandingPresetOverrides.filter((entry): entry is string => typeof entry === 'string') : [],
  )
  const ids = (input: unknown, max: number): string[] => Array.isArray(input)
    ? input.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0 && entry.length <= max)
    : []
  return {
    paletteSchemeOverrides: palette.entries,
    paletteSchemeDeleted: ids(value.paletteSchemeDeleted, PALETTE_SCHEME_ID_MAX),
    paletteColorsOverride: typeof value.paletteColorsOverride === 'string' ? value.paletteColorsOverride.slice(0, PALETTE_SCHEME_ID_MAX) : '',
    brandingPresetOverrides: branding.entries,
    brandingPresetDeleted: ids(value.brandingPresetDeleted, BRANDING_PRESET_ID_MAX),
    brandingPresetOverride: typeof value.brandingPresetOverride === 'string' ? value.brandingPresetOverride.slice(0, BRANDING_PRESET_ID_MAX) : '',
  }
}
