import { BRAND_DEFAULT_PRESETS, INLINE_CODE_COLOR_PALETTE, PALETTE_COLORING_BRAND, PALETTE_COLORING_CUSTOM, PALETTE_PRESETS } from '../constants'
import { PALETTE_SCHEME_LIMIT, findPaletteScheme, parsePaletteScheme, serializePaletteScheme } from '@dsh-claude-style/contracts/palette-schemes'
import type { PaletteScheme } from '@dsh-claude-style/contracts/palette-schemes'
import type { Prefs } from '../constants'

/**
 * The selection and the records of the colour schemes (D96), read from the
 * preferences. The records are already canonical text, because the preference
 * clamp reads them through the shared parser (contracts/src/palette-schemes.ts).
 */

const PRESETS: readonly string[] = PALETTE_PRESETS

/** The reader's own scheme the selection names, or undefined while it names a preset or follows the brand. */
export function selectedReaderScheme(prefs: Prefs): PaletteScheme | undefined {
  const id = prefs.paletteColors
  if (id === PALETTE_COLORING_BRAND || PRESETS.includes(id)) return undefined
  return findPaletteScheme(prefs.paletteSchemes, id, PRESETS)
}

/**
 * The scheme the page paints over its preset's tokens: the reader's selected
 * scheme, or the override record of the preset in force. A preset with no
 * override paints its own static tokens and has none.
 */
export function activeScheme(prefs: Prefs): PaletteScheme | undefined {
  return selectedReaderScheme(prefs) ?? findPaletteScheme(prefs.paletteSchemes, paletteCardOf(prefs), PRESETS)
}

/** The preset whose tokens the page paints: the pinned preset, the base of the reader's scheme, or the brand's default. */
export function paletteCardOf(prefs: Prefs) {
  if (PRESETS.includes(prefs.paletteColors)) return prefs.paletteColors
  return selectedReaderScheme(prefs)?.base ?? BRAND_DEFAULT_PRESETS[prefs.brand]
}

/** A scheme with no seed of its own, over the default preset of the brand the page shows now. */
export function newCustomScheme(prefs: Prefs): PaletteScheme {
  return { id: PALETTE_COLORING_CUSTOM, name: '', base: BRAND_DEFAULT_PRESETS[prefs.brand] }
}

/** Whether a record carries no seed of its own. */
function bare(scheme: PaletteScheme) {
  return scheme.accent === undefined && scheme.background === undefined && scheme.code === undefined && scheme.link === undefined && scheme.edges === undefined
}

/** Every stored record, preset overrides and the reader's schemes alike, in stored order. */
export function storedSchemes(prefs: Prefs): PaletteScheme[] {
  return prefs.paletteSchemes.map((entry) => parsePaletteScheme(entry, PRESETS))
}

/**
 * The patch that stores `scheme` among the records without selecting it. A
 * preset's override record that ends up carrying no seed is dropped, which is
 * how a preset returns to its own values. The earlier custom card's four fields
 * and the earlier inline-code choice are written empty with it, so a record the
 * reader deletes later is not carried in again from them.
 */
export function storeSchemePatch(prefs: Prefs, scheme: PaletteScheme): Partial<Prefs> {
  const text = serializePaletteScheme(scheme)
  const drop = PRESETS.includes(scheme.id) && bare(scheme)
  let replaced = false
  const records: string[] = []
  for (const entry of prefs.paletteSchemes) {
    if (parsePaletteScheme(entry, PRESETS).id !== scheme.id) records.push(entry)
    else if (!drop) {
      records.push(text)
      replaced = true
    }
  }
  if (!replaced && !drop) records.push(text)
  if (records.length > PALETTE_SCHEME_LIMIT) throw new Error(`palette schemes exceed the ${PALETTE_SCHEME_LIMIT} record limit`)
  return { paletteSchemes: records, customAccent: '', customCanvasLight: '', customCanvasDark: '', customCode: '', inlineCodeColor: INLINE_CODE_COLOR_PALETTE }
}

/** The patch that stores `scheme` and selects it. */
export function selectSchemePatch(prefs: Prefs, scheme: PaletteScheme): Partial<Prefs> {
  return { ...storeSchemePatch(prefs, scheme), paletteColors: scheme.id }
}

/**
 * The patch that removes a record: a reader's scheme is deleted, a preset's
 * override is dropped. The selection goes back to following the brand when it
 * named a deleted scheme; a preset stays selected after its override is dropped.
 */
export function removeSchemePatch(prefs: Prefs, id: string): Partial<Prefs> {
  const records = prefs.paletteSchemes.filter((entry) => parsePaletteScheme(entry, PRESETS).id !== id)
  const patch: Partial<Prefs> = { paletteSchemes: records, customAccent: '', customCanvasLight: '', customCanvasDark: '', customCode: '', inlineCodeColor: INLINE_CODE_COLOR_PALETTE }
  if (prefs.paletteColors === id && !PRESETS.includes(id)) patch.paletteColors = PALETTE_COLORING_BRAND
  return patch
}

/** An id no record uses: `scheme-1`, `scheme-2`, … */
export function newSchemeId(prefs: Prefs) {
  const used = new Set(storedSchemes(prefs).map((scheme) => scheme.id))
  let at = 1
  while (used.has(`scheme-${at}`)) at++
  return `scheme-${at}`
}

/** Whether another reader's scheme still fits under the limit on records. */
export function canAddScheme(prefs: Prefs) {
  return prefs.paletteSchemes.length < PALETTE_SCHEME_LIMIT
}

/** A new scheme with the seeds of `source`, named `name`: copying a preset starts from that preset and what the reader changed in it. */
export function duplicateScheme(prefs: Prefs, source: PaletteScheme, name: string): PaletteScheme {
  return { ...source, id: newSchemeId(prefs), name, base: source.base }
}
