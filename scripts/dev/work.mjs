#!/usr/bin/env node
/** work.mjs — keep task context under .debug/work for continuation, handoff and review; close deletes the order. */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createTemporaryFiles, removeDebugDirectory } from '../shared/temporary-files.mjs'
import {
  DAY,
  DEBUG,
  INDEX,
  LOOSE,
  SLUG,
  STORAGE,
  TEMPLATE,
  WORK,
  checkWorkOrders,
  dirSize,
  isInside,
  orderDirs,
  readAll,
  relative,
  syncIndex,
  today,
  validateOrder,
  writeOrder,
} from './work/store.mjs'

export { checkWorkOrders }

function flagsOf(args) {
  const flags = {}
  const positional = []
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = args[i + 1]
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next
        i += 1
      } else {
        flags[key] = true
      }
    } else {
      positional.push(arg)
    }
  }
  return { flags, positional }
}

function csv(value) {
  return typeof value === 'string' && value !== '' ? value.split(',').map((item) => item.trim()).filter(Boolean) : []
}

function orderById(id) {
  const found = readAll().orders.find((order) => order.meta.id === id)
  if (found === undefined) throw new Error(`work: no work order "${id}"`)
  return found
}

function metaFor(order, changes) {
  return { ...order.meta, ...changes, updated: today() }
}

function pushHistory(meta, status, by) {
  return { ...meta, status, updated: today(), history: [...meta.history, { at: today(), status, by }] }
}

function writeChecked(order, meta, all) {
  const problems = validateOrder({ ...order, meta }, all)
  if (problems.length > 0) {
    for (const problem of problems) console.error(`work: ${problem}`)
    process.exitCode = 1
    return false
  }
  writeOrder(order, meta)
  syncIndex()
  return true
}

function commandNew(args) {
  const { flags, positional } = flagsOf(args)
  const slug = positional[0]
  if (slug === undefined || !SLUG.test(slug)) throw new Error('work: new needs a kebab-case slug')
  if (typeof flags.title !== 'string' || flags.title.trim() === '') throw new Error('work: new needs --title "…"')
  const base = `${today().replaceAll('-', '')}-${slug}`
  let id = base
  for (let suffix = 2; fs.existsSync(path.join(WORK, id)); suffix += 1) id = `${base}-${suffix}`
  const dir = path.join(WORK, id)
  const owner = typeof flags.owner === 'string' ? flags.owner : ''
  const gate = typeof flags.gate === 'string' ? flags.gate : 'bare'
  if (!['bare', 'quick', 'feature', 'full', 'e2e'].includes(gate)) throw new Error(`work: unknown gate "${gate}"`)
  const meta = {
    schema: 1,
    id,
    title: flags.title.trim(),
    status: 'draft',
    owner,
    reviewer: typeof flags.reviewer === 'string' ? flags.reviewer : null,
    created: today(),
    updated: today(),
    branch: null,
    worktree: null,
    depends: csv(flags.depends),
    paths: csv(flags.paths),
    specs: csv(flags.specs),
    gate,
    gateArgs: csv(flags['gate-args']),
    behavior: flags['no-behavior'] !== true,
    direction: flags.direction === true,
    change: typeof flags.change === 'string' ? flags.change : null,
    adr: typeof flags.adr === 'string' ? flags.adr : null,
    noChangeReason: typeof flags['no-change-reason'] === 'string' ? flags['no-change-reason'] : null,
    measurements: [],
    acceptance: [],
    verification: [],
    handoff: { state: 'draft', next: 'fill the goal, acceptance criteria and measurements', blockers: [], lastCommand: null },
    history: [{ at: today(), status: 'draft', by: owner || 'agent' }],
  }
  fs.mkdirSync(path.join(dir, 'refs'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'shots'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'tmp'), { recursive: true })
  const block = `<!-- work\n${JSON.stringify(meta, null, 2)}\n-->`
  fs.writeFileSync(path.join(dir, 'work.md'), `${block}\n\n${TEMPLATE.replaceAll('{{TITLE}}', meta.title).replaceAll('{{ID}}', id)}`)
  syncIndex()
  console.log(`work: created ${relative(dir)}`)
  console.log(`  next: npm run work -- start ${id} --owner <agent>`)
}

function commandStart(args) {
  const { flags, positional } = flagsOf(args)
  const order = orderById(positional[0])
  if (order.meta.status !== 'draft') throw new Error(`work: ${order.meta.id} is already ${order.meta.status}`)
  const owner = typeof flags.owner === 'string' ? flags.owner : order.meta.owner
  if (owner === '') throw new Error('work: start needs --owner or an owner in the order')
  const branch = typeof flags.branch === 'string' ? flags.branch : `work/${order.meta.id}`
  const worktree = typeof flags.worktree === 'string' ? flags.worktree : order.meta.worktree
  const meta = pushHistory(metaFor(order, { owner, branch, worktree }), 'active', owner)
  if (writeChecked(order, meta, readAll().orders)) console.log(`work: ${order.meta.id} is active on ${branch}`)
}

function commandVerify(args) {
  const { flags, positional } = flagsOf(args)
  const order = orderById(positional[0])
  if (order.meta.status === 'review') throw new Error('work: a reviewed order cannot take a new verification')
  const command = flags.command
  if (typeof command !== 'string' || command === '') throw new Error('work: verify needs --command "…"')
  const result = typeof flags.result === 'string' ? flags.result : 'pass'
  if (!['pass', 'fail', 'skip'].includes(result)) throw new Error(`work: verify result "${result}" is not pass, fail or skip`)
  const entry = { at: today(), command, result, evidence: typeof flags.evidence === 'string' ? flags.evidence : null }
  const meta = metaFor(order, {
    verification: [...order.meta.verification, entry],
    handoff: { ...order.meta.handoff, lastCommand: command },
  })
  if (writeChecked(order, meta, readAll().orders)) console.log(`work: recorded ${result} for ${order.meta.id}`)
}

function commandReview(args) {
  const { flags, positional } = flagsOf(args)
  const order = orderById(positional[0])
  if (order.meta.status !== 'active') throw new Error(`work: ${order.meta.id} is ${order.meta.status}, not active`)
  const reviewer = typeof flags.reviewer === 'string' ? flags.reviewer : order.meta.reviewer
  const meta = pushHistory(metaFor(order, { reviewer, handoff: { ...order.meta.handoff, state: 'review' } }), 'review', reviewer ?? order.meta.owner)
  if (writeChecked(order, meta, readAll().orders)) console.log(`work: ${order.meta.id} is ready to close`)
}

function commandClose(args) {
  const { flags, positional } = flagsOf(args)
  const order = orderById(positional[0])
  if (order.meta.status !== 'review') throw new Error(`work: ${order.meta.id} is ${order.meta.status}, not review`)
  const problems = validateOrder(order, readAll().orders)
  if (problems.length > 0) {
    for (const problem of problems) console.error(`work: ${problem}`)
    process.exitCode = 1
    return
  }
  if (order.meta.worktree !== null) {
    const tree = path.resolve(STORAGE, order.meta.worktree)
    if (!isInside(DEBUG, tree)) throw new Error(`work: worktree "${order.meta.worktree}" is outside .debug/`)
    if (fs.existsSync(tree)) {
      const dirty = execFileSync('git', ['-C', tree, 'status', '--porcelain'], { encoding: 'utf8' }).trim()
      if (dirty !== '' && flags.force !== true) throw new Error(`work: ${order.meta.worktree} has uncommitted changes; commit them or pass --force`)
    }
  }
  const target = path.resolve(order.dir)
  if (path.dirname(target) !== path.resolve(WORK)) throw new Error(`work: refusing to delete ${target}`)
  removeDebugDirectory(STORAGE, WORK, target)
  syncIndex()
  console.log(`work: closed ${order.meta.id}`)
  if (order.meta.change !== null) console.log(`  change: ${order.meta.change}`)
  if (order.meta.adr !== null) console.log(`  adr: ${order.meta.adr}`)
  for (const measurement of order.meta.measurements) {
    console.log(`  ${measurement.item}: ${measurement.retire}${measurement.enforced === null ? '' : ` (${measurement.enforced})`}`)
  }
}

function commandList(args) {
  const { flags } = flagsOf(args)
  syncIndex()
  const data = JSON.parse(fs.readFileSync(INDEX, 'utf8'))
  if (flags.json === true) {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`)
    return
  }
  const status = typeof flags.status === 'string' ? flags.status : null
  const owner = typeof flags.owner === 'string' ? flags.owner : null
  const rows = data.orders.filter((order) => (status === null || order.status === status) && (owner === null || order.owner === owner))
  if (rows.length === 0) {
    console.log('work: no orders')
    return
  }
  console.log('| ID | Status | Owner | Updated | Gate | Title |')
  console.log('|---|---|---|---|---|---|')
  for (const order of rows) {
    console.log(`| ${order.id} | ${order.status} | ${order.owner || '—'} | ${order.updated} | ${order.gate} | ${order.title} |`)
  }
}

/** Prints one material directory of an order, so a script in any checkout writes into the shared order. */
function commandPath(args) {
  const { positional } = flagsOf(args)
  const order = orderById(positional[0])
  const kind = positional[1] ?? 'tmp'
  if (positional.length > 2 || !['tmp', 'refs', 'shots'].includes(kind)) {
    throw new Error('work: path takes an order id and tmp, refs or shots')
  }
  const dir = path.join(order.dir, kind)
  fs.mkdirSync(dir, { recursive: true })
  console.log(dir)
}

/** Prints the files an order declares, which is the list a commit stages by hand. */
function commandPaths(args) {
  const { positional } = flagsOf(args)
  const order = orderById(positional[0])
  if (order.meta.paths.length === 0) {
    throw new Error(`work: ${order.meta.id} declares no paths; add them with a new order or record them in work.md`)
  }
  for (const file of order.meta.paths) console.log(file)
}

function commandCheck(args) {
  const quiet = flagsOf(args).flags.quiet === true
  const result = checkWorkOrders()
  for (const warning of result.warnings) console.warn(`work: ${warning}`)
  for (const problem of result.problems) console.error(`work: ${problem}`)
  if (result.problems.length > 0) {
    process.exitCode = 1
  } else if (!quiet) {
    console.log(`work: ${result.count} orders, clean`)
  }
}

function commandGc(args) {
  const { flags } = flagsOf(args)
  const dry = flags.yes !== true
  const removed = []
  for (const dir of orderDirs()) {
    if (fs.existsSync(path.join(dir, 'work.md'))) continue
    const age = Date.now() - fs.statSync(dir).mtimeMs
    if (age < DAY) {
      console.log(`work: keep ${relative(dir)} (younger than 24 hours)`)
      continue
    }
    if (dry) console.log(`work: would remove ${relative(dir)}`)
    else {
      removeDebugDirectory(STORAGE, WORK, dir)
      removed.push(relative(dir))
    }
  }
  if (fs.existsSync(DEBUG)) {
    for (const entry of fs.readdirSync(DEBUG, { withFileTypes: true })) {
      if (!entry.isFile() || !LOOSE.some((pattern) => pattern.test(entry.name))) continue
      const file = path.join(DEBUG, entry.name)
      const age = Date.now() - fs.statSync(file).mtimeMs
      if (age < DAY) continue
      if (dry) console.log(`work: would remove ${relative(file)}`)
      else {
        fs.rmSync(file, { force: true })
        removed.push(relative(file))
      }
    }
  }
  for (const directory of createTemporaryFiles(STORAGE).collect(!dry)) {
    console.log(`work: ${dry ? 'would remove' : 'removed'} ${relative(directory)}`)
    if (!dry) removed.push(relative(directory))
  }
  if (dry) console.log(`work: dry run; ${fs.existsSync(WORK) ? (dirSize(WORK) / 1024 / 1024).toFixed(1) : '0.0'} MB under .debug/work; pass --yes to remove`)
  else console.log(`work: removed ${removed.length} item(s); ${(dirSize(WORK) / 1024 / 1024).toFixed(1)} MB under .debug/work`)
}

function help() {
  console.log(`work: task continuity under .debug/work; independent scratch: npm run tmp

  new <slug> --title "…" [--owner …] [--paths a,b] [--specs a,b] [--gate bare|quick|feature|full|e2e]
      [--gate-args a,b] [--depends a,b] [--no-behavior] [--direction] [--change path] [--adr path]
  list [--status draft|active|review] [--owner …] [--json]
  start <id> [--owner …] [--branch …] [--worktree .debug/worktrees/<id>]
  verify <id> --command "…" [--result pass|fail|skip] [--evidence "…"]
  review <id> [--reviewer …]
  check [--quiet]
  close <id> [--force]
  path <id> [tmp|refs|shots]     print an order directory's absolute path
  paths <id>                     print the files the order owns, the list a commit stages
  gc [--yes]                     also collect expired .debug/tmp sessions

A work order is deleted by close; measurements live in its work.md until then.`)
}

function main() {
  const [command, ...args] = process.argv.slice(2)
  if (command === undefined || command === 'help' || command === '--help') return help()
  switch (command) {
    case 'new': return commandNew(args)
    case 'list': return commandList(args)
    case 'start': return commandStart(args)
    case 'verify': return commandVerify(args)
    case 'review': return commandReview(args)
    case 'check': return commandCheck(args)
    case 'close': return commandClose(args)
    case 'path': return commandPath(args)
    case 'paths': return commandPaths(args)
    case 'gc': return commandGc(args)
    default:
      help()
      process.exitCode = 2
  }
}

if (path.resolve(process.argv[1] ?? '') === path.resolve(import.meta.dirname, 'work.mjs')) main()
