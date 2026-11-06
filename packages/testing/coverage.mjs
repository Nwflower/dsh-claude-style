#!/usr/bin/env node
/**
 * coverage.mjs — which layer guards which feature (D86), as an observation.
 *
 * Every feature directory, with the specs whose @features name it in each
 * layer and the smoke cases its manifest names. A feature with nothing in any
 * layer is listed at the end; the report fails nothing, and the line count of a
 * source file is not what it counts.
 *
 * Usage: node packages/testing/coverage.mjs [--json]
 */
import { readManifests, featureCases } from '../../scripts/shared/read-manifests.mjs'
import { LAYERS, specFiles, readHeader } from '../../scripts/shared/spec-header.mjs'

const manifests = readManifests()
const cases = featureCases(manifests)
const headers = specFiles().map(readHeader)
const rows = Object.keys(cases).sort().map((dir) => {
  const row = { feature: dir, smoke: cases[dir].length }
  for (const layer of LAYERS) row[layer] = headers.filter((header) => header.layer === layer && header.features.includes(dir)).map((header) => header.capability)
  return row
})

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(rows, null, 2))
} else {
  const cell = (list) => (list.length === 0 ? '—' : [...new Set(list)].join(', '))
  console.log(['feature', 'smoke cases', ...LAYERS].join(' | '))
  for (const row of rows) console.log([row.feature, row.smoke === 0 ? '—' : String(row.smoke), ...LAYERS.map((layer) => cell(row[layer]))].join(' | '))
  const bare = rows.filter((row) => row.smoke === 0 && LAYERS.every((layer) => row[layer].length === 0)).map((row) => row.feature)
  console.log(`\ncoverage: ${rows.length} features; ${bare.length === 0 ? 'every one is guarded by some layer' : `guarded by no layer here: ${bare.join(', ')}`}`)
}
