/** One light/dark pair, parsed by the record's own scalar reader. */
export function appearancePair<T>(value: unknown, what: string, read: (value: unknown, what: string) => T): { light?: T, dark?: T } | undefined {
  if (value === undefined) return undefined
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(what + ' is not an object of light and dark values')
  const record = value as Record<string, unknown>
  const out: { light?: T, dark?: T } = {}
  if (record.light !== undefined) out.light = read(record.light, what + '.light')
  if (record.dark !== undefined) out.dark = read(record.dark, what + '.dark')
  return out.light === undefined && out.dark === undefined ? undefined : out
}

/** The object every stored record must start from. */
export function parseRecordObject(text: string) {
  const raw: unknown = JSON.parse(text)
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('the record is not an object')
  return raw as Record<string, unknown>
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
