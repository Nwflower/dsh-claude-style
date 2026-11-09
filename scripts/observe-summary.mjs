#!/usr/bin/env node
/**
 * observe-summary.mjs — summarize observation outcomes and behaviour failures.
 * Exit successfully because the originating steps already carry the failure.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const ARTIFACT = 'observe-behaviour'
/** How much of a test's error the summary and the annotation carry; the evidence holds the rest. */
const MESSAGE_MAX = 300

const args = process.argv.slice(2)
const reportAt = (() => {
  const at = args.indexOf('--report')
  if (at === -1) return path.join(ROOT, '.debug', 'behaviour', 'report.json')
  const value = args[at + 1]
  if (value === undefined) throw new Error('observe-summary: --report needs a path')
  return path.resolve(value)
})()

const STEPS = [
  { id: 'build', env: 'BUILD_OUTCOME', what: 'the build' },
  { id: 'smoke', env: 'SMOKE_OUTCOME', what: "the smoke's quick tier" },
  { id: 'behaviour', env: 'BEHAVIOUR_OUTCOME', what: 'the behaviour lane' },
]

/** One result's message as one line, cut to what a summary row can hold. */
function oneLine(text) {
  const line = String(text ?? '').split('\n')[0].trim()
  return line.length > MESSAGE_MAX ? `${line.slice(0, MESSAGE_MAX)}…` : line
}

/** A workflow command's data escapes. */
const data = (text) => String(text).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
/** A workflow command's property escapes, which also cover `:` and `,`. */
const property = (text) => data(text).replace(/:/g, '%3A').replace(/,/g, '%2C')

/** The behaviour lane's failures, as the report names them; null when it wrote none. */
function behaviourResults() {
  if (!fs.existsSync(reportAt)) return null
  const report = JSON.parse(fs.readFileSync(reportAt, 'utf8'))
  if (!Array.isArray(report.results)) throw new Error(`observe-summary: ${reportAt} has no "results" list`)
  return report.results
}

/** Where a failing test's evidence sits in the uploaded artifact, which holds `.debug/behaviour` as its root; null when the result left none. */
function evidenceOf(result) {
  if (result.evidence === undefined) return null
  return `\`${String(result.evidence).replace(/^\.debug\/behaviour\//, '')}\` in the \`${ARTIFACT}\` artifact`
}

/** Empty outcomes mean skipped; missing variables indicate workflow misconfiguration. */
const outcomes = STEPS.map((step) => {
  const outcome = process.env[step.env]
  if (outcome === undefined) throw new Error(`observe-summary: ${step.env} is not set; the workflow passes each step's outcome`)
  return { ...step, outcome: outcome === '' ? 'skipped' : outcome }
})
const blocking = (behaviourResults() ?? []).filter((result) => result.blocking === true)
const failed = outcomes.filter((step) => step.outcome === 'failure' || step.outcome === 'cancelled')

const lines = ['## Observation of master', '', '| Step | Result |', '|---|---|']
for (const step of outcomes) lines.push(`| ${step.what} | ${step.outcome} |`)
lines.push('')

for (const step of failed) {
  if (step.id !== 'behaviour') {
    lines.push(`- ${step.what} failed and left no test report; the \`${step.id}\` step's log in this job carries the output.`)
  }
}
if (failed.some((step) => step.id === 'behaviour') && blocking.length === 0) {
  lines.push(`- The behaviour lane failed before it wrote a report; the \`behaviour\` step's log in this job carries the output.`)
}
/** Why a blocking result blocked: an assertion's own message, or a quarantined test that passed. */
function whyBlocked(result) {
  return result.ok === true ? 'passes now, so it has outlived its quarantine entry' : oneLine(result.error)
}

/** A blocking result's detail: why it blocked, and where the artifact holds its evidence. */
function detail(result) {
  const evidence = evidenceOf(result)
  return `${whyBlocked(result)}${evidence === null ? '' : ` (evidence: ${evidence})`}`
}

if (blocking.length > 0) {
  lines.push('### Behaviour failures', '')
  for (const result of blocking) lines.push(`- \`${result.id}\` — ${detail(result)}`)
}
if (failed.length === 0 && blocking.length === 0) lines.push('Every step that ran passed.')
lines.push('')

const summary = lines.join('\n')
const summaryFile = process.env.GITHUB_STEP_SUMMARY
if (summaryFile === undefined || summaryFile === '') process.stdout.write(summary)
else fs.appendFileSync(summaryFile, summary)

for (const step of failed) {
  if (step.id === 'behaviour' && blocking.length > 0) continue
  console.log(`::error title=Observe ${step.id}::${data(`${step.what} failed; the step's log in this job carries the output`)}`)
}
for (const result of blocking) console.log(`::error title=${property(result.id)}::${data(detail(result))}`)

