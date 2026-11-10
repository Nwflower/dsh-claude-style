#!/usr/bin/env node
/**
 * ci-required.mjs — aggregate `toJson(needs)` for the branch rule. Skipped
 * jobs pass; every new job must join `needs`.
 */
const needs = JSON.parse(process.argv[2] ?? '{}')
const entries = Object.entries(needs)
if (entries.length === 0) {
  console.error('ci-required: no job was handed over; the workflow must pass `needs` in')
  process.exit(2)
}
for (const [job, state] of entries) console.log(`ci-required: ${job} — ${state.result}`)
// Cancellation and failure never pass.
const failed = entries.filter(([, state]) => state.result !== 'success' && state.result !== 'skipped')
if (failed.length > 0) {
  console.error(`ci-required: ${failed.map(([job]) => job).join(', ')} did not pass`)
  process.exit(1)
}
console.log(`ci-required: every one of ${entries.length} jobs passed`)
