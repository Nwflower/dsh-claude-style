#!/usr/bin/env node
/**
 * ci-scope.mjs — what a push changed, as the outputs the workflow's lanes read.
 *
 * A push that touched no file the build or a browser reads does not need those
 * lanes, and one that touched a single feature directory does not need the
 * smoke's whole walk or every behaviour spec. This reads the changed paths once
 * and answers for the jobs: whether any code changed, which feature selection
 * the change earns, and the tree hash the build cache is keyed on. The selection
 * is one `--feature` flag that the smoke and the behaviour lane both read. The
 * directory names it prints are checked against the feature table the manifests
 * produce (D76), so a printed selection is one the smoke accepts, and a change
 * it cannot place selects nothing, which each lane reads as its whole walk.
 *
 * The answers are the job outputs the workflow's page lanes test before they
 * start, so a lane the answer leaves out is skipped rather than run and reported
 * green, and an answer that reads too narrowly leaves work unjudged. The
 * arrangement around them is in `.github/workflows/ci.yml`.
 *
 * It also holds the one push this cannot accept: a change to the appearance
 * snapshot (`packages/testing/data/appearance.json`) with no change under
 * `packages/client/src` and none to the files that read it (D87). The
 * snapshot is what the pages look like, so it only moves when what draws them
 * or what reads them moved; a push that carries it alone is a snapshot
 * recorded by hand, and `--appearance` fails it. A snapshot the base
 * does not hold at all is the layer's own arrival, which is no page's change.
 *
 * `--ledgers` holds the four records that only shrink to that promise: the
 * selectors the importance walk cannot reach (`importance-unreachable.json`,
 * D9), the whole-document lookups left outside the host access module
 * (`document-lookups.json`), the behaviour tests held over a known defect
 * (`quarantine.json`, D87) and the skin marks the older test code spells out
 * (`skin-literals.json`, D87). Each is compared with itself at the base and its
 * total may not rise however the reasons read; the total is what is compared,
 * so a selector rewritten or a module moved carries its entry along. Lint only
 * holds each record to the tree.
 *
 * Usage: node scripts/ci-scope.mjs [--base <ref> | --all | --files <path>] [--print] [--appearance] [--ledgers]
 *        --base diffs that ref against this commit (an all-zero ref means a new
 *        branch, which diffs against master's merge base). A merge queue entry
 *        and a manual run judge the whole tree whatever the base says: neither
 *        is a push whose change can be read off the event, and both are asked
 *        for on purpose. --all covers every tracked file, for the same answer
 *        from a machine with no event to read; --files reads the changed paths
 *        from that file, one per line, for trying the mapping itself. --print
 *        writes the answers to stdout; without it they are appended to
 *        `$GITHUB_OUTPUT`. --appearance fails the run over the snapshot push
 *        and --ledgers over a record that grew, instead of answering for the
 *        jobs; with --tree the base is HEAD and the record read is the
 *        working tree's.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { changedPaths } from './shared/changed-paths.mjs'
import { treeHash } from './shared/tree-hash.mjs'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const argOf = (flag) => {
  const at = args.indexOf(`--${flag}`)
  return at === -1 ? undefined : args[at + 1]
}

/**
 * What no gate reads: the documents, the changelog, the locale files and the
 * workflow itself. A push holding only these still runs the checks, which need
 * no build, and leaves the lanes that read a built page alone.
 */
const UNREAD = [/^docs\//, /^locale\//, /^\.github\//, /\.md$/, /^LICENSE$/, /^THIRD_PARTY_NOTICES\.txt$/]

/**
 * The snapshot whose change stands for the pages themselves, and the files
 * whose change is what may move it: the client's own sources, which carry the
 * sheets the snapshot computes, and the three testing files that decide the
 * reading — the reader, the parts it reads and the walk whose states it reads
 * in.
 */
const APPEARANCE = 'packages/testing/data/appearance.json'
const APPEARANCE_READERS = ['packages/testing/appearance.mjs', 'packages/testing/data/appearance-parts.json', 'packages/testing/importance.mjs']
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
 * Every path the working tree has changed, a file the change removed included:
 * the snapshot rule has to see a path that is gone as well, or a push that took
 * the snapshot down would read as no change at all.
 */
function workingTreePaths() {
  return changedPaths()
}

/** The paths this push changed, by the base the caller named. */
function changedFiles() {
  // A list read from a file answers the same question without a checkout to
  // diff, which is how the mapping itself is tried by hand.
  const listed = argOf('files')
  if (listed !== undefined) {
    return fs.readFileSync(listed, 'utf8').split('\n').map((line) => line.trim()).filter(Boolean)
  }
  // The working tree, for the snapshot rule: a session records the snapshot
  // before it commits, so both the file and the sources that moved it are still
  // uncommitted when the rule is asked. Every other question is about a push,
  // which is read from the base below.
  if (args.includes('--tree')) return workingTreePaths()
  // A queue entry and a manual run judge the whole tree: neither is a push whose
  // change can be read off the event, and both are asked for on purpose.
  const event = process.env.GITHUB_EVENT_NAME ?? ''
  if (args.includes('--all') || event === 'merge_group' || event === 'workflow_dispatch') return tracked()
  const named = argOf('base')
  const base = named === undefined || named === '' || /^0+$/.test(named) ? 'origin/master' : named
  // A base this checkout does not hold — a rewritten branch whose old tip no
  // branch points at, a revision the fetch left out — leaves the change
  // unreadable, and the whole tree is the answer that cannot be wrong.
  if (!holds(base)) {
    console.error(`ci-scope: ${base} is not in this checkout; judging the whole tree`)
    return tracked()
  }
  // Three dots is the merge base: a branch push answers for the branch's own
  // commits rather than for everything master did meanwhile.
  return git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean)
}

/** The answers the workflow's jobs read. */
function scope(files) {
  const { featureCases, readManifests } = require('./shared/read-manifests.mjs')
  const featureCasesOf = featureCases(readManifests())
  const features = new Set()
  let code = false
  let shared = false
  for (const file of files) {
    if (UNREAD.some((pattern) => pattern.test(file))) continue
    code = true
    const feature = file.match(/^packages\/client\/src\/features\/([^/]+)\//)
    if (feature !== null && (featureCasesOf[feature[1]] ?? []).length > 0) {
      features.add(feature[1])
      continue
    }
    shared = true
  }
  // A change to the shared layer reaches every feature, and a selection is only
  // the narrow answer when every changed file sits inside a covered directory.
  const selection = !code || shared || features.size === 0 ? '' : `--feature ${[...features].sort().join(',')}`
  return { code, selection, tree: treeHash(ROOT).hash }
}

/**
 * The one push the mapping refuses: the appearance snapshot moved and nothing
 * under `packages/client/src` did, nor any file that reads it. The snapshot is
 * written by the importance walk (packages/testing/appearance.mjs), so a push
 * carrying it alone is a snapshot recorded by hand — it would accept whatever
 * the page happened to look like on the machine that wrote it, with no change
 * to the sheets to say why. A snapshot
 * the base does not hold is the layer arriving, not a page changing, and stands.
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
 * The records that only shrink, each as the entries it holds and how much each
 * one counts for; growth is a total above the base's, and the keys the base
 * lacks or holds less of are named to say where it came from.
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

/**
 * The revision a ledger is compared with: HEAD for the working tree, else the
 * merge base of the named base and this commit, the same change the push is
 * read as above.
 */
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
