/** store.mjs — storage, indexing and validation for .debug/work orders. */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
/** Store orders in the main tree so linked worktrees share them. */
const COMMON = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: ROOT, encoding: 'utf8' }).trim()
export const STORAGE = path.dirname(path.resolve(ROOT, COMMON))
export const DEBUG = path.join(STORAGE, '.debug')
export const WORK = path.join(DEBUG, 'work')
export const INDEX = path.join(WORK, 'index.json')
const LOCK = path.join(WORK, '.lock')
const SCHEMA = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'schema.json'), 'utf8'))
export const TEMPLATE = fs.readFileSync(path.join(import.meta.dirname, 'template.md'), 'utf8')
const validate = new Ajv2020({ allErrors: true }).compile(SCHEMA)
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const RANK = { draft: 0, active: 1, review: 2 }
export const LOOSE = [/\.tmp\./i, /\.log$/i, /^repro-/i, /-draft/i, /\.bak$/i, /^\.dsh-ops-update-.*\.lock$/i]
export const DAY = 24 * 60 * 60 * 1000

export function today() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function relative(file) {
  return path.relative(STORAGE, file).split(path.sep).join('/')
}

export function isInside(parent, child) {
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

export function readOrder(dir) {
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

export function writeOrder(order, meta) {
  const block = `<!-- work\n${JSON.stringify(meta, null, 2)}\n-->`
  const text = order.text.replace(/^<!-- work\r?\n[\s\S]*?\r?\n-->/, block)
  fs.writeFileSync(order.file, text)
  order.text = text
  order.meta = meta
}

export function orderDirs() {
  if (!fs.existsSync(WORK)) return []
  return fs.readdirSync(WORK, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => path.join(WORK, entry.name))
}

export function readAll() {
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

export function syncIndex() {
  withLock(() => {
    const text = `${JSON.stringify(indexData(readAll().orders.filter((order) => validate(order.meta))), null, 2)}\n`
    if (!fs.existsSync(INDEX) || fs.readFileSync(INDEX, 'utf8') !== text) fs.writeFileSync(INDEX, text)
  })
}

export function dirSize(dir) {
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

export function validateOrder(order, all) {
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
