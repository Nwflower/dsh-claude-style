/** peakrate-catalog.mjs — validate the shipped fallback with the host parser and meter mappings. */
import { loadModule } from '../shared/ts-module.mjs'

export const PEAKRATE_CATALOG = 'peakrate-catalog.json'

/** Every mapping must resolve to a same-vendor profile, or the badge fails silently at runtime. */
export function validatePeakCatalog(doc, file) {
  const { parseCatalog } = loadModule('packages/host/src/peakrate-catalog.ts')
  const parsed = parseCatalog(doc)
  if (parsed === null) throw new Error(`build: ${file} is not a peak rate catalog this build understands`)
  const { MODEL_MAPPINGS } = loadModule('packages/client/src/features/peakrate/match.ts')
  const profiles = new Map(parsed.profiles.map((profile) => [profile.id, profile]))
  for (const row of MODEL_MAPPINGS) {
    const profile = profiles.get(row.profile)
    if (profile === undefined) {
      throw new Error(`build: the peak rate mapping ${row.provider}/${row.match} names the profile "${row.profile}", which the shipped catalog does not yield`)
    }
    if (profile.provider !== row.provider) {
      throw new Error(`build: the peak rate mapping ${row.provider}/${row.match} names the profile "${row.profile}", which belongs to "${profile.provider}"`)
    }
  }
  return parsed.profiles.length
}
