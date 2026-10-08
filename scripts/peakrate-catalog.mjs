/**
 * peakrate-catalog.mjs — the peak rate catalog the package ships (D54).
 *
 * The document is the data source's own file, kept in the repository and
 * copied beside the bundle: it is what the host half serves when the source
 * cannot be reached, so the meter still works on a machine that never gets
 * there. The check runs the host half's own parser, so a build cannot ship a
 * document the runtime would refuse at load time.
 *
 * Refresh it by hand with `node scripts/fetch-peakrate-catalog.mjs`.
 */
import { loadModule } from './shared/ts-module.cjs'

/** The shipped catalog's file name under packages/host/data/, and beside the bundle in lib/. */
export const PEAKRATE_CATALOG = 'peakrate-catalog.json'

/**
 * Check one catalog document with the parser the host half loads it with.
 *
 * The shipped document is also the only fallback a machine with no reach ever
 * judges by, so every row of the meter's own mapping table is held to it: a row
 * naming a profile the parser drops, or one that belongs to another vendor,
 * shows no badge on the page and no error anywhere else.
 *
 * @param doc - the parsed JSON.
 * @param file - the path the document was read from, for the refusal.
 * @returns how many profiles the document yields (the source carries entries
 *     this reader drops on purpose, so this is not its own profile count).
 */
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
