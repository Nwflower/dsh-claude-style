/**
 * The colour schemes a reader keeps (D97): one record per scheme, written as a
 * JSON string so the whole list is a plain string list the host's settings form
 * accepts (D73). Both halves read a record through this module, so a record
 * means the same thing on either side.
 *
 * A record names the preset it starts from (`base`) and carries only the seeds
 * the reader set; every other seed reads the base preset's own value. A preset's
 * override record is the same shape with the preset's own id, and carries no
 * name. The preset ids are an argument, not an import, because the preferences
 * table imports this module.
 */

/** The most records kept: the reader's schemes and the presets' override records together. */
export const PALETTE_SCHEME_LIMIT = 16
/** The longest record accepted, in characters. */
export const PALETTE_SCHEME_ENTRY_MAX = 400
/** The longest scheme name. */
export const PALETTE_SCHEME_NAME_MAX = 24
/** The longest scheme id. */
export const PALETTE_SCHEME_ID_MAX = 24
/** The id the selection stores to follow the brand's default scheme; no record may take it. */
export const PALETTE_SCHEME_FOLLOW = 'brand'
/** The id the earlier single custom card migrates to. */
export const PALETTE_SCHEME_CUSTOM = 'custom'

/** How a dark contour is drawn: a lifted outline, or steps of the carrying surface. */
export const PALETTE_EDGES = ['highlight', 'surface'] as const
export type PaletteEdges = typeof PALETTE_EDGES[number]

/** One seed per appearance; an appearance left out reads the base preset's. */
export interface ColourPair {
  light?: string
  dark?: string
}

export interface PaletteScheme {
  id: string
  /** Empty for a preset's override record and for the migrated scheme, whose name the page supplies. */
  name: string
  /** The preset that supplies every seed this record leaves out. */
  base: string
  accent?: string
  background?: ColourPair
  text?: ColourPair
  code?: ColourPair
  link?: ColourPair
  edges?: PaletteEdges
}

const COLOUR = /^#[0-9a-f]{6}$/i
const ID = /^[a-z0-9][a-z0-9-]*$/

function colour(value: unknown, what: string) {
  if (typeof value !== 'string' || !COLOUR.test(value)) throw new Error(`${what} is not a #rrggbb colour`)
  return value.toLowerCase()
}

/** A pair's present appearances; an object with neither is no pair. */
function pair(value: unknown, what: string): ColourPair | undefined {
  if (value === undefined) return undefined
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${what} is not an object of light and dark colours`)
  const record = value as Record<string, unknown>
  const out: ColourPair = {}
  if (record.light !== undefined) out.light = colour(record.light, `${what}.light`)
  if (record.dark !== undefined) out.dark = colour(record.dark, `${what}.dark`)
  return out.light === undefined && out.dark === undefined ? undefined : out
}

/**
 * Reads one record. Throws where the record cannot be read; keys this build does
 * not know are left out, so a record a newer build wrote still reads.
 */
export function parsePaletteScheme(text: string, presets: readonly string[]): PaletteScheme {
  const raw: unknown = JSON.parse(text)
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('the record is not an object')
  const record = raw as Record<string, unknown>
  const id = record.id
  if (typeof id !== 'string' || id.length > PALETTE_SCHEME_ID_MAX || !ID.test(id)) throw new Error('the id is not 1–24 lowercase letters, digits or hyphens')
  if (id === PALETTE_SCHEME_FOLLOW) throw new Error(`the id "${PALETTE_SCHEME_FOLLOW}" is the follow-the-brand choice`)
  const overrides = presets.includes(id)
  const base = record.base === undefined && overrides ? id : record.base
  if (typeof base !== 'string' || !presets.includes(base)) throw new Error('the base is not a preset')
  if (overrides && base !== id) throw new Error('a preset\'s override record starts from that preset')
  let name = ''
  if (record.name !== undefined) {
    if (typeof record.name !== 'string') throw new Error('the name is not text')
    name = record.name.trim()
    if (name.length > PALETTE_SCHEME_NAME_MAX) throw new Error(`the name is longer than ${PALETTE_SCHEME_NAME_MAX} characters`)
    if (overrides && name !== '') throw new Error('a preset\'s override record carries no name')
  }
  const scheme: PaletteScheme = { id, name, base }
  if (record.accent !== undefined) scheme.accent = colour(record.accent, 'accent')
  const background = pair(record.background, 'background')
  if (background !== undefined) scheme.background = background
  const textPair = pair(record.text, 'text')
  if (textPair !== undefined) scheme.text = textPair
  const code = pair(record.code, 'code')
  if (code !== undefined) scheme.code = code
  const link = pair(record.link, 'link')
  if (link !== undefined) scheme.link = link
  if (record.edges !== undefined) {
    if (!PALETTE_EDGES.includes(record.edges as PaletteEdges)) throw new Error(`edges is not one of ${PALETTE_EDGES.join(', ')}`)
    scheme.edges = record.edges as PaletteEdges
  }
  return scheme
}

/** One record as its stored text: a fixed key order, no empty parts. */
export function serializePaletteScheme(scheme: PaletteScheme) {
  const record: Record<string, unknown> = { id: scheme.id }
  if (scheme.name !== '') record.name = scheme.name
  if (scheme.base !== scheme.id) record.base = scheme.base
  for (const key of ['accent', 'background', 'text', 'code', 'link', 'edges'] as const) {
    if (scheme[key] !== undefined) record[key] = scheme[key]
  }
  return JSON.stringify(record)
}

/**
 * The stored records as canonical text. A record that cannot be read, or that
 * repeats an earlier record's id, is left out and named in `problems`, so one
 * bad record costs only itself (D12).
 */
export function normalizePaletteSchemes(list: readonly string[], presets: readonly string[]) {
  const entries: string[] = []
  const problems: string[] = []
  const seen = new Set<string>()
  list.forEach((text, at) => {
    try {
      const scheme = parsePaletteScheme(text, presets)
      if (seen.has(scheme.id)) throw new Error(`the id "${scheme.id}" repeats an earlier record`)
      seen.add(scheme.id)
      entries.push(serializePaletteScheme(scheme))
    } catch (error) {
      problems.push(`palette scheme ${at + 1} left out: ${error instanceof Error ? error.message : String(error)}`)
    }
  })
  return { entries, problems }
}

/** The record with this id, or undefined. */
export function findPaletteScheme(entries: readonly string[], id: string, presets: readonly string[]) {
  for (const text of entries) {
    const scheme = parsePaletteScheme(text, presets)
    if (scheme.id === id) return scheme
  }
  return undefined
}

/** The warm inline-code ink the earlier `classic` choice drew, per appearance. */
export const CLASSIC_INLINE_CODE: Required<ColourPair> = { light: '#943333', dark: '#e8a08a' }

/**
 * The records with the earlier `classic` inline-code choice carried in as the
 * Claude preset's override of its code colour. A code colour that override
 * already carries stays, because the reader chose it after the choice.
 */
export function carryClassicInlineCode(entries: readonly string[], preset: string, presets: readonly string[]) {
  const out = entries.map((text) => parsePaletteScheme(text, presets))
  const at = out.findIndex((scheme) => scheme.id === preset)
  if (at === -1) out.push({ id: preset, name: '', base: preset, code: { ...CLASSIC_INLINE_CODE } })
  else if (out[at].code === undefined) out[at] = { ...out[at], code: { ...CLASSIC_INLINE_CODE } }
  return out.map(serializePaletteScheme)
}

/** What the earlier single custom card stored: its four colours, empty where none was picked. */
export interface LegacyCustomPalette {
  accent: string
  canvasLight: string
  canvasDark: string
  code: string
}

/**
 * The records with the earlier custom card carried in as the scheme `custom`,
 * starting from `base`, the preset of the brand it was drawn over. Nothing is added when a `custom`
 * record exists, or when the reader never picked a colour and never selected
 * the card.
 */
export function carryCustomPalette(entries: readonly string[], legacy: LegacyCustomPalette, base: string, selected: boolean, presets: readonly string[]) {
  if (findPaletteScheme(entries, PALETTE_SCHEME_CUSTOM, presets) !== undefined) return [...entries]
  const picked = legacy.accent !== '' || legacy.canvasLight !== '' || legacy.canvasDark !== '' || legacy.code !== ''
  if (!picked && !selected) return [...entries]
  const scheme: PaletteScheme = { id: PALETTE_SCHEME_CUSTOM, name: '', base }
  if (legacy.accent !== '') scheme.accent = legacy.accent
  if (legacy.canvasLight !== '' || legacy.canvasDark !== '') {
    scheme.background = {}
    if (legacy.canvasLight !== '') scheme.background.light = legacy.canvasLight
    if (legacy.canvasDark !== '') scheme.background.dark = legacy.canvasDark
  }
  // The earlier card kept one code colour for both appearances.
  if (legacy.code !== '') scheme.code = { light: legacy.code, dark: legacy.code }
  return [...entries, serializePaletteScheme(scheme)]
}
