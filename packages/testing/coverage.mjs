#!/usr/bin/env node
/**
 * coverage.mjs — which layer guards which feature (D92), as an observation.
 *
 * Every feature directory, with the specs whose @features name it in each
 * layer and the smoke cases and end-to-end scenarios its manifest names. A
 * feature with nothing in any layer is listed at the end; the report fails
 * nothing, and the line count of a source file is not what it counts.
 *
 * Usage: node packages/testing/coverage.mjs [--json]
 */
import { featureCoverage } from '../../scripts/shared/feature-coverage.mjs'
import { LAYERS } from '../../scripts/shared/spec-header.mjs'

const coverage = featureCoverage()
const rows = Object.keys(coverage).sort().map((dir) => {
  const own = coverage[dir]
  const row = { feature: dir, smoke: own.cases.length, scenarios: own.scenarios }
  for (const layer of LAYERS) row[layer] = own.specs[layer].map((header) => header.capability)
  return row
})

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(rows, null, 2))
} else {
  const cell = (list) => (list.length === 0 ? '—' : [...new Set(list)].join(', '))
  console.log(['feature', 'smoke cases', 'end-to-end scenarios', ...LAYERS].join(' | '))
  for (const row of rows) console.log([row.feature, row.smoke === 0 ? '—' : String(row.smoke), cell(row.scenarios), ...LAYERS.map((layer) => cell(row[layer]))].join(' | '))
  const bare = rows.filter((row) => row.smoke === 0 && row.scenarios.length === 0 && LAYERS.every((layer) => row[layer].length === 0)).map((row) => row.feature)
  console.log(`\ncoverage: ${rows.length} features; ${bare.length === 0 ? 'every one is guarded by some layer' : `guarded by no layer here: ${bare.join(', ')}`}`)
}
