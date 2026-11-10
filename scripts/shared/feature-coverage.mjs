/**
 * One feature's verification coverage, read from its own manifest and the specs'
 * headers (D76, D92). Scope selection, the smoke's case table and the coverage
 * report all read this one table, so a manifest's cases and scenarios have a
 * single reader.
 */
import { readManifests } from './read-manifests.mjs'
import { LAYERS, readHeader, specFiles } from './spec-header.mjs'

/**
 * Each feature directory's row: the installation cases and end-to-end scenarios
 * its manifest names, and the specs whose `@features` names it, by layer.
 */
function featureCoverage(manifests = readManifests(), headers = specFiles().map(readHeader)) {
  const table = {}
  for (const manifest of manifests) {
    const row = table[manifest.dir] ?? (table[manifest.dir] = {
      cases: [],
      scenarios: [],
      specs: Object.fromEntries(LAYERS.map((layer) => [layer, []])),
    })
    for (const name of manifest.cases) if (!row.cases.includes(name)) row.cases.push(name)
    for (const name of manifest.scenarios ?? []) if (!row.scenarios.includes(name)) row.scenarios.push(name)
  }
  for (const header of headers) {
    if (!LAYERS.includes(header.layer)) continue
    for (const feature of header.features) {
      const row = table[feature]
      if (row !== undefined) row.specs[header.layer].push(header)
    }
  }
  return table
}

/** Whether a change inside this directory can select a lane narrower than the whole walk. */
function covered(row) {
  return row !== undefined && (row.cases.length > 0 || row.scenarios.length > 0 || LAYERS.some((layer) => row.specs[layer].length > 0))
}

export { featureCoverage, covered }
