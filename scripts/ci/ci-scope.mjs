#!/usr/bin/env node
/**
 * ci-scope.mjs — map changed paths to workflow selections and tree hashes (D76, D92).
 * Unknown changes select full lanes; appearance snapshots move with their sources or
 * readers, and shrink-only ledgers may not grow.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { changedPaths } from '../shared/changed-paths.mjs'
import { treeHash } from '../shared/tree-hash.mjs'
import { covered, featureCoverage } from '../shared/feature-coverage.mjs'
import { readHeader } from '../shared/spec-header.mjs'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const args = process.argv.slice(2)
const argOf = (flag) => {
  const at = args.indexOf(`--${flag}`)
  return at === -1 ? undefined : args[at + 1]
}

/** Documentation-only changes still run checks but do not start built-page lanes. */
const UNREAD = [/^docs\//, /^locale\//, /^\.github\//, /\.md$/, /^LICENSE$/, /^THIRD_PARTY_NOTICES\.txt$/]

/** Only page sources or snapshot readers may move the appearance snapshot. */
const APPEARANCE = 'packages/testing/data/appearance.json'
const APPEARANCE_READERS = ['packages/testing/scenarios/appearance.mjs', 'packages/testing/data/appearance-parts.json', 'packages/testing/scenarios/importance.mjs']
const APPEARANCE_SOURCES = [/^packages\/client\/src\//]

function git(...argv) {
  const result = spawnSync('git', argv, { cwd: ROOT, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`git ${argv.join(' ')} failed: ${result.stderr.trim()}`)
  return result.stdout
}

/** Every tracked path: the answer a run that cannot read a change falls back to. */
function tracked() {
  return git('ls-files').split('\n').filter(Boolean)
}

/** Whether this checkout holds a revision at all — a force push can leave none. */
function holds(revision) {
  return spawnSync('git', ['rev-parse', '--verify', '--quiet', `${revision}^{commit}`], { cwd: ROOT, encoding: 'utf8' }).status === 0
}

/** Whether a revision this checkout holds has a file at a path. */
function holdsFile(revision, file) {
  return spawnSync('git', ['cat-file', '-e', `${revision}:${file}`], { cwd: ROOT }).status === 0
}

/**
 * Every path the working tree has changed, a removed file included: a push that took
 * the snapshot down would otherwise read as no change at all.
 */
function workingTreePaths() {
  return changedPaths()
}

/** The paths this push changed, by the base the caller named. */
function changedFiles() {
  // A list read from a file answers the same question without a checkout to diff.
  const listed = argOf('files')
  if (listed !== undefined) {
    return fs.readFileSync(listed, 'utf8').split('\n').map((line) => line.trim()).filter(Boolean)
  }
  // The working tree, for the snapshot rule: a session records the snapshot before it
  // commits, so the file and the sources that moved it are still uncommitted.
  if (args.includes('--tree')) return workingTreePaths()
  // A queue entry and a manual run judge the whole tree: neither carries a push's change.
  const event = process.env.GITHUB_EVENT_NAME ?? ''
  if (args.includes('--all') || event === 'merge_group' || event === 'workflow_dispatch') return tracked()
  const named = argOf('base')
  const base = named === undefined || named === '' || /^0+$/.test(named) ? 'origin/master' : named
  // A base this checkout does not hold leaves the change unreadable, and the whole tree
  // is the answer that cannot be wrong.
  if (!holds(base)) {
    console.error(`ci-scope: ${base} is not in this checkout; judging the whole tree`)
    return tracked()
  }
  // Three dots is the merge base: a branch push answers for its own commits, not for master's meanwhile.
  return git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean)
}

/** The answers the workflow's jobs read. */
function scope(files) {
  const coverage = featureCoverage()
  const features = new Set()
  let code = false
  let shared = false
  for (const file of files) {
    if (UNREAD.some((pattern) => pattern.test(file))) continue
    code = true
    const feature = file.match(/^packages\/client\/src\/features\/([^/]+)\//)
    if (feature !== null && covered(coverage[feature[1]])) {
      features.add(feature[1])
      continue
    }
    const spec = /^packages\/testing\/specs\/(logic|mechanism|behaviour)\/.+\.spec\.(ts|mjs)$/.test(file)
    if (spec && fs.existsSync(path.join(ROOT, file))) {
      const named = readHeader(file).features
      if (named.length > 0 && named.every((name) => covered(coverage[name]))) {
        for (const name of named) features.add(name)
        continue
      }
    }
    shared = true
  }
  // A change to the shared layer reaches every feature; a selection is the narrow answer
  // only when every changed file sits inside a covered directory.
  const selection = !code || shared || features.size === 0 ? '' : `--feature ${[...features].sort().join(',')}`
  return { code, selection, tree: treeHash(ROOT).hash }
}

/**
 * The one push the mapping refuses: the appearance snapshot moved and nothing under
 * `packages/client/src` did, nor any file that reads it. The snapshot is written by the
 * importance walk, so a push carrying it alone records whatever the page looked like on
 * the machine that wrote it. A snapshot the base does not hold is the layer arriving and stands.
 */
function refuseSnapshotAlone(files) {
  if (!files.includes(APPEARANCE)) return
  const moved = files.filter((file) => APPEARANCE_SOURCES.some((pattern) => pattern.test(file)))
  if (moved.length > 0 || APPEARANCE_READERS.some((file) => files.includes(file))) return
  const base = argOf('base')
  const known = args.includes('--tree') || base === undefined || base === '' || /^0+$/.test(base)
    ? tracked().includes(APPEARANCE)
    : holds(base) && holdsFile(base, APPEARANCE)
  if (!known) return
  console.error(`ci-scope: ${APPEARANCE} changed and nothing under packages/client/src did, nor any file that reads it — the appearance snapshot is recorded by the importance walk and only moves with what draws or reads the pages; drop it from the push or carry the change it belongs to`)
  process.exit(1)
}

/**
 * The records that only shrink, each as the entries it holds and what each counts;
 * growth is a total above the base's, with the keys that grew named.
 */
const LEDGERS = [
  {
    file: 'packages/testing/data/importance-unreachable.json',
    entries: (record) => new Map(record.groups.flatMap((group) => group.selectors.map((selector) => [selector, 1]))),
    what: 'unreachable selector',
  },
  {
    file: 'packages/testing/data/document-lookups.json',
    entries: (record) => new Map(Object.entries(record.files).map(([file, entry]) => [file, entry.count])),
    what: 'whole-document lookup count',
  },
  {
    file: 'packages/testing/data/quarantine.json',
    entries: (record) => new Map(record.tests.map((entry) => [entry.id, 1])),
    what: 'quarantined test',
  },
  {
    file: 'packages/testing/data/skin-literals.json',
    entries: (record) => new Map(Object.entries(record.files)),
    what: 'spelled skin mark',
  },
]

/** The revision a ledger is compared with: HEAD for the working tree, else the merge base of the named base. */
function ledgerBase() {
  if (args.includes('--tree')) return 'HEAD'
  const named = argOf('base')
  const base = named === undefined || named === '' || /^0+$/.test(named) ? 'origin/master' : named
  if (!holds(base)) throw new Error(`ci-scope: ${base} is not in this checkout, so the records that only shrink cannot be compared with it`)
  return git('merge-base', base, 'HEAD').trim()
}

/** Refuse every record that grew past what the base held. A record the base does not hold is arriving and stands. */
function refuseLedgerGrowth() {
  const base = ledgerBase()
  const problems = []
  for (const ledger of LEDGERS) {
    if (!holdsFile(base, ledger.file)) continue
    const before = ledger.entries(JSON.parse(git('show', `${base}:${ledger.file}`)))
    const now = ledger.entries(JSON.parse(fs.readFileSync(path.join(ROOT, ledger.file), 'utf8')))
    const total = (entries) => [...entries.values()].reduce((sum, amount) => sum + amount, 0)
    if (total(now) <= total(before)) continue
    const grown = [...now].filter(([key, amount]) => amount > (before.get(key) ?? 0)).map(([key]) => key)
    problems.push(`${ledger.file}: ${total(before)} → ${total(now)} ${ledger.what}s; grown at ${grown.join(' | ')}`)
  }
  if (problems.length === 0) return
  for (const problem of problems) console.error(`ci-scope: ${problem}`)
  console.error('ci-scope: these records only shrink — reach the selector from the walk, read the seat through the engine host.ts and bus.ts, fix the defect a quarantined test fails over, or read a skin mark from packages/testing/data/surface.json, rather than recording it')
  process.exit(1)
}

const changed = changedFiles()
if (args.includes('--appearance') || args.includes('--ledgers')) {
  if (args.includes('--appearance')) {
    refuseSnapshotAlone(changed)
    const moved = changed.filter((file) => APPEARANCE_SOURCES.some((pattern) => pattern.test(file)))
    console.log(`ci-scope: ${APPEARANCE} ${changed.includes(APPEARANCE) ? `moved with ${moved.length} client source file(s)` : 'did not move'}`)
  }
  if (args.includes('--ledgers')) {
    refuseLedgerGrowth()
    console.log(`ci-scope: ${LEDGERS.length} records that only shrink, none grew`)
  }
  process.exit(0)
}
const answers = scope(changed)
const lines = Object.entries(answers).map(([key, value]) => `${key}=${value}`)
if (args.includes('--print')) {
  process.stdout.write(`${lines.join('\n')}\n`)
} else {
  const file = process.env.GITHUB_OUTPUT
  if (file === undefined || file === '') throw new Error('ci-scope: no $GITHUB_OUTPUT; use --print to read the answers here')
  fs.appendFileSync(file, `${lines.join('\n')}\n`)
}
