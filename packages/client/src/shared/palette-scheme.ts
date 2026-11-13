import { BRANDS, PALETTE_COLORING_BRAND, PALETTE_COLORING_CUSTOM } from '../constants'
import { findPaletteScheme, parsePaletteScheme, serializePaletteScheme } from '@dsh-claude-style/contracts/palette-schemes'
import type { PaletteScheme } from '@dsh-claude-style/contracts/palette-schemes'
import type { Prefs } from '../constants'

/**
 * The selection and the records of the colour schemes (D96), read from the
 * preferences. The records are already canonical text, because the preference
 * clamp reads them through the shared parser (contracts/src/palette-schemes.ts).
 */

const PRESETS: readonly string[] = BRANDS

/** The reader's own scheme the selection names, or undefined while it names a preset or follows the brand. */
export function selectedReaderScheme(prefs: Prefs): PaletteScheme | undefined {
  const id = prefs.paletteColors
  if (id === PALETTE_COLORING_BRAND || PRESETS.includes(id)) return undefined
  return findPaletteScheme(prefs.paletteSchemes, id, PRESETS)
}

/** The preset whose tokens the page paints: the pinned preset, the brand's, or the base of the reader's scheme. */
export function paletteCardOf(prefs: Prefs) {
  if (PRESETS.includes(prefs.paletteColors)) return prefs.paletteColors
  return selectedReaderScheme(prefs)?.base ?? prefs.brand
}

/** A scheme with no seed of its own over the brand the page shows now. */
export function newCustomScheme(prefs: Prefs): PaletteScheme {
  return { id: PALETTE_COLORING_CUSTOM, name: '', base: prefs.brand }
}

/**
 * The patch that stores `scheme` among the records and selects it. The earlier
 * custom card's four fields are written empty with it, so a record the reader
 * deletes later is not carried in again from them.
 */
export function selectSchemePatch(prefs: Prefs, scheme: PaletteScheme): Partial<Prefs> {
  const text = serializePaletteScheme(scheme)
  let replaced = false
  const records = prefs.paletteSchemes.map((entry) => {
    if (parsePaletteScheme(entry, PRESETS).id !== scheme.id) return entry
    replaced = true
    return text
  })
  if (!replaced) records.push(text)
  return { paletteColors: scheme.id, paletteSchemes: records, customAccent: '', customCanvasLight: '', customCanvasDark: '', customCode: '' }
}
