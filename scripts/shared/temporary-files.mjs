/**
 * Session-owned scratch directories, independent of work orders (D83).
 * A collector removes an inactive directory only after its owner has exited.
 */
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export const TEMPORARY_RETENTION_MS = 24 * 60 * 60 * 1000
const RECORD = '.session.json'
const LABEL = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function inside(parent, child) {
  const relative = path.relative(parent, child)
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
}

function noLinks(root, target) {
  for (let current = target; current !== root; current = path.dirname(current)) {
    if (!inside(root, current)) throw new Error(`temporary: path leaves the repository: ${target}`)
    if (fs.lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink()) {
      throw new Error(`temporary: filesystem link is protected: ${current}`)
    }
  }
}

/** A recursive removal must stay under .debug and contain no directory links. */
export function removeDebugDirectory(root, base, target) {
  root = path.resolve(root)
  base = path.resolve(base)
  target = path.resolve(target)
  if (!inside(path.join(root, '.debug'), base) || path.dirname(target) !== base) {
    throw new Error(`temporary: refusing directory outside its owner: ${target}`)
  }
  noLinks(root, target)
  const resolved = fs.realpathSync(target)
  if (path.dirname(resolved) !== fs.realpathSync(base)) throw new Error(`temporary: resolved directory leaves its owner: ${target}`)
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const child = path.join(directory, entry.name)
      if (entry.isSymbolicLink()) throw new Error(`temporary: filesystem link is protected: ${child}`)
      if (entry.isDirectory()) walk(child)
    }
  }
  walk(target)
  fs.rmSync(target, { recursive: true })
}

export function processAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // The OS reports absence as ESRCH and a protected live process as EPERM.
    if (error.code === 'ESRCH') return false
    if (error.code === 'EPERM') return true
    throw error
  }
}

function ownerPid(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) throw new Error('temporary: owner pid must be a positive integer')
  return pid
}

function writeRecord(directory, record) {
  const file = path.join(directory, RECORD)
  const partial = `${file}.${randomUUID()}.partial`
  fs.writeFileSync(partial, `${JSON.stringify(record, null, 2)}\n`, { flag: 'wx' })
  fs.renameSync(partial, file)
}

function readRecord(directory) {
  const file = path.join(directory, RECORD)
  if (fs.lstatSync(file, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error(`temporary: filesystem link is protected: ${file}`)
  if (!fs.existsSync(file)) return null
  const record = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (record === null || record.version !== 1 || record.id !== path.basename(directory)
    || typeof record.label !== 'string' || !LABEL.test(record.label)
    || !Number.isSafeInteger(record.pid) || record.pid < 1
    || !Number.isFinite(Date.parse(record.createdAt)) || !Number.isFinite(Date.parse(record.updatedAt))
    || Date.parse(record.createdAt) > Date.parse(record.updatedAt)) {
    throw new Error(`temporary: invalid owner record in ${directory}`)
  }
  return record
}

function latestActivity(directory) {
  let latest = fs.statSync(directory).mtimeMs
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const child = path.join(directory, entry.name)
    if (entry.isSymbolicLink()) throw new Error(`temporary: filesystem link is protected: ${child}`)
    latest = Math.max(latest, entry.isDirectory() ? latestActivity(child) : fs.statSync(child).mtimeMs)
  }
  return latest
}

export function createTemporaryFiles(repository) {
  const root = path.resolve(repository)
  const base = path.join(root, '.debug', 'tmp')

  function resolve(id) {
    const directory = path.isAbsolute(id) ? path.resolve(id) : path.resolve(base, id)
    if (path.dirname(directory) !== base || !/^[a-z0-9][a-z0-9-]*$/.test(path.basename(directory))) {
      throw new Error(`temporary: invalid session directory: ${id}`)
    }
    noLinks(root, directory)
    return directory
  }

  function create(label, pid = process.ppid) {
    if (typeof label !== 'string' || label.length > 64 || !LABEL.test(label)) {
      throw new Error('temporary: a label needs lowercase words separated by hyphens, up to 64 characters')
    }
    ownerPid(pid)
    const id = `${label}-${randomUUID()}`
    const directory = resolve(id)
    fs.mkdirSync(base, { recursive: true })
    fs.mkdirSync(directory)
    const now = new Date().toISOString()
    writeRecord(directory, { version: 1, id, label, pid, createdAt: now, updatedAt: now })
    return directory
  }

  function directory(id, pid = process.ppid) {
    const directory = resolve(id)
    const record = readRecord(directory)
    if (record === null) throw new Error(`temporary: session has no owner record: ${id}`)
    if (record.pid !== pid && record.pid !== process.pid && processAlive(record.pid)) {
      throw new Error(`temporary: session belongs to running pid ${record.pid}`)
    }
    writeRecord(directory, { ...record, pid: ownerPid(pid), updatedAt: new Date().toISOString() })
    return directory
  }

  function close(id) {
    const directory = resolve(id)
    removeDebugDirectory(root, base, directory)
  }

  function inspectDirectory(directory) {
    const id = path.basename(directory)
    try {
      const stat = fs.lstatSync(directory)
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('expected a session directory without filesystem links')
      const record = readRecord(directory)
      const active = record !== null && processAlive(record.pid)
      const lastActivity = Math.max(latestActivity(directory), record === null ? 0 : Date.parse(record.updatedAt))
      return { id, directory, record, active, lastActivity, expired: Date.now() - lastActivity >= TEMPORARY_RETENTION_MS }
    } catch (error) {
      // A damaged or linked directory is reported and protected; other sessions still collect.
      return { id, directory, problem: error.message }
    }
  }

  function inspect() {
    noLinks(root, base)
    if (!fs.existsSync(base)) return []
    return fs.readdirSync(base).map((name) => inspectDirectory(path.join(base, name)))
  }

  const eligible = (entry) => entry.problem === undefined && !entry.active && entry.expired

  function collect(remove = false) {
    const results = []
    for (const entry of inspect()) {
      if (!eligible(entry)) continue
      // Re-read after the scan: a caller may have taken ownership meanwhile.
      if (!eligible(inspectDirectory(entry.directory))) continue
      if (remove) close(entry.id)
      results.push(entry.directory)
    }
    return results
  }

  function check() {
    const problems = []
    const warnings = []
    for (const entry of inspect()) {
      if (entry.problem !== undefined) problems.push(`temporary: ${entry.id}: ${entry.problem}`)
      else if (entry.record === null) problems.push(`temporary: ${entry.id} has no owner record; use npm run tmp -- gc to inspect abandoned directories`)
      else if (!entry.active && entry.expired) warnings.push(`temporary: ${entry.id} is inactive and expired; run npm run tmp -- gc`)
    }
    return { problems, warnings }
  }

  return { create, directory, close, inspect, collect, check }
}
