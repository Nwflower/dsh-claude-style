#!/usr/bin/env node
/**
 * faults.mjs — whether the specs catch known defects (D86).
 *
 * The corpus (packages/testing/faults/corpus.json) holds defects as patches on
 * the product's sources: a fix from history that still reverses on the current
 * tree (`"apply": "reverse"` over the fix's own diff), or a defect written down
 * from a spec's intent (`"apply": "forward"`). Each fault is applied in a
 * scratch copy of the tree under `.debug/faults/` — the working tree is never
 * touched, and the copy borrows `node_modules` through a directory link — and
 * the layers it can reach are run there: the logic and mechanism specs always,
 * the build and the behaviour specs of the feature directories the patch
 * touches. A fault is caught when an assertion of one of them goes red: a spec
 * that only stops loading, or a build check that refuses the source, proves
 * nothing about the reader's page and is reported apart. The ids that went red
 * are what the report keeps, so a spec no fault ever turns red is visible, and a
 * fault whose patch no longer applies fails the run rather than leaving the
 * corpus quietly.
 *
 * `--suite old` runs the same corpus against the unit lane the tree had at
 * `--base` (a revision of the caller's choosing: the lane stopped existing when
 * the specs replaced it), copied from git: the comparison the migration was
 * accepted on. The smoke and the end-to-end lane are the same in both suites and
 * are not run here.
 *
 * Usage: node packages/testing/faults.mjs [--fault <id>[,<id>…]] [--suite new|old --base <ref>] [--keep]
 *        --keep leaves the scratch copies in place for reading.
 * Exit:  0 the corpus caught at least the number packages/testing/faults/expected.json
 *        records, every fault applied, and the chosen faults were each caught ·
 *        1 the rate fell below the record, a fault no longer applies, or a named
 *        fault no assertion catches · 2 the run could not start
 */
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from '../../scripts/shared/spec-header.mjs'

const CORPUS = path.join(import.meta.dirname, 'faults', 'corpus.json')
/** The number of faults each suite catches by an assertion: the record a run may not fall below. */
const RECORD = path.join(import.meta.dirname, 'faults', 'expected.json')
const OUT = path.join(ROOT, '.debug', 'faults')
const VITEST = path.join('node_modules', 'vitest', 'vitest.mjs')
/** The behaviour lane waits on frames, so the corpus drives two pages at once. */
const BEHAVIOUR_JOBS = ['--jobs', '2']

function bad(message) {
  console.error(`faults: ${message}`)
  process.exit(2)
}

function request() {
  const args = process.argv.slice(2)
  const asked = { fault: [], suite: 'new', base: null, keep: false }
  for (let at = 0; at < args.length; at += 1) {
    const arg = args[at]
    if (arg === '--keep') { asked.keep = true; continue }
    const flag = arg.replace(/^--/, '')
    const value = args[++at]
    if (value === undefined) bad(`${arg} needs a value`)
    if (flag === 'fault') asked.fault.push(...value.split(',').map((one) => one.trim()).filter(Boolean))
    else if (flag === 'suite' && (value === 'new' || value === 'old')) asked.suite = value
    else if (flag === 'base') asked.base = value
    else bad(`unknown argument "${arg}"`)
  }
  // The old suite is a revision of its own: the lane it compares against stopped
  // existing when the specs replaced it, so the revision cannot be guessed.
  if (asked.suite === 'old' && asked.base === null) bad('--suite old needs --base <ref>: the revision holding the unit lane to compare against')
  return asked
}

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })

/** The files at a revision, as one archive this run extracts for every fault. */
function archiveOf(base) {
  const archive = path.join(OUT, `base-${process.pid}.tar`)
  git('archive', '--format=tar', '-o', archive, base)
  return archive
}

/**
 * A scratch copy of a tree: the working tree's files as they stand, or the
 * files of an archive taken at a revision, with `node_modules` linked in from here.
 */
function scratchCopy(dir, archive) {
  removeCopy(dir)
  fs.mkdirSync(dir, { recursive: true })
  if (archive !== null) {
    // Windows' own tar: the GNU tar a Git shell puts first on the path reads a
    // drive letter's colon as a remote host and stops short of this archive.
    const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar'
    execFileSync(tar, ['-xf', archive, '-C', dir])
  } else {
    for (const file of git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0')) {
      if (file === '' || !fs.existsSync(path.join(ROOT, file))) continue
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
      fs.copyFileSync(path.join(ROOT, file), path.join(dir, file))
    }
  }
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'), 'junction')
}

/** Take a scratch copy down: the link first, so nothing it points at goes with it. */
function removeCopy(dir) {
  const link = path.join(dir, 'node_modules')
  if (fs.existsSync(link)) fs.unlinkSync(link)
  fs.rmSync(dir, { recursive: true, force: true })
}

/** Run one node script in the copy, answering its exit code and its output. */
function run(dir, script, args) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, CI: '' } })
  return { code: result.status ?? 1, output: `${result.stdout}${result.stderr}` }
}

/** The feature directories a patch touches, and whether it reaches past them. */
function reach(patch) {
  const files = [...patch.matchAll(/^\+\+\+ b\/(\S+)|^--- a\/(\S+)/gm)].map((match) => match[1] ?? match[2])
  const features = new Set()
  let wide = false
  for (const file of files) {
    const feature = /^packages\/client\/src\/features\/([^/]+)\//.exec(file)
    if (feature !== null) features.add(feature[1])
    else if (/^packages\/client\/src\//.test(file)) wide = true
  }
  return { features: [...features], wide, browserHalf: files.some((file) => file.startsWith('packages/client/src/')) }
}

/** The spec ids or test files that went red in one Vitest JSON report. */
function vitestRed(dir, file) {
  if (!fs.existsSync(file)) return ['(the lane did not report)']
  const report = JSON.parse(fs.readFileSync(file, 'utf8'))
  const red = []
  for (const suite of report.testResults) {
    const rel = path.relative(dir, suite.name).replace(/\\/g, '/')
    const layered = /^packages\/testing\/specs\/(\w+)\/([^/]+)\//.exec(rel)
    for (const test of suite.assertionResults) {
      if (test.status !== 'failed') continue
      red.push(layered === null ? `${rel} › ${test.title}` : `${layered[1]}/${layered[2]}/${test.title}`)
    }
    if (suite.status === 'failed' && suite.assertionResults.length === 0) red.push(`${rel} (did not load)`)
  }
  return red
}

/** Apply one fault in the copy and run the layers it reaches. */
function judge(dir, fault, suite, cleanBehaviour) {
  const patchFile = path.join(import.meta.dirname, 'faults', fault.patch)
  const patch = fs.readFileSync(patchFile, 'utf8')
  const touched = [...new Set([...patch.matchAll(/^\+\+\+ b\/(\S+)/gm)].map((match) => match[1]))]
  const before = touched.map((file) => fs.existsSync(path.join(dir, file)) ? fs.readFileSync(path.join(dir, file), 'utf8') : null)
  // The copy sits inside this repository's tree, and `git apply` run in a
  // repository's subdirectory skips every path outside it without a word: the
  // ceiling stops the search for a repository at the copy, so the patch is
  // applied to the copy's own files.
  const applied = spawnSync('git', ['apply', ...(fault.apply === 'reverse' ? ['-R'] : []), patchFile], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, GIT_CEILING_DIRECTORIES: path.dirname(dir) },
  })
  if (applied.status !== 0) return { id: fault.id, applied: false, red: [], note: applied.stderr.trim() }
  const changed = touched.some((file, at) => (fs.existsSync(path.join(dir, file)) ? fs.readFileSync(path.join(dir, file), 'utf8') : null) !== before[at])
  if (!changed) return { id: fault.id, applied: false, red: [], note: 'the patch changed no file of the copy' }
  const red = []
  const json = path.join(dir, '.debug', 'faults-vitest.json')
  run(dir, VITEST, ['run', '--reporter=json', `--outputFile=${json}`])
  red.push(...vitestRed(dir, json))
  const { features, wide, browserHalf } = reach(patch)
  // The behaviour specs read the built page: the build is paid only where one of
  // them covers what the patch touches.
  const selection = wide || features.length === 0 ? [] : ['--feature', features.join(',')]
  const listed = suite === 'new' && browserHalf ? run(dir, 'packages/testing/behaviour.mjs', ['--list', ...selection]) : null
  if (listed !== null && listed.code === 0 && listed.output.trim() !== '') {
    const build = run(dir, 'scripts/build.mjs', [])
    if (build.code !== 0) {
      red.push(`build (${build.output.split('\n').find((line) => /error|refus/i.test(line)) ?? 'failed'})`)
    } else {
      run(dir, 'packages/testing/behaviour.mjs', [...BEHAVIOUR_JOBS, ...selection])
      const report = path.join(dir, '.debug', 'behaviour', 'report.json')
      // A behaviour test that already fails on the untouched copy is red for
      // its own reason, and saying the fault was caught by it would credit the
      // corpus with a judgement nothing made.
      if (fs.existsSync(report)) red.push(...JSON.parse(fs.readFileSync(report, 'utf8')).results
        .filter((result) => !result.ok && !result.quarantined && !cleanBehaviour.has(result.id))
        .map((result) => result.id))
    }
  }
  // A spec file that no longer loads — or a build whose type check fails over the
  // declared surface or a spec — is red because the surface the specs import
  // moved, not because an assertion saw the defect; a build check refusing the
  // product's own sources is the static layer's catch, which both suites share.
  // Each is reported apart.
  const surfaceBroke = (entry) => entry.endsWith('(did not load)') || entry.startsWith('(the lane') || (entry.startsWith('build (') && /pure\.ts|packages[\\/]testing[\\/]specs/.test(entry))
  const asserted = red.filter((entry) => !surfaceBroke(entry) && !entry.startsWith('build ('))
  const built = red.filter((entry) => entry.startsWith('build (') && !surfaceBroke(entry))
  const how = asserted.length > 0 ? 'assertion' : built.length > 0 ? 'build' : red.length > 0 ? 'load' : 'none'
  // Only an assertion counts as caught: a fault that merely stops a spec loading,
  // or trips a build check, exercised no judgement about the reader's page, and
  // counting it would let the corpus look effective while nothing is asserted.
  return { id: fault.id, applied: true, caught: asserted.length > 0, how, red }
}

function main() {
  const asked = request()
  const corpus = JSON.parse(fs.readFileSync(CORPUS, 'utf8')).faults
  const chosen = asked.fault.length === 0 ? corpus : corpus.filter((fault) => asked.fault.includes(fault.id))
  if (chosen.length === 0) bad('the selection holds no fault')
  fs.mkdirSync(OUT, { recursive: true })
  // One directory per run: a copy a scanner still holds open cannot block the next run.
  const dir = path.join(OUT, `copy-${asked.suite}-${process.pid}`)
  const archive = asked.suite === 'old' ? archiveOf(asked.base) : null
  // A clean run first: a lane already red on the untouched copy would count every fault as caught.
  scratchCopy(dir, archive)
  const clean = run(dir, VITEST, ['run', '--reporter=json', `--outputFile=${path.join(dir, '.debug', 'faults-vitest.json')}`])
  const cleanRed = vitestRed(dir, path.join(dir, '.debug', 'faults-vitest.json'))
  if (clean.code !== 0 || cleanRed.length > 0) bad(`the ${asked.suite} suite is red before any fault: ${cleanRed.slice(0, 5).join(' | ')}`)
  // The behaviour lane gets the same clean reading where a fault reaches it: a
  // test red on the untouched copy is red for its own reason.
  const cleanBehaviour = new Set()
  if (asked.suite === 'new' && chosen.some((fault) => reach(fs.readFileSync(path.join(import.meta.dirname, 'faults', fault.patch), 'utf8')).browserHalf)) {
    const build = run(dir, 'scripts/build.mjs', [])
    if (build.code !== 0) bad('the build is red before any fault; the behaviour lane cannot be read')
    run(dir, 'packages/testing/behaviour.mjs', BEHAVIOUR_JOBS)
    const report = path.join(dir, '.debug', 'behaviour', 'report.json')
    if (fs.existsSync(report)) {
      for (const result of JSON.parse(fs.readFileSync(report, 'utf8')).results) {
        if (!result.ok && !result.quarantined) cleanBehaviour.add(result.id)
      }
    }
    if (cleanBehaviour.size > 0) console.log(`  clean behaviour failures, not credited to any fault: ${[...cleanBehaviour].join(' | ')}`)
  }
  const results = []
  for (const fault of chosen) {
    scratchCopy(dir, archive)
    const result = judge(dir, fault, asked.suite, cleanBehaviour)
    results.push({ ...result, from: fault.from, defect: fault.defect })
    const kind = { load: ', only by specs that no longer load', build: ', by a build check' }[result.how] ?? ''
    console.log(`  ${!result.applied ? 'skip' : result.caught ? 'red ' : 'MISS'} ${fault.id}${result.applied ? ` — ${result.red.length} red${kind}` : ` — ${result.note}`}`)
    for (const id of result.red.slice(0, 6)) console.log(`         ${id}`)
  }
  if (!asked.keep) removeCopy(dir)
  if (archive !== null) fs.rmSync(archive, { force: true })
  const notApplied = results.filter((result) => !result.applied)
  const appliedResults = results.filter((result) => result.applied)
  const caught = appliedResults.filter((result) => result.caught).length
  const byLoad = appliedResults.filter((result) => result.how === 'load').length
  const byBuild = appliedResults.filter((result) => result.how === 'build').length
  // A run over part of the corpus files its own report, beside the whole one.
  const file = path.join(OUT, `report-${asked.suite}${asked.fault.length > 0 ? '-part' : ''}.json`)
  fs.writeFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), suite: asked.suite, base: asked.suite === 'old' ? asked.base : null, results }, null, 2)}\n`)
  console.log(`\nfaults: the ${asked.suite} suite caught ${caught} of ${appliedResults.length} faults by an assertion — ${byBuild} only by a build check, ${byLoad} only by specs that no longer load (${notApplied.length} did not apply); report in ${path.relative(ROOT, file).replace(/\\/g, '/')}`)
  // A fault that no longer applies has left the corpus: that is reported and
  // fails the run, so the corpus cannot quietly shrink to nothing.
  if (notApplied.length > 0) {
    console.error(`faults: ${notApplied.length} fault(s) did not apply: ${notApplied.map((result) => result.id).join(', ')} — take them out of packages/testing/faults/corpus.json or bring the patch up to the tree`)
    return 1
  }
  // A run over part of the corpus answers per fault: each has to be caught by an
  // assertion. A whole run answers against the record, which only rises.
  if (asked.fault.length > 0) return caught === appliedResults.length ? 0 : 1
  const record = JSON.parse(fs.readFileSync(RECORD, 'utf8'))
  const floor = record[asked.suite]
  if (typeof floor !== 'number') {
    console.log(`faults: no record stands for the ${asked.suite} suite — this run measures it (${caught} of ${appliedResults.length}); a comparison run reads the rate and fails nothing`)
    return 0
  }
  if (caught < floor) {
    console.error(`faults: the ${asked.suite} suite caught ${caught} faults by an assertion, below the ${floor} packages/testing/faults/expected.json records — a spec that used to turn red on a fault no longer does`)
    return 1
  }
  if (caught > floor) console.log(`faults: ${caught} faults caught by an assertion, past the ${floor} on record — write "${asked.suite}": ${caught} into packages/testing/faults/expected.json`)
  const uncaught = appliedResults.filter((result) => !result.caught)
  if (uncaught.length > 0) {
    console.log(`faults: ${uncaught.length} fault(s) no assertion catches yet: ${uncaught.map((result) => result.id).join(', ')} — each is a spec the corpus still has to prove`)
  }
  return 0
}

process.exit(main())
