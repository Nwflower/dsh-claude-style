#!/usr/bin/env node
/** work.mjs — keep task context under .debug/work for continuation, handoff and review; close deletes the order. */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import { createTemporaryFiles, removeDebugDirectory } from './shared/temporary-files.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
/** Store orders in the main tree so linked worktrees share them. */
const COMMON = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: ROOT, encoding: 'utf8' }).trim()
const STORAGE = path.dirname(path.resolve(ROOT, COMMON))
const DEBUG = path.join(STORAGE, '.debug')
const WORK = path.join(DEBUG, 'work')
const INDEX = path.join(WORK, 'index.json')
const LOCK = path.join(WORK, '.lock')
const SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'work', 'schema.json'), 'utf8'))
const TEMPLATE = fs.readFileSync(path.join(ROOT, 'scripts', 'work', 'template.md'), 'utf8')
const validate = new Ajv2020({ allErrors: true }).compile(SCHEMA)
const ID = /^[0-9]{8}-[a-z0-9]+(?:-[a-z0-9]+)*$/
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const RANK = { draft: 0, active: 1, review: 2 }
const LOOSE = [/\.tmp\./i, /\.log$/i, /^repro-/i, /-draft/i, /\.bak$/i, /^\.dsh-ops-update-.*\.lock$/i]
const DAY = 24 * 60 * 60 * 1000

function today() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function relative(file) {
  return path.relative(STORAGE, file).split(path.sep).join('/')
}

function isInside(parent, child) {
  const rel = path.relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

function safeRelative(value) {
  return typeof value === 'string'
    && value !== ''
    && !path.isAbsolute(value)
    && !value.split(/[\\/]/).includes('..')
}

/** A work order's references resolve against the tree that holds the orders, whichever checkout runs the check. */
function existsAt(value) {
  return existsIn(STORAGE, value)
}

function existsIn(base, value) {
  return safeRelative(value) && fs.existsSync(path.resolve(base, value))
}

function readOrder(dir) {
  const file = path.join(dir, 'work.md')
  const text = fs.readFileSync(file, 'utf8')
  const match = text.match(/^<!-- work\r?\n([\s\S]*?)\r?\n-->/)
  if (match === null) throw new Error(`${relative(file)}: no work block at the top`)
  let meta
  try {
    meta = JSON.parse(match[1])
  } catch (error) {
    throw new Error(`${relative(file)}: the work block is not JSON (${error.message})`)
  }
  return { dir, file, text, meta }
}

function writeOrder(order, meta) {
  const block = `<!-- work\n${JSON.stringify(meta, null, 2)}\n-->`
  const text = order.text.replace(/^<!-- work\r?\n[\s\S]*?\r?\n-->/, block)
  fs.writeFileSync(order.file, text)
  order.text = text
  order.meta = meta
}

function orderDirs() {
  if (!fs.existsSync(WORK)) return []
  return fs.readdirSync(WORK, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => path.join(WORK, entry.name))
}

function readAll() {
  const orders = []
  const problems = []
  const warnings = []
  for (const dir of orderDirs()) {
    const file = path.join(dir, 'work.md')
    if (!fs.existsSync(file)) {
      warnings.push(`${relative(dir)}: no work.md — run \`npm run work -- gc\``)
      continue
    }
    try {
      orders.push(readOrder(dir))
    } catch (error) {
      problems.push(error.message)
    }
  }
  return { orders, problems, warnings }
}

function indexData(orders) {
  const sorted = [...orders].sort((a, b) => a.meta.id.localeCompare(b.meta.id))
  return {
    version: 1,
    updated: sorted.map((order) => order.meta.updated).sort().at(-1) ?? null,
    orders: sorted.map((order) => ({
      id: order.meta.id,
      title: order.meta.title,
      status: order.meta.status,
      owner: order.meta.owner,
      updated: order.meta.updated,
      paths: order.meta.paths,
      gate: order.meta.gate,
      change: order.meta.change,
      adr: order.meta.adr,
    })),
  }
}

function withLock(run) {
  fs.mkdirSync(WORK, { recursive: true })
  let fd = null
  const started = Date.now()
  while (fd === null) {
    try {
      fd = fs.openSync(LOCK, 'wx')
      fs.writeFileSync(fd, String(process.pid))
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      try {
        if (Date.now() - fs.statSync(LOCK).mtimeMs > 10_000) fs.rmSync(LOCK, { force: true })
      } catch { /* the holder removed it between the open and the stat */ }
      if (Date.now() - started > 5_000) throw new Error('work: index lock is busy')
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50)
    }
  }
  try {
    return run()
  } finally {
    fs.closeSync(fd)
    fs.rmSync(LOCK, { force: true })
  }
}

function syncIndex() {
  withLock(() => {
    const text = `${JSON.stringify(indexData(readAll().orders.filter((order) => validate(order.meta))), null, 2)}\n`
    if (!fs.existsSync(INDEX) || fs.readFileSync(INDEX, 'utf8') !== text) fs.writeFileSync(INDEX, text)
  })
}

function dirSize(dir) {
  if (!fs.existsSync(dir)) return 0
  let total = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const child = path.join(dir, entry.name)
    total += entry.isDirectory() ? dirSize(child) : fs.statSync(child).size
  }
  return total
}

function overlaps(left, right) {
  const a = left.split(path.sep).join('/').replace(/\/+$/, '')
  const b = right.split(path.sep).join('/').replace(/\/+$/, '')
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`)
}

function schemaProblems(order) {
  const problems = []
  if (!validate(order.meta)) {
    for (const error of validate.errors ?? []) {
      problems.push(`work/${path.basename(order.dir)}: ${error.instancePath || '/'} ${error.message}`)
    }
  }
  return problems
}

function validateOrder(order, all) {
  const problems = schemaProblems(order)
  const meta = order.meta
  if (meta === null || typeof meta !== 'object') return problems
  const name = `work/${path.basename(order.dir)}`
  if (meta.id !== path.basename(order.dir)) problems.push(`${name}: id "${meta.id}" does not match the directory`)
  if (typeof meta.created === 'string' && typeof meta.updated === 'string' && meta.created > meta.updated) {
    problems.push(`${name}: updated is earlier than created`)
  }

  const history = Array.isArray(meta.history) ? meta.history : []
  let rank = -1
  for (const entry of history) {
    if (entry === null || typeof entry !== 'object') {
      problems.push(`${name}: a history entry is not an object`)
      continue
    }
    const next = RANK[entry.status] ?? -1
    if (next < rank) problems.push(`${name}: history goes back from a later status to "${entry.status}"`)
    rank = next
  }
  const last = history.at(-1)
  if (last !== null && typeof last === 'object' && last.status !== meta.status) {
    problems.push(`${name}: the last history entry is "${last.status}", not "${meta.status}"`)
  }

  if (meta.status !== 'draft') {
    if (typeof meta.owner !== 'string' || meta.owner === '') problems.push(`${name}: an active order needs an owner`)
    if (typeof meta.branch !== 'string' || meta.branch === '') problems.push(`${name}: an active order needs a branch`)
  }
  if (Array.isArray(meta.paths)) {
    for (const value of meta.paths) {
      if (!safeRelative(value)) problems.push(`${name}: path "${value}" must stay inside the repository`)
      else if (meta.status !== 'draft' && !existsAt(value)) problems.push(`${name}: path "${value}" does not exist`)
    }
  }
  if (Array.isArray(meta.specs)) {
    for (const value of meta.specs) {
      if (!safeRelative(value)) problems.push(`${name}: spec "${value}" must stay inside the repository`)
      else if (meta.status !== 'draft' && !existsAt(value)) problems.push(`${name}: spec "${value}" does not exist`)
    }
  }
  if (meta.change !== null && meta.change !== undefined) {
    if (!safeRelative(meta.change) || !meta.change.startsWith('docs/changes/') || !meta.change.endsWith('.json')) {
      problems.push(`${name}: change "${meta.change}" is not a docs/changes/*.json file`)
    } else if (!existsAt(meta.change)) {
      problems.push(`${name}: change "${meta.change}" does not exist`)
    }
  }
  if (meta.adr !== null && meta.adr !== undefined) {
    if (!safeRelative(meta.adr) || !meta.adr.startsWith('docs/adr/') || !meta.adr.endsWith('.md')) {
      problems.push(`${name}: adr "${meta.adr}" is not a docs/adr/*.md file`)
    } else if (!existsAt(meta.adr)) {
      problems.push(`${name}: adr "${meta.adr}" does not exist`)
    }
  }
  if (meta.status === 'review') {
    if (meta.behavior === true && meta.change === null && meta.noChangeReason === null) {
      problems.push(`${name}: a behavior change needs a docs/changes/ file or noChangeReason`)
    }
    if (meta.direction === true && meta.adr === null) problems.push(`${name}: a direction change needs an ADR`)
    if (!Array.isArray(meta.verification) || !meta.verification.some((entry) => entry.result === 'pass')) {
      problems.push(`${name}: review needs at least one passing verification`)
    }
    if (!Array.isArray(meta.acceptance) || meta.acceptance.length === 0) {
      problems.push(`${name}: review needs at least one acceptance criterion`)
    }
  }

  const measurements = Array.isArray(meta.measurements) ? meta.measurements : []
  for (const measurement of measurements) {
    if (measurement === null || typeof measurement !== 'object') continue
    if (meta.status === 'review' && measurement.retire === 'pending') {
      problems.push(`${name}: measurement "${measurement.item}" still says pending`)
    }
    if (measurement.enforced !== null && measurement.enforced !== undefined) {
      if (!safeRelative(measurement.enforced) || !existsAt(measurement.enforced)) {
        problems.push(`${name}: measurement "${measurement.item}" names "${measurement.enforced}", which does not exist`)
      }
    } else if (meta.status === 'review' && measurement.retire !== 'none') {
      problems.push(`${name}: measurement "${measurement.item}" has no enforced path for retire "${measurement.retire}"`)
    }
  }

  const acceptance = Array.isArray(meta.acceptance) ? meta.acceptance : []
  for (const entry of acceptance) {
    if (entry === null || typeof entry !== 'object') continue
    const check = entry.check
    if (typeof check !== 'string') continue
    if (check.startsWith('spec:')) {
      const value = check.slice(5)
      if (!existsAt(value)) problems.push(`${name}: acceptance ${entry.id} names a spec that does not exist: ${value}`)
    } else if (check.startsWith('shot:')) {
      const value = check.slice(5)
      if (!existsIn(order.dir, value)) problems.push(`${name}: acceptance ${entry.id} names a shot that does not exist: ${value}`)
    } else if (!check.startsWith('manual:') && !check.startsWith('command:')) {
      problems.push(`${name}: acceptance ${entry.id} must start with spec:, shot:, manual: or command:`)
    } else if (check.slice(check.indexOf(':') + 1).trim() === '') {
      problems.push(`${name}: acceptance ${entry.id} has an empty ${check.split(':')[0]} check`)
    }
  }

  for (const entry of Array.isArray(meta.verification) ? meta.verification : []) {
    if (entry === null || typeof entry !== 'object') continue
    if (!DATE.test(String(entry.at))) problems.push(`${name}: verification date "${entry.at}" is not YYYY-MM-DD`)
  }
  for (const entry of Array.isArray(meta.depends) ? meta.depends : []) {
    if (typeof entry !== 'string') continue
    if (entry === meta.id) problems.push(`${name}: depends on itself`)
    else if (!all.some((other) => other.meta.id === entry)) problems.push(`${name}: depends on "${entry}", which is not an order`)
  }
  if (typeof meta.worktree === 'string' && meta.worktree !== '') {
    const tree = path.resolve(STORAGE, meta.worktree)
    if (!isInside(DEBUG, tree)) problems.push(`${name}: worktree "${meta.worktree}" must stay under .debug/`)
  }
  return problems
}

/** A clean checkout without .debug/work has no orders to validate. */
export function checkWorkOrders() {
  const { orders, problems, warnings } = readAll()
  for (const order of orders) problems.push(...validateOrder(order, orders))

  const live = orders.filter((order) => order.meta.status === 'active' || order.meta.status === 'review')
  for (let i = 0; i < live.length; i += 1) {
    for (let j = i + 1; j < live.length; j += 1) {
      const left = live[i].meta
      const right = live[j].meta
      if (!Array.isArray(left.paths) || !Array.isArray(right.paths)) continue
      const overlap = left.paths.some((a) => right.paths.some((b) => overlaps(a, b)))
      const leftDepends = Array.isArray(left.depends) ? left.depends : []
      const rightDepends = Array.isArray(right.depends) ? right.depends : []
      const related = leftDepends.includes(right.id) || rightDepends.includes(left.id)
      if (overlap && !related) problems.push(`work: ${left.id} and ${right.id} own overlapping paths; make one depend on the other`)
    }
  }

  const valid = orders.filter((order) => validate(order.meta))
  const expectedIndex = `${JSON.stringify(indexData(valid), null, 2)}\n`
  const actualIndex = fs.existsSync(INDEX) ? fs.readFileSync(INDEX, 'utf8') : ''
  if ((orders.length > 0 || actualIndex !== '') && actualIndex !== expectedIndex) {
    problems.push('work: index.json is stale — run `npm run work -- list`')
  }

  const ids = new Set(valid.map((order) => order.meta.id))
  const docs = ['README.md', 'README.en.md', 'docs/ARCHITECTURE.md', 'docs/CHANGELOG.md', 'docs/STYLE.md', 'AGENTS.md']
  for (const dir of ['docs/adr', 'docs/changes']) {
    const full = path.join(STORAGE, dir)
    if (fs.existsSync(full)) {
      for (const name of fs.readdirSync(full)) {
        if (dir === 'docs/adr' ? name.endsWith('.md') : name.endsWith('.json')) docs.push(`${dir}/${name}`)
      }
    }
  }
  for (const file of docs) {
    if (!fs.existsSync(path.join(STORAGE, file)) || ids.size === 0) continue
    const text = fs.readFileSync(path.join(STORAGE, file), 'utf8')
    for (const id of ids) {
      if (text.includes(id)) problems.push(`${file}: names work order ${id} — durable documents do not cite work orders`)
    }
  }

  if (fs.existsSync(DEBUG)) {
    const loose = fs.readdirSync(DEBUG, { withFileTypes: true })
      .filter((entry) => entry.isFile()
        && LOOSE.some((pattern) => pattern.test(entry.name))
        && Date.now() - fs.statSync(path.join(DEBUG, entry.name)).mtimeMs > DAY)
      .map((entry) => entry.name)
    if (loose.length > 0) {
      const sample = loose.slice(0, 3).join(', ')
      warnings.push(`${loose.length} loose temporary file(s) older than 24 hours under .debug (${sample}${loose.length > 3 ? ', …' : ''}) — run \`npm run work -- gc\``)
    }
  }
  const bytes = dirSize(WORK)
  if (bytes > 1024 ** 3) warnings.push(`.debug/work holds ${(bytes / 1024 ** 3).toFixed(1)} GB — close finished orders or run work gc`)
  return { problems, warnings, count: orders.length }
}

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
