/** Storage size accounting and oldest-first pruning for workspace rewind checkpoints. */
import { createHash } from 'node:crypto'
import { chmod, lstat, mkdir, readdir, readFile as readFileAsync, readlink, rename, rmdir, stat, symlink, unlink, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { listReachableObjects, type GitWorkspace } from './session-rewind-git.js'

export type Capture =
  | { kind: 'absent' }
  | { kind: 'file'; hash: string; mode: number }
  | { kind: 'symlink'; target: string; directory: boolean }
  | { kind: 'oversized' | 'unsupported' }

export interface StoredGitRef {
  root: string
  gitDir: string
  repositoryObjects: string
  beforeTree: string
}

export interface StoredCaptureRef {
  kind: string
  hash?: string
}

export interface PrunableCheckpoint {
  sessionId: string
  turn: number
  createdAt: number
  storage?: string
  git: StoredGitRef | null
  captures: Record<string, StoredCaptureRef>
}

export interface ProtectedTree {
  workspace: GitWorkspace
  tree: string
}

export interface PruneOptions {
  storageDir: string
  defaultStorageDir: string
  limitBytes: number
  checkpoints: Record<string, PrunableCheckpoint[]>
  protectedTrees: readonly ProtectedTree[]
  protectedCheckpoints?: readonly PrunableCheckpoint[]
  signal?: AbortSignal
  warn: (message: string) => void
}

export interface PruneResult {
  changed: boolean
  bytes: number
}

const HEX2_RE = /^[0-9a-f]{2}$/i
const HEX38_RE = /^[0-9a-f]{38}$/i
const PRUNE_TARGET_RATIO = 0.85

function missing(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === 'ENOENT'
}

function sameDir(left: string, right: string): boolean {
  const a = resolve(left)
  const b = resolve(right)
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b
}

async function dirSize(dir: string): Promise<number> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (error) {
    if (missing(error)) return 0
    throw error
  }
  let total = 0
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      total += await dirSize(full)
    } else if (entry.isFile()) {
      try {
        total += (await lstat(full)).size
      } catch (error) {
        if (!missing(error)) throw error
      }
    }
  }
  return total
}

/** Measure total bytes stored under objects/ and captures/ in one rewind storage directory. */
export async function measureRewindStorage(storageDir: string): Promise<number> {
  const [objectsBytes, capturesBytes] = await Promise.all([
    dirSize(join(storageDir, 'objects')),
    dirSize(join(storageDir, 'captures')),
  ])
  return objectsBytes + capturesBytes
}

async function pruneCaptures(
  storageDir: string,
  referencedHashes: ReadonlySet<string>,
): Promise<void> {
  const capturesDir = join(storageDir, 'captures')
  let entries
  try {
    entries = await readdir(capturesDir, { withFileTypes: true })
  } catch (error) {
    if (missing(error)) return
    throw error
  }
  for (const entry of entries) {
    if (!entry.isFile() || referencedHashes.has(entry.name)) continue
    try {
      await unlink(join(capturesDir, entry.name))
    } catch (error) {
      if (!missing(error)) throw error
    }
  }
}

async function pruneLooseObjects(
  storageDir: string,
  reachable: ReadonlySet<string>,
): Promise<void> {
  const objectsDir = join(storageDir, 'objects')
  let buckets
  try {
    buckets = await readdir(objectsDir, { withFileTypes: true })
  } catch (error) {
    if (missing(error)) return
    throw error
  }
  for (const bucket of buckets) {
    if (!bucket.isDirectory() || !HEX2_RE.test(bucket.name)) continue
    const bucketDir = join(objectsDir, bucket.name)
    let entries
    try {
      entries = await readdir(bucketDir, { withFileTypes: true })
    } catch (error) {
      if (missing(error)) continue
      throw error
    }
    let remaining = 0
    for (const entry of entries) {
      if (!entry.isFile() || !HEX38_RE.test(entry.name)) {
        remaining++
        continue
      }
      const oid = (bucket.name + entry.name).toLowerCase()
      if (reachable.has(oid)) {
        remaining++
        continue
      }
      try {
        await unlink(join(bucketDir, entry.name))
      } catch (error) {
        if (!missing(error)) throw error
      }
    }
    if (remaining === 0) {
      try {
        await rmdir(bucketDir)
      } catch (error) {
        const code = (error as { code?: unknown }).code
        if (code !== 'ENOENT' && code !== 'ENOTEMPTY' && code !== 'EEXIST') throw error
      }
    }
  }
}

async function collectGarbage(
  storageDir: string,
  defaultStorageDir: string,
  checkpoints: Record<string, PrunableCheckpoint[]>,
  protectedTrees: readonly ProtectedTree[],
  protectedCheckpoints: readonly PrunableCheckpoint[],
  signal: AbortSignal | undefined,
  warn: (message: string) => void,
): Promise<void> {
  const referencedCaptures = new Set<string>()
  const gitGroups = new Map<string, { workspace: GitWorkspace, trees: Set<string> }>()
  const objects = join(storageDir, 'objects')
  const addTree = (workspace: GitWorkspace, tree: string) => {
    const key = workspace.root + '\0' + workspace.gitDir + '\0' + workspace.repositoryObjects
    let group = gitGroups.get(key)
    if (group === undefined) {
      group = { workspace, trees: new Set() }
      gitGroups.set(key, group)
    }
    group.trees.add(tree)
  }
  for (const rows of [...Object.values(checkpoints), protectedCheckpoints]) {
    for (const checkpoint of rows) {
      if (!sameDir(checkpoint.storage ?? defaultStorageDir, storageDir)) continue
      for (const capture of Object.values(checkpoint.captures)) {
        if (capture.kind === 'file' && typeof capture.hash === 'string') referencedCaptures.add(capture.hash)
      }
      if (checkpoint.git !== null) {
        addTree({
          root: checkpoint.git.root,
          gitDir: checkpoint.git.gitDir,
          repositoryObjects: checkpoint.git.repositoryObjects,
          objects,
          env: {
            GIT_OBJECT_DIRECTORY: objects,
            GIT_ALTERNATE_OBJECT_DIRECTORIES: checkpoint.git.repositoryObjects,
          },
        }, checkpoint.git.beforeTree)
      }
    }
  }
  for (const entry of protectedTrees) {
    if (sameDir(entry.workspace.objects, objects)) addTree(entry.workspace, entry.tree)
  }
  await pruneCaptures(storageDir, referencedCaptures)

  const reachable = new Set<string>()
  let allResolved = true
  for (const group of gitGroups.values()) {
    try {
      const found = await listReachableObjects(group.workspace, [...group.trees], signal)
      for (const oid of found) reachable.add(oid)
    } catch (error) {
      allResolved = false
      const detail = error instanceof Error ? error.message : String(error)
      warn('skipping loose-object GC while repository is unavailable: ' + detail)
      break
    }
  }
  if (allResolved) await pruneLooseObjects(storageDir, reachable)
}

/** Evict oldest checkpoints and unreachable objects until storage sits within limitBytes. */
export async function pruneRewindStorage(options: PruneOptions): Promise<PruneResult> {
  const { storageDir, defaultStorageDir, limitBytes, checkpoints, protectedTrees, protectedCheckpoints = [], signal, warn } = options
  const collect = () => collectGarbage(storageDir, defaultStorageDir, checkpoints, protectedTrees, protectedCheckpoints, signal, warn)
  let bytes = await measureRewindStorage(storageDir)
  if (bytes <= limitBytes) return { changed: false, bytes }

  await collect()
  bytes = await measureRewindStorage(storageDir)
  if (bytes <= limitBytes) return { changed: false, bytes }

  const targetBytes = Math.floor(limitBytes * PRUNE_TARGET_RATIO)
  const owned: PrunableCheckpoint[] = []
  for (const rows of Object.values(checkpoints)) {
    for (const checkpoint of rows) {
      if (sameDir(checkpoint.storage ?? defaultStorageDir, storageDir)) owned.push(checkpoint)
    }
  }
  owned.sort((left, right) => left.createdAt - right.createdAt)
  const newest = owned.at(-1)
  const protectedSet = new Set(protectedTrees.map(entry => entry.tree))
  const evictable = owned.filter((checkpoint) => {
    if (checkpoint === newest || protectedCheckpoints.includes(checkpoint)) return false
    if (checkpoint.git !== null && protectedSet.has(checkpoint.git.beforeTree)) return false
    return true
  })

  let changed = false
  let cursor = 0
  while (bytes > targetBytes && cursor < evictable.length) {
    const remaining = evictable.length - cursor
    const batchSize = Math.max(1, Math.ceil(remaining / 4))
    const victims = new Set(evictable.slice(cursor, cursor + batchSize))
    cursor += batchSize
    for (const [sessionId, rows] of Object.entries(checkpoints)) {
      const kept = rows.filter(row => !victims.has(row))
      if (kept.length !== rows.length) changed = true
      if (kept.length === 0) delete checkpoints[sessionId]
      else checkpoints[sessionId] = kept
    }
    await collect()
    bytes = await measureRewindStorage(storageDir)
  }
  return { changed, bytes }
}

/** Snapshot one file or symlink into captures/ before a file-tool mutation. */
export async function captureFile(absolute: string, storage: string | null, maxBytes: number): Promise<Capture> {
  let info
  try {
    info = await lstat(absolute)
  } catch (error) {
    if (missing(error)) return { kind: 'absent' }
    throw error
  }
  if (info.isSymbolicLink()) {
    let directory = false
    try {
      directory = (await stat(absolute)).isDirectory()
    } catch (error) {
      if (!missing(error)) throw error
    }
    return { kind: 'symlink', target: await readlink(absolute), directory }
  }
  if (!info.isFile()) return { kind: 'unsupported' }
  if (info.size > maxBytes) return { kind: 'oversized' }
  const bytes = await readFileAsync(absolute)
  const hash = createHash('sha256').update(bytes).digest('hex')
  const capture = { kind: 'file' as const, hash, mode: info.mode & 0o777 }
  if (storage === null) return capture
  const path = join(storage, 'captures', hash)
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  try {
    await writeFile(path, bytes, { flag: 'wx', mode: 0o600 })
  } catch (error) {
    if ((error as { code?: unknown }).code !== 'EEXIST') throw error
  }
  return capture
}

/** Restore one captured file, symlink or absence without leaving partial temporaries behind. */
export async function restoreCapturedFile(absolute: string, capture: Capture, storage: string): Promise<void> {
  if (capture.kind === 'oversized' || capture.kind === 'unsupported') throw new Error(`no complete capture for ${absolute}`)
  if (capture.kind === 'absent') {
    try {
      const info = await lstat(absolute)
      if (info.isDirectory() && !info.isSymbolicLink()) throw new Error(`refusing to remove directory ${absolute}`)
      await unlink(absolute)
    } catch (error) {
      if (!missing(error)) throw error
    }
    return
  }
  await mkdir(dirname(absolute), { recursive: true, mode: 0o700 })
  if (capture.kind === 'symlink') {
    try {
      await unlink(absolute)
    } catch (error) {
      if (!missing(error)) throw error
    }
    await symlink(capture.target, absolute, capture.directory ? 'junction' : 'file')
    return
  }
  if (capture.kind !== 'file') throw new Error(`no complete capture for ${absolute}`)
  const bytes = await readFileAsync(join(storage, 'captures', capture.hash))
  const temporary = absolute + '.dsh-claude-rewind-' + process.pid + '.tmp'
  try {
    await writeFile(temporary, bytes, { mode: capture.mode })
    await chmod(temporary, capture.mode)
    await rename(temporary, absolute)
  } catch (error) {
    // A failed replace leaves no temporary beside the target; the original failure propagates.
    try { await unlink(temporary) } catch (cleanup) {
      if (!missing(cleanup)) throw new AggregateError([error, cleanup], 'session rewind: temporary cleanup failed')
    }
    throw error
  }
}
