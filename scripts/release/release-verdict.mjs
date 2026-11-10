#!/usr/bin/env node
/**
 * release-verdict.mjs — require a successful manual matrix on the tagged commit
 * with no skipped lane (D92); stop before packing when no verdict exists.
 */
import fs from 'node:fs'
import { argOf } from '../shared/args.mjs'

/** A reason the release may not go on; the message is what the release prints. */
class NoVerdict extends Error {}

const fail = (message) => {
  throw new NoVerdict(message)
}

/** Match actual lanes; the aggregation job only reports them. */
const LANES = [
  { what: 'the build', pattern: /^build$/ },
  { what: 'the spec, smoke and behaviour lane', pattern: /^unit-smoke$/ },
  { what: 'the Windows host half', pattern: /^smoke-windows$/ },
  { what: 'the macOS behaviour lane', pattern: /^behaviour-macos$/ },
  { what: 'the end-to-end shards', pattern: /^e2e \(\d+\)$/ },
]
const holds = (job) => LANES.some((lane) => lane.pattern.test(job.name))

/** Why one successful run is not a verdict the release may stand on, or the empty string when it is. */
function complaint(jobs) {
  const missing = LANES.filter((lane) => !jobs.some((job) => lane.pattern.test(job.name)))
  if (missing.length > 0) return `holds no job for ${missing.map((lane) => lane.what).join(', ')}`
  const skipped = jobs.filter((job) => holds(job) && job.conclusion === 'skipped')
  if (skipped.length > 0) return `skipped ${skipped.map((job) => job.name).join(', ')}, so the matrix judged nothing`
  const broken = jobs.filter((job) => holds(job) && job.conclusion !== 'success')
  if (broken.length > 0) return `did not pass ${broken.map((job) => `${job.name} (${job.conclusion ?? job.status})`).join(', ')}`
  return ''
}

async function main() {

  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN
  if (token === undefined || token === '') fail('no GH_TOKEN or GITHUB_TOKEN; the answer needs to read this repository\'s runs')
  const repo = argOf('repo') ?? process.env.GITHUB_REPOSITORY
  const sha = argOf('sha') ?? process.env.GITHUB_SHA
  const workflow = argOf('workflow') ?? 'ci.yml'
  const api = argOf('api') ?? 'https://api.github.com'
  if (repo === undefined || repo === '') fail('no GITHUB_REPOSITORY and no --repo <owner>/<name>')
  if (sha === undefined || sha === '') fail('no GITHUB_SHA and no --sha <commit>')

  const get = async (path) => {
    const response = await fetch(`${api}${path}`, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
      },
    })
    if (!response.ok) fail(`GET ${path} answered ${response.status}: ${(await response.text()).slice(0, 300)}`)
    return response.json()
  }

  const { workflow_runs: runs } = await get(`/repos/${repo}/actions/workflows/${workflow}/runs?head_sha=${sha}&per_page=100`)
  const manual = runs.filter((run) => run.event === 'workflow_dispatch')
  if (manual.length === 0) {
    fail(`no manual run of ${workflow} on ${sha.slice(0, 12)} — the matrix a release stands on is started with \`gh workflow run CI --ref master\` on that commit`)
  }
  const green = manual.filter((run) => run.conclusion === 'success')
  if (green.length === 0) {
    const seen = manual.map((run) => `#${run.run_number} ${run.conclusion ?? run.status}`).join(', ')
    fail(`the manual run of ${workflow} on ${sha.slice(0, 12)} did not pass (${seen})`)
  }

  const answers = []
  for (const run of green) {
    const { jobs } = await get(`/repos/${repo}/actions/runs/${run.id}/jobs?per_page=100`)
    if (complaint(jobs) !== '') {
      answers.push(`#${run.run_number} ${complaint(jobs)}`)
      continue
    }
    console.log(`release-verdict: run #${run.run_number} (${run.html_url}) is the matrix of ${sha.slice(0, 12)}: ${jobs.length} jobs, every lane passed`)
    const out = process.env.GITHUB_OUTPUT
    if (out !== undefined && out !== '') fs.appendFileSync(out, 'matrix=reuse\n')
    return 0
  }
  fail(`no manual run of ${workflow} on ${sha.slice(0, 12)} carries the whole matrix: ${answers.join('; ')} — run \`gh workflow run CI --ref master\` on that commit and release once it is green`)
  return 1
}

try {
  await main()
} catch (error) {
  if (!(error instanceof NoVerdict)) throw error
  console.error(`release-verdict: ${error.message}`)
  process.exitCode = 1
}


