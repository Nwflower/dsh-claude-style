/** A `#rrggbb` colour literal accepted across preferences and schemes. */
export const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i

/** A lowercase slug id for stored palette schemes and branding presets. */
export const RECORD_ID_RE = /^[a-z0-9][a-z0-9-]*$/

/** Whether a value is a non-null plain object (not an array). */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** One light/dark pair, parsed by the record's own scalar reader. */
export function appearancePair<T>(value: unknown, what: string, read: (value: unknown, what: string) => T): { light?: T, dark?: T } | undefined {
  if (value === undefined) return undefined
  if (!isPlainObject(value)) throw new Error(what + ' is not an object of light and dark values')
  const out: { light?: T, dark?: T } = {}
  if (value.light !== undefined) out.light = read(value.light, what + '.light')
  if (value.dark !== undefined) out.dark = read(value.dark, what + '.dark')
  return out.light === undefined && out.dark === undefined ? undefined : out
}

/** The object every stored record must start from. */
export function parseRecordObject(text: string) {
  const raw: unknown = JSON.parse(text)
  if (!isPlainObject(raw)) throw new Error('the record is not an object')
  return raw
}

/** Return the first parsed record whose id matches, or undefined. */
export function findRecordById<T extends { id: string }>(entries: readonly string[], id: string, parse: (text: string) => T): T | undefined {
  for (const text of entries) {
    const record = parse(text)
    if (record.id === id) return record
  }
  return undefined
}

/** Merge UI override records over file-defined base records, dropping overridden and deleted ids. */
export function mergeRecordOverlay(
  base: readonly string[],
  overrides: readonly string[],
  deletedIds: readonly string[],
  readId: (text: string) => string,
): string[] {
  const overriddenIds = new Set(overrides.map(readId))
  const deleted = new Set(deletedIds)
  return [...overrides, ...base.filter(text => {
    const id = readId(text)
    return !overriddenIds.has(id) && !deleted.has(id)
  })]
}

/** Normalize one list of id-bearing records while isolating each bad entry. */
export function normalizeRecords<T extends { id: string }>(
  list: readonly string[],
  parse: (text: string) => T,
  serialize: (record: T) => string,
  noun: string,
) {
  const entries: string[] = []
  const problems: string[] = []
  const seen = new Set<string>()
  list.forEach((text, at) => {
    try {
      const record = parse(text)
      if (seen.has(record.id)) throw new Error('the id "' + record.id + '" repeats an earlier record')
      seen.add(record.id)
      entries.push(serialize(record))
    } catch (error) {
      problems.push(noun + ' ' + (at + 1) + ' left out: ' + (error instanceof Error ? error.message : String(error)))
    }
  })
  return { entries, problems }
}
