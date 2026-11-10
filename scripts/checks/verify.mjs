#!/usr/bin/env node
/**
 * verify.mjs — the one entry a test run goes through (D92): serialized lanes, staged
 * gates, and verdicts cached by tree and selection.
 *
 * Usage: node scripts/checks/verify.mjs [--full] [--only <selector>[,<selector>…]]
 *        [--force] [--help]
 *
 * A bare request judges what the working tree's change reaches. --full walks every
 * gate, including the release lane. --only names a walk: quick, browser, e2e,
 * case:<name>, feature:<directory> or scenario:<name>.
 */
import { execFileSync, spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { availableParallelism } from 'node:os'
import path from 'node:path'
import { filesUnder } from '../shared/file-walk.mjs'
import { changedPaths } from '../shared/changed-paths.mjs'
import { SKIPPED, TREES, treeHash } from '../shared/tree-hash.mjs'
import { HELD, LOCK, takeLock } from '../shared/verify-lock.mjs'
import { cachePath, runsPath } from '../shared/debug-paths.mjs'
import { featureCoverage } from '../shared/feature-coverage.mjs'

const require = createRequire(import.meta.url)
const { UNJUDGED_EXIT } = require('../../packages/testing/host-version.mjs')
const ROOT = path.resolve(import.meta.dirname, '..', '..')
const CACHE = cachePath(ROOT, 'verify')
/** Resolve the installed Vitest entry so nested and hoisted installs behave alike. */
const VITEST = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs')
/** Bumped when a recorded verdict stops meaning what this file reads it as. */
const FORMAT = 2
/** Read structured reports only after their gates finish. */
const UNIT_REPORT = runsPath(ROOT, 'verify', 'unit.json')
const STAND_IN_REPORT = runsPath(ROOT, 'stand-in', 'report.json')
/**
 * How many pages and scenarios the browser gates drive at once, as one budget for the
 * gates sharing a stage. It follows the machine's cores and never its load, and the split
 * is part of the gates' arguments, so a verdict is filed under the same key on the same machine.
 */
const BROWSER_JOBS = Math.max(2, Math.min(8, Math.floor(availableParallelism() / 2)))
/** The flags a request may carry, without their dashes; --only takes the selectors. */
const FLAGS = new Set(['full', 'force', 'only'])
const WALK_SELECTORS = new Set(['quick', 'browser', 'e2e'])
const NAMED_SELECTORS = new Set(['case', 'feature', 'scenario'])

/** The gates in flight, so an interrupt can take them down with this process. */
const running = new Set()
/** The release of the lock this process holds, or null while it holds none. */
let holding = null

const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`
const say = (line) => process.stdout.write(`${line}\n`)

/** End the run over a request that cannot be honoured, before any gate starts. */
function bad(message) {
  console.error(`verify: ${message}`)
  process.exit(2)
}

/** The directories the spec lane reads: what a change under them can reach a spec through. */
const UNIT_SOURCES = ['packages/client/src', 'packages/contracts/src', 'packages/engine/src', 'packages/testing/specs']

/**
 * The spec lane's report: Vitest keeps its terminal reporter and writes the same run as
 * JSON beside it, which tells a failed assertion from a suite that never loaded.
 */
const UNIT_REPORT_ARGS = ['--reporter=default', '--reporter=json', `--outputFile.json=${path.relative(ROOT, UNIT_REPORT).replace(/\\/g, '/')}`]

/**
 * The spec gate of a request (the logic and mechanism layers, D92): the whole lane, or for
 * the iteration tier the specs the working tree's change reaches. A tree with no change
 * under the sources runs the lane whole.
 */
function unitGate(iteration) {
  const changed = iteration ? changedPaths(...UNIT_SOURCES) : []
  const run = changed.length === 0 ? ['run'] : ['related', ...changed]
  return { id: 'unit', minutes: 15, script: VITEST, args: [...run, ...UNIT_REPORT_ARGS], report: UNIT_REPORT }
}

/**
 * The bytes of the build output the browser gates read, or null before the build has
 * written any. A build outside the run takes no lock, so this is what tells a run whether
 * the page it drove is still the page its build produced.
 */
function libHash() {
  const digest = crypto.createHash('sha256')
  const lib = path.join(ROOT, 'lib')
  // An empty extension matches every name, which is what hashing the output wants.
  const files = filesUnder(lib, [''], SKIPPED).map((file) => path.relative(lib, file).replace(/\\/g, '/')).sort()
  if (files.length === 0) return null
  for (const file of files) {
    digest.update(file)
    digest.update('\0')
    digest.update(crypto.createHash('sha256').update(fs.readFileSync(path.join(lib, file))).digest())
  }
  return digest.digest('hex')
}

/** The usage text, read off this file's own header from the `Usage:` line on. */
function usage() {
  const header = fs.readFileSync(new URL(import.meta.url), 'utf8').match(/\/\*\*([\s\S]*?)\*\//)[1]
  const lines = header.split('\n').map((line) => line.replace(/^\s*\*?\s?/, ''))
  return lines.slice(lines.findIndex((line) => line.startsWith('Usage:'))).join('\n').trimEnd()
}

/** One request's own flags, read off this process's command line. */
function parseRequest() {
  const args = process.argv.slice(2)
  if (args.includes('--help')) {
    say(usage())
    process.exit(0)
  }
  const selected = []
  for (let at = 0; at < args.length; at += 1) {
    const arg = args[at]
    const split = arg.indexOf('=')
    const flag = (split === -1 ? arg : arg.slice(0, split)).replace(/^--/, '')
    if (!arg.startsWith('--') || !FLAGS.has(flag)) bad(`unknown argument "${arg}"`)
    if (flag !== 'only') {
      if (split !== -1) bad(`--${flag} takes no value`)
      continue
    }
    const value = split === -1 ? args[++at] : arg.slice(split + 1)
    if (value === undefined || value.trim() === '' || value.startsWith('--')) bad('--only needs a selector')
    selected.push(...value.split(',').map((name) => name.trim()).filter(Boolean))
  }
  const full = args.includes('--full')
  if (full && selected.length > 0) bad('--full already walks everything; drop --only')
  const values = { case: [], feature: [], scenario: [] }
  const walks = new Set()
  for (const selector of selected) {
    if (WALK_SELECTORS.has(selector)) {
      walks.add(selector)
      continue
    }
    const split = selector.indexOf(':')
    const kind = split === -1 ? '' : selector.slice(0, split)
    const name = split === -1 ? '' : selector.slice(split + 1)
    if (!NAMED_SELECTORS.has(kind) || name === '') {
      bad(`unknown selector "${selector}" — use quick, browser, e2e, case:<name>, feature:<directory> or scenario:<name>`)
    }
    values[kind].push(name)
  }
  const sorted = (names) => [...new Set(names)].sort()
  const cases = sorted(values.case)
  const features = sorted(values.feature)
  const coverage = featureCoverage()
  const scenarios = sorted([...values.scenario, ...features.flatMap((name) => coverage[name]?.scenarios ?? [])])
  const iteration = !full && selected.length === 0
  const browser = full || walks.has('browser')
  return {
    // A named case or feature narrows the stand-in walk; a walk selector sets its tier.
    smoke: iteration ? null
      : browser ? []
        : cases.length + features.length > 0
          ? [...(cases.length > 0 ? ['--case', cases.join(',')] : []), ...(features.length > 0 ? ['--feature', features.join(',')] : [])]
          : ['--quick'],
    iteration,
    force: args.includes('--force'),
    cases,
    features,
    scenarios,
    e2e: full || walks.has('e2e') || scenarios.length > 0,
  }
}

/**
 * Whether a request walks everything the tool holds: the whole smoke and the lane's
 * default table, which is the cloud's release gate.
 */
function walksEverything(request) {
  return request.smoke !== null && request.smoke.length === 0
    && request.e2e
    && request.scenarios.length === 0
}

/**
 * How many page loads each browser gate drives beside its stage's other gates. The budget
 * follows the machine's cores, never its load; the behaviour lane takes at most two,
 * leaving room for the Vitest browser that waits on frames beside it.
 */
function browserJobs(request) {
  if (!request.e2e) return { smoke: BROWSER_JOBS, e2e: 0 }
  const smoke = Math.max(1, Math.ceil(BROWSER_JOBS / 2))
  return { smoke, e2e: Math.max(1, BROWSER_JOBS - smoke) }
}

function gatesFor(request) {
  const jobs = browserJobs(request)
  const gates = [
    // The checks that need no build first, so a document mistake fails in seconds.
    { id: 'lint', minutes: 5, script: 'scripts/checks/lint.mjs', args: [] },
    { id: 'docs', minutes: 5, script: 'scripts/checks/decisions-index.mjs', args: ['--check'] },
    { id: 'changelog', minutes: 5, script: 'scripts/release/changelog.mjs', args: ['--check'] },
    { id: 'agents', minutes: 5, script: 'scripts/checks/agents-commands.mjs', args: ['--check'] },
    { id: 'numbers', minutes: 5, script: 'packages/testing/check-numbers.mjs', args: ['--check'] },
    // The appearance snapshot's sources rule and the shrink-only ledgers, against HEAD (D92).
    { id: 'scope', minutes: 5, script: 'scripts/ci/ci-scope.mjs', args: ['--appearance', '--ledgers', '--tree'] },
    { id: 'build', minutes: 15, script: 'scripts/build/build.mjs', args: [] },
    unitGate(request.iteration),
  ]
  if (request.smoke !== null) {
    gates.push({
      id: 'stand-in',
      minutes: 45,
      script: 'packages/testing/stand-in.mjs',
      args: [...request.smoke, '--jobs', String(jobs.smoke)],
      report: STAND_IN_REPORT,
    })
  }
  if (request.e2e) {
    gates.push({
      id: 'e2e',
      minutes: 40,
      script: 'packages/testing/e2e.mjs',
      args: [...(request.scenarios.length > 0 ? ['--scenario', request.scenarios.join(',')] : []), '--jobs', String(jobs.e2e)],
    })
  }
  return gates
}

/**
 * Those gates grouped by what waits for what. The checks and the build come first, because
 * the build writes what the browser lanes read; the spec lane waits for nothing and runs
 * beside the behaviour specs; the smoke and the end-to-end lane come last on their own,
 * because their frame-watching passes are what a loaded machine disturbs. Each stage costs
 * its slowest gate rather than the sum of its gates.
 */
function stagesFor(request) {
  const gates = gatesFor(request)
  const framed = gates.filter((gate) => gate.id === 'stand-in' || gate.id === 'e2e')
  const before = gates.filter((gate) => gate.id === 'unit')
  if (framed.length === 0) return [gates]
  const first = gates.filter((gate) => framed.indexOf(gate) === -1 && before.indexOf(gate) === -1)
  return [first, before, framed].filter((stage) => stage.length > 0)
}

/** The key a verdict is filed under: this tree, these gates. */
function keyOf(tree, request) {
  const gates = gatesFor(request).map((gate) => `${gate.id} ${gate.args.join(' ')}`)
  return crypto.createHash('sha256').update(JSON.stringify({ format: FORMAT, tree, gates })).digest('hex')
}

/** The verdict filed under a key, or null where none is. */
function cached(key) {
  const file = path.join(CACHE, `${key}.json`)
  if (!fs.existsSync(file)) return null
  const record = JSON.parse(fs.readFileSync(file, 'utf8'))
  return record.format === FORMAT ? record : null
}

/** The exit code a gate that outran its deadline answers with. */
const TIMED_OUT_EXIT = 124

/** What a nonzero spec run's report says: a failed assertion, or a suite that never loaded. */
function unitOutcome(gate) {
  let report
  try {
    report = JSON.parse(fs.readFileSync(gate.report, 'utf8'))
  } catch {
    return { outcome: 'unjudged', reason: 'wrote no readable JSON report' }
  }
  const failed = Number(report.numFailedTests ?? 0)
  const suites = Number(report.numFailedTestSuites ?? 0)
  if (failed > 0) return { outcome: 'fail', reason: `${failed} assertion${failed === 1 ? '' : 's'} failed` }
  if (suites > 0) return { outcome: 'unjudged', reason: `${suites} test suite${suites === 1 ? '' : 's'} did not load` }
  return { outcome: 'unjudged', reason: 'ended nonzero without a failed assertion' }
}

/** What a nonzero stand-in run says: which case kind failed, or which gave no verdict. */
function standInOutcome(gate) {
  let report
  try {
    report = JSON.parse(fs.readFileSync(gate.report, 'utf8'))
  } catch {
    return { outcome: 'unjudged', reason: 'wrote no readable stand-in report' }
  }
  const lanes = Object.entries(report).filter(([name, code]) => name !== 'at' && Number.isInteger(code))
  const failed = lanes.filter(([, code]) => code === 1 || code === 2).map(([name]) => name)
  if (failed.length > 0) return { outcome: 'fail', reason: `${failed.join(', ')} failed` }
  const unjudged = lanes.filter(([, code]) => code === UNJUDGED_EXIT).map(([name]) => name)
  if (unjudged.length > 0) return { outcome: 'unjudged', reason: `${unjudged.join(', ')} gave no verdict` }
  return { outcome: 'unjudged', reason: 'ended nonzero without a lane outcome' }
}

/**
 * What one gate's ending says. Only a gate that names a failed assertion is a verdict;
 * everything the system ended, or that never reached a test, runs again on the next
 * request. A deadline is the one this file enforced, not an exit code the gate chose.
 */
function classifyGate(gate, code, signal, timedOut) {
  if (timedOut) return { outcome: 'unjudged', reason: `passed its ${gate.minutes} min deadline` }
  if (signal !== null) return { outcome: 'unjudged', reason: `stopped by ${signal}` }
  if (code === null) return { outcome: 'unjudged', reason: 'ended without an exit code' }
  if (code === 0) return { outcome: 'ok', reason: 'passed' }
  if (code === UNJUDGED_EXIT && (gate.id === 'stand-in' || gate.id === 'e2e')) {
    const reason = gate.id === 'stand-in' ? 'the stand-in page gave no verdict' : 'the lane gave no verdict on this host'
    return { outcome: 'unjudged', reason }
  }
  if (code < 0 || code > 255) return { outcome: 'unjudged', reason: `ended with an abnormal exit code ${code}` }
  if (gate.id === 'unit') return unitOutcome(gate)
  if (gate.id === 'stand-in') return standInOutcome(gate)
  return { outcome: 'fail', reason: `exit ${code}` }
}

/** How one gate's outcome and reason read in the run's lines. */
function gateWord(outcome, reason) {
  if (outcome === 'ok') return 'ok'
  return `${outcome === 'fail' ? 'failed' : 'gave no verdict'} — ${reason}`
}

/**
 * Take a gate down with every process under it: a lane's browsers are its grandchildren,
 * and a hung one left behind keeps the lock this run holds.
 */
function killTree(child) {
  if (process.platform === 'win32') {
    execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    return
  }
  child.kill('SIGKILL')
}

/**
 * Run one gate with its output on this terminal, and answer with how it ended. A gate past
 * its deadline — the cloud step's own `timeout-minutes` — has hung: it is taken down and
 * answers TIMED_OUT_EXIT, so the run ends and the lock goes free. A gate that writes a
 * report starts with none beside it.
 */
function runGate(gate) {
  return new Promise((resolve, reject) => {
    if (gate.report !== undefined) {
      fs.mkdirSync(path.dirname(gate.report), { recursive: true })
      fs.rmSync(gate.report, { force: true })
    }
    const child = spawn(process.execPath, [gate.script, ...gate.args], { cwd: ROOT, stdio: 'inherit' })
    running.add(child)
    let timedOut = false
    const deadline = setTimeout(() => {
      timedOut = true
      say(`verify: ${gate.id} passed its ${gate.minutes} min deadline; taking it down`)
      killTree(child)
    }, gate.minutes * 60_000)
    child.on('error', reject)
    child.on('close', (code, signal) => {
      clearTimeout(deadline)
      running.delete(child)
      resolve({ code: timedOut ? TIMED_OUT_EXIT : code, signal: timedOut ? null : signal, timedOut })
    })
  })
}

/**
 * Run the gates of one stage beside each other: they read what the stages before them
 * wrote and nothing the stage itself produces, so the stage costs its slowest gate.
 */
async function runStage(stage) {
  say(`\nverify: ${stage.length === 1 ? stage[0].id : `${stage.map((gate) => gate.id).join(', ')} together`}`)
  for (const gate of stage) say(`verify:   ${gate.id} — node ${gate.script}${gate.args.length === 0 ? '' : ` ${gate.args.join(' ')}`}`)
  return Promise.all(stage.map(async (gate) => {
    const startedAt = Date.now()
    const { code, signal, timedOut } = await runGate(gate)
    const ms = Date.now() - startedAt
    const { outcome, reason } = classifyGate(gate, code, signal, timedOut)
    say(`verify: ${gate.id} ${gateWord(outcome, reason)} (${seconds(ms)})`)
    return { id: gate.id, code, ms, outcome, reason }
  }))
}

/** Run every gate of this request, file the verdict, and return the record. */
async function runAll(request, tree, key) {
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`
  say(`verify: run ${runId}`)
  const started = Date.now()
  const gates = []
  /** The build output the build gate left behind; null before that gate runs. */
  let built = null
  for (const stage of stagesFor(request)) {
    gates.push(...await runStage(stage))
    if (stage.some((gate) => gate.id === 'build')) built = libHash()
    if (gates.some((gate) => gate.outcome !== 'ok')) {
      // A gate that is not ok ends the run before the next stage: the lanes above it read
      // what it produces. A gate that gave no verdict is not a failure and not a pass, so
      // the run answers "unjudged" unless another gate failed.
      break
    }
  }
  const failed = gates.some((gate) => gate.outcome === 'fail')
  const unjudged = gates.some((gate) => gate.outcome === 'unjudged')
  const exitCode = failed ? 1 : unjudged ? UNJUDGED_EXIT : 0
  const swapped = exitCode === 0 && libHash() !== built
  const record = {
    format: FORMAT,
    key,
    tree: tree.hash,
    files: tree.files,
    request,
    runId,
    at: new Date().toISOString(),
    ms: Date.now() - started,
    exitCode: swapped ? 1 : exitCode,
    // A run that left a gate unjudged answers nothing a later request could reuse.
    filed: !swapped && !unjudged,
    gates,
  }
  if (swapped) {
    say('verify: the build output changed while the gates ran — a rebuild behind `npm run dev` takes no lock; no verdict filed, re-run over a still tree')
    return record
  }
  if (!record.filed) return record
  fs.mkdirSync(CACHE, { recursive: true })
  fs.writeFileSync(path.join(CACHE, `${key}.json`), `${JSON.stringify(record, null, 2)}\n`)
  return record
}

/** What this request's answer was, and where it came from. */
function report(record, source) {
  const gates = record.gates.map((gate) => `${gate.id} ${gate.outcome}`).join(', ')
  if (source === 'cache') {
    say(`verify: reused — the same tree and the same gates ${record.exitCode === 0 ? 'passed' : 'failed'} at ${record.at} (run ${record.runId}, ${seconds(record.ms)}); --force re-runs them`)
    say(`verify: ${record.exitCode === 0 ? 'PASS' : 'FAIL'} — ${gates}`)
  } else {
    const filed = record.filed === false ? '; no verdict filed' : `; verdict filed as ${record.key.slice(0, 12)}`
    const word = record.exitCode === 0 ? 'PASS' : record.exitCode === UNJUDGED_EXIT ? 'UNJUDGED' : 'FAIL'
    say(`\nverify: ${word} — ${gates} (${seconds(record.ms)})${filed}`)
  }
  for (const gate of record.gates) {
    if (gate.outcome !== 'ok') say(`verify:   ${gate.id} ${gate.outcome} — ${gate.reason}`)
  }
}

async function main() {
  const request = parseRequest()
  const tree = treeHash(ROOT)
  const key = keyOf(tree.hash, request)
  say(`verify: tree ${tree.hash.slice(0, 12)} (${tree.files} files under ${TREES.join(', ')} and the root), gates ${gatesFor(request).map((gate) => gate.id).join(', ')}`)
  const before = request.force ? null : cached(key)
  if (before !== null) {
    report(before, 'cache')
    process.exit(before.exitCode)
  }
  // A verdict already answers in a moment and says nothing; a run about to spend the
  // release gate's minutes asks before it starts.
  if (walksEverything(request)) say('verify: warning — 请确认你正处于发布流程。')
  const release = await takeLock('verify', key.slice(0, 12))
  holding = release
  // The gates run under this lock: they must not ask for it again.
  process.env[HELD] = LOCK
  let record
  try {
    // The run this request waited for may have answered this very key.
    record = (request.force ? null : cached(key)) ?? await runAll(request, tree, key)
  } finally {
    release()
    holding = null
    delete process.env[HELD]
  }
  report(record, 'run')
  process.exit(record.exitCode)
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    for (const child of running) child.kill(signal)
    // Only the lock this process holds is released: a request waiting for the lock must leave the run alone.
    if (holding !== null) holding()
    say(`verify: interrupted (${signal})`)
    process.exit(signal === 'SIGINT' ? 130 : 143)
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
