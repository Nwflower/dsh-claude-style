/**
 * Exact Git work-tree snapshots owned by the plugin. The repository index, refs
 * and object store stay read-only; temporary indexes are named files and are
 * unlinked individually, never recursively removed.
 */
import { execFile } from 'node:child_process'
import { copyFile, lstat, mkdir, readdir, rmdir, unlink } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { RewindFile } from '@dsh-claude-style/contracts/session-rewind'

const MAX_OUTPUT = 32 * 1024 * 1024
const GIT_TIMEOUT_MS = 30_000

export interface GitWorkspace {
  root: string
  gitDir: string
  repositoryObjects: string
  objects: string
  env: Record<string, string>
}

interface GitResult {
  stdout: Buffer
  stderr: Buffer
}

class GitExit extends Error {
  constructor(readonly code: number | string | undefined, stdout: Buffer, stderr: Buffer) {
    super(`git failed: ${stderr.toString('utf8').trim() || stdout.toString('utf8').trim()}`)
  }
}

function baseEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GIT_CONFIG_COUNT: '0',
    GIT_TERMINAL_PROMPT: '0',
    GIT_OPTIONAL_LOCKS: '0',
    LC_ALL: 'C',
  }
}

function git(args: readonly string[], cwd: string, env: Record<string, string> = {}): Promise<GitResult> {
  return new Promise((settle, reject) => {
    execFile('git', [...args], {
      cwd,
      env: { ...baseEnv(), ...env },
      encoding: 'buffer',
      maxBuffer: MAX_OUTPUT,
      timeout: GIT_TIMEOUT_MS,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      const out = Buffer.isBuffer(stdout) ? stdout : Buffer.from(String(stdout))
      const err = Buffer.isBuffer(stderr) ? stderr : Buffer.from(String(stderr))
      if (error !== null) {
        reject(new GitExit((error as { code?: number | string }).code, out, err))
        return
      }
      settle({ stdout: out, stderr: err })
    })
  })
}

async function text(args: readonly string[], cwd: string, env: Record<string, string> = {}): Promise<string> {
  return (await git(args, cwd, env)).stdout.toString('utf8').trim()
}

function missing(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === 'ENOENT'
}

/** Locate a repository, or answer null only for a directory outside one. */
export async function locateGit(cwd: string, storage: string): Promise<GitWorkspace | null> {
  let found: string
  try {
    found = await text(['rev-parse', '--show-toplevel', '--absolute-git-dir', '--git-path', 'objects'], cwd)
  } catch (error) {
    // A non-repository is an expected host layout; every other Git failure is a fault.
    if (error instanceof GitExit && /not a git repository/i.test(error.message)) return null
    throw error
  }
  const lines = found.split('\n').map(line => resolve(cwd, line))
  if (lines.length !== 3) throw new Error(`git rev-parse returned ${lines.length} paths`)
  const [root, gitDir, repositoryObjects] = lines as [string, string, string]
  const objects = join(storage, 'objects')
  await mkdir(objects, { recursive: true, mode: 0o700 })
  return {
    root,
    gitDir,
    repositoryObjects,
    objects,
    env: {
      GIT_OBJECT_DIRECTORY: objects,
      GIT_ALTERNATE_OBJECT_DIRECTORIES: repositoryObjects,
    },
  }
}

function indexPath(storage: string): string {
  return join(storage, 'indexes', `${process.pid}-${randomUUID()}.index`)
}

async function dropFile(path: string): Promise<void> {
  try {
    await unlink(path)
  } catch (error) {
    if (!missing(error)) throw error
  }
}

/** Write the complete non-ignored work tree into the plugin's object store. */
export async function snapshotTree(workspace: GitWorkspace, storage: string): Promise<string> {
  const index = indexPath(storage)
  await mkdir(dirname(index), { recursive: true, mode: 0o700 })
  try {
    try {
      await copyFile(join(workspace.gitDir, 'index'), index)
    } catch (error) {
      if (!missing(error)) throw error
    }
    const env = { ...workspace.env, GIT_INDEX_FILE: index }
    const storageRelative = relative(workspace.root, storage)
    const excluded = storageRelative !== '' && !isAbsolute(storageRelative) && !storageRelative.startsWith('..' + sep)
      ? ['--', '.', `:(exclude)${storageRelative.split(sep).join('/')}`]
      : []
    await text(['-c', 'core.autocrlf=false', 'add', '--all', '--ignore-errors', ...excluded], workspace.root, env)
    return await text(['write-tree'], workspace.root, env)
  } finally {
    await dropFile(index)
    await dropFile(index + '.lock')
  }
}

function nullPaths(bytes: Buffer): string[] {
  return bytes.toString('utf8').split('\0').filter(path => path !== '')
}

/** Files present in one snapshot. */
export async function treePaths(workspace: GitWorkspace, tree: string): Promise<Set<string>> {
  const result = await git(['ls-tree', '-r', '-z', '--name-only', tree], workspace.root, workspace.env)
  return new Set(nullPaths(result.stdout))
}

/** User-facing changes between the rewind target and the confirmed current state. */
export async function diffTrees(workspace: GitWorkspace, before: string, after: string): Promise<RewindFile[]> {
  if (before === after) return []
  const result = await git(['diff-tree', '-r', '--name-status', '-z', before, after], workspace.root, workspace.env)
  const fields = nullPaths(result.stdout)
  const files: RewindFile[] = []
  for (let index = 0; index < fields.length;) {
    const status = fields[index++] ?? ''
    if (status.startsWith('R') || status.startsWith('C')) {
      const from = fields[index++]
      const to = fields[index++]
      if (from !== undefined) files.push({ path: from, status: 'deleted' })
      if (to !== undefined) files.push({ path: to, status: 'added' })
      continue
    }
    const path = fields[index++]
    if (path === undefined) break
    files.push({ path, status: status === 'A' ? 'deleted' : status === 'D' ? 'added' : 'modified' })
  }
  return files
}

async function removeEmptyParents(root: string, path: string): Promise<void> {
  let current = dirname(path)
  while (current !== root && current.startsWith(root + sep)) {
    try {
      await rmdir(current)
    } catch (error) {
      const code = (error as { code?: unknown }).code
      if (code === 'ENOTEMPTY' || code === 'EEXIST') break
      if (code !== 'ENOENT') throw error
    }
    current = dirname(current)
  }
}

/** Remove one file or symbolic link; a non-empty directory is never traversed. */
async function removeSnapshotPath(root: string, slashPath: string): Promise<void> {
  const absolute = resolve(root, ...slashPath.split('/'))
  if (absolute !== root && !absolute.startsWith(root + sep)) throw new Error(`snapshot path escapes repository: ${slashPath}`)
  try {
    const info = await lstat(absolute)
    if (info.isDirectory() && !info.isSymbolicLink()) {
      // Gitlinks name nested repositories. Refuse to enter one during restoration.
      if ((await readdir(absolute)).length > 0) throw new Error(`refusing to replace non-empty directory ${slashPath}`)
      await rmdir(absolute)
    } else {
      await unlink(absolute)
    }
    await removeEmptyParents(root, absolute)
  } catch (error) {
    if (!missing(error)) throw error
  }
}

/** Apply a snapshot without writing repository refs or recursively deleting anything. */
export async function applyTree(workspace: GitWorkspace, storage: string, target: string, reference: string): Promise<void> {
  const [wanted, current] = await Promise.all([
    treePaths(workspace, target),
    treePaths(workspace, reference),
  ])
  for (const path of current) if (!wanted.has(path)) await removeSnapshotPath(workspace.root, path)
  const index = indexPath(storage)
  await mkdir(dirname(index), { recursive: true, mode: 0o700 })
  try {
    const env = { ...workspace.env, GIT_INDEX_FILE: index, GIT_WORK_TREE: workspace.root }
    await text(['read-tree', target], workspace.root, env)
    await text(['-c', 'core.autocrlf=false', 'checkout-index', '--all', '--force'], workspace.root, env)
  } finally {
    await dropFile(index)
    await dropFile(index + '.lock')
  }
}
