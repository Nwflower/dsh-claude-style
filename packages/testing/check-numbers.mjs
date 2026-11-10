#!/usr/bin/env node
/**
 * check-numbers.mjs — every number a check decides on, as a generated record
 * (D87).
 *
 * A check's failure is answered by loosening whichever number stood in its
 * expression, and nothing else makes that edit visible. This tool reads every
 * `check(name, expression, …)` in the two lanes, lists the numeric literals its
 * expression decides on, and writes them per file and per check name into
 * packages/testing/data/check-numbers.json. `--check` fails when the tree and the
 * record disagree, so changing a number — loosening one included — is a diff in
 * the record as well as in the code: a reviewer sees which checks moved and by
 * how much. The bound itself, with the reason it holds that value, belongs in
 * packages/testing/data/bounds.json, which the checks read.
 *
 * The name is the check's own first argument; a name built from a template is
 * keyed by its fixed part, so the record does not follow a constant's value.
 * The files are read on TypeScript's own syntax tree, through the project in
 * packages/testing/tsconfig.json, the way scripts/source-tree.mjs reads the
 * browser half.
 *
 * Usage: node packages/testing/check-numbers.mjs [--check]
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { SyntaxKind, skipTrivia } from 'typescript/unstable/ast'
import { API } from 'typescript/unstable/sync'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const RECORD = path.join(import.meta.dirname, 'data', 'check-numbers.json')
const PROJECT = path.join(import.meta.dirname, 'tsconfig.json')

const slashes = (file) => file.split(path.sep).join('/')

/** The files whose checks are recorded: the smoke's cases and probes, and the lane's own scenarios. */
function sources() {
  const files = []
  const add = (dir, pattern) => {
    for (const name of fs.readdirSync(path.join(ROOT, dir))) {
      if (pattern.test(name)) files.push(`${dir}/${name}`)
    }
  }
  add('packages/testing/smoke/cases', /\.mjs$/)
  add('packages/testing/smoke/probe', /\.js$/)
  for (const name of fs.readdirSync(path.join(ROOT, 'packages/testing'))) {
    if (/\.mjs$/.test(name) && !['host-half.mjs', 'smoke.mjs', 'lane.mjs', 'check-numbers.mjs', 'mock-llm.mjs', 'browser.mjs', 'privacy.mjs'].includes(name)) {
      files.push(`packages/testing/${name}`)
    }
  }
  return files.sort()
}

/** A node's own source text, its leading comments and whitespace left out. */
const textOf = (file, node) => file.text.slice(skipTrivia(file.text, node.pos), node.end)

/**
 * A check's key: its name, with any template's dynamic tail dropped. A name
 * that is no literal at all (a variable) is keyed by the expression as written.
 */
function nameOf(file, argument) {
  let text
  if (argument.kind === SyntaxKind.StringLiteral || argument.kind === SyntaxKind.NoSubstitutionTemplateLiteral) text = argument.text
  else if (argument.kind === SyntaxKind.TemplateExpression) text = argument.head.text
  else text = textOf(file, argument)
  return text.replace(/\s+/g, ' ').trim()
}

/** The numeric literals one expression decides on. */
function numbersOf(expression) {
  const found = new Set()
  const visit = (node) => {
    if (node.kind === SyntaxKind.NumericLiteral) found.add(Number(node.text))
    node.forEachChild(visit)
  }
  visit(expression)
  return [...found].sort((left, right) => left - right)
}

/**
 * Every check in one file: its name key and the numbers its expression decides
 * on. `check(` and the lane's own `lane.check(` both count; a helper named
 * `basicChecks(` is no check of its own.
 */
function record(file) {
  const found = {}
  const visit = (node) => {
    if (node.kind === SyntaxKind.CallExpression && node.arguments.length >= 2) {
      const callee = node.expression
      const named = callee.kind === SyntaxKind.Identifier ? callee.text
        : callee.kind === SyntaxKind.PropertyAccessExpression ? callee.name.text : undefined
      if (named === 'check') {
        let name = nameOf(file, node.arguments[0])
        const numbers = numbersOf(node.arguments[1])
        if (name !== '' && numbers.length > 0) {
          // Two checks can share a name that is built from the same fixed part;
          // the later one is keyed by its own line so neither hides the other.
          if (found[name] !== undefined) name = `${name} (line ${file.getLineAndCharacterOfPosition(skipTrivia(file.text, node.pos)).line + 1})`
          found[name] = numbers
        }
      }
    }
    node.forEachChild(visit)
  }
  file.forEachChild(visit)
  return found
}

/** The whole record, as the file holds it, read from one TypeScript project over the lanes. */
function current() {
  const api = new API({ cwd: ROOT })
  try {
    const config = slashes(PROJECT)
    const project = api.updateSnapshot({ openProjects: [config] }).getProjects().find((item) => slashes(item.configFileName) === config)
    if (project === undefined) throw new Error(`check-numbers: TypeScript opened no project for ${config}`)
    const out = {}
    for (const file of sources()) {
      const tree = project.program.getSourceFile(slashes(path.join(ROOT, file)))
      if (tree === undefined) throw new Error(`check-numbers: ${file} is not in ${path.relative(ROOT, PROJECT)}'s project — widen its include`)
      const found = record(tree)
      if (Object.keys(found).length > 0) out[file] = found
    }
    return out
  } finally {
    api.close()
  }
}

/** What changed between the record on disk and the tree, one line per check. */
function differences(recorded, tree) {
  const problems = []
  for (const file of Object.keys(tree)) {
    const before = recorded[file] ?? {}
    for (const [name, numbers] of Object.entries(tree[file])) {
      const had = before[name]
      if (had === undefined) problems.push(`${file}: the check "${name}" is new, its numbers are ${numbers.join(', ')}`)
      else if (had.join(',') !== numbers.join(',')) problems.push(`${file}: the check "${name}" decided on ${had.join(', ')} and now decides on ${numbers.join(', ')}`)
    }
    for (const name of Object.keys(before)) {
      if (tree[file]?.[name] === undefined) problems.push(`${file}: the check "${name}" is gone`)
    }
  }
  for (const file of Object.keys(recorded)) {
    if (tree[file] === undefined) problems.push(`${file}: no check is recorded from this file any more`)
  }
  return problems
}

/**
 * The files git reports as changed under the testing tree, as paths relative to
 * the repository; null when git cannot answer, which keeps the check strict.
 */
function uncommitted() {
  const run = spawnSync('git', ['status', '--porcelain', '--', 'packages/testing'], { cwd: ROOT, encoding: 'utf8' })
  if (run.status !== 0) return null
  const files = new Set()
  for (const line of run.stdout.split('\n')) {
    const entry = line.slice(3).trim()
    if (entry === '') continue
    files.add(entry.split(' -> ').pop())
  }
  return files
}

const tree = current()
if (process.argv.includes('--check')) {
  let recorded = {}
  try {
    recorded = JSON.parse(fs.readFileSync(RECORD, 'utf8')).checks
  } catch (error) {
    console.error(`check-numbers: packages/testing/data/check-numbers.json is unreadable (${error.message})`)
    process.exit(1)
  }
  const problems = differences(recorded, tree)
  if (problems.length > 0) {
    // Several sessions share one tree. A record that trails an uncommitted edit
    // is that edit's business: the check warns, and the tree that commits the
    // edit carries the recorded numbers with it. A difference in a file the
    // working tree has not touched is still a failure.
    const changed = uncommitted()
    const files = [...new Set(problems.map((problem) => problem.slice(0, problem.indexOf(': '))))]
    if (changed !== null && files.every((file) => changed.has(file))) {
      for (const problem of problems) console.warn(`check-numbers: ${problem}`)
      console.warn(`check-numbers: ${problems.length} checks moved in ${files.length} uncommitted file(s) — run \`npm run checks:numbers\` before committing`)
      process.exit(0)
    }
    for (const problem of problems) console.error(`check-numbers: ${problem}`)
    console.error(`check-numbers: ${problems.length} checks moved — run \`npm run checks:numbers\`, and say in the change why each number moved`)
    process.exit(1)
  }
  const checks = Object.values(tree).reduce((sum, file) => sum + Object.keys(file).length, 0)
  const numbers = Object.values(tree).reduce((sum, file) => sum + Object.values(file).flat().length, 0)
  console.log(`check-numbers: ${checks} checks decide on ${numbers} numbers, as recorded`)
  process.exit(0)
}
fs.writeFileSync(RECORD, `${JSON.stringify({ note: 'Generated by packages/testing/check-numbers.mjs — the numbers each check decides on (D87). A change here is a change to what a check accepts: say why in the change.', checks: tree }, null, 2)}\n`)
const checks = Object.values(tree).reduce((sum, file) => sum + Object.keys(file).length, 0)
const numbers = Object.values(tree).reduce((sum, file) => sum + Object.values(file).flat().length, 0)
console.log(`check-numbers: recorded ${checks} checks and ${numbers} numbers from ${Object.keys(tree).length} files`)
