/**
 * Git facts for the session overview panel (D94).
 *
 * The panel names the checkout the session works in, its branch and whether it
 * is a linked worktree, and, for a directory that holds several checkouts, the
 * checkouts directly under it. Git is read with its own command line, one
 * process per answer, because neither the page nor the plugin's host half is
 * told a repository's state anywhere else; the calls are read-only (`rev-parse`,
 * `symbolic-ref`, `config`) and run under a short deadline.
 *
 * A directory outside a checkout, a Git that cannot run, and a repository with
 * no commit are all absent answers this module reports as null: the panel still
 * shows the directory, and only the repository rows are missing. An error of any
 * other kind is the same kind of absence here, so the rejection is contained
 * rather than thrown at the route.
 */
import { execFile } from 'node:child_process'
import { homedir, userInfo } from 'node:os'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { repositorySlug } from '@dsh-claude-style/contracts/session-panel'
import type { PanelCheckout, PanelEnvironment } from '@dsh-claude-style/contracts/session-panel'

const run = promisify(execFile)

/** One Git command's deadline; a repository's refs answer in milliseconds. */
const GIT_TIMEOUT_MS = 2500
/** Most output one Git command may print for this module. */
const GIT_MAX_OUTPUT = 256 * 1024
/** How long one directory's answer is kept: a poll every couple of seconds must not spawn Git every time. */
const CHECKOUT_TTL_MS = 5000

/** One directory's Git answer, and when it was read. */
interface CachedEnvironment {
  value: Pick<PanelEnvironment, 'home' | 'user' | 'directory' | 'checkout'>
  at: number
}

/**
 * Run one read-only Git command in a directory.
 * @returns its trimmed stdout, or null when Git failed for any reason.
 */
async function git(directory: string, args: readonly string[]): Promise<string | null> {
  try {
    const { stdout } = await run('git', ['--no-optional-locks', '-C', directory, ...args], {
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: GIT_MAX_OUTPUT,
      windowsHide: true,
      encoding: 'utf8',
    })
    const text = stdout.trim()
    return text === '' ? null : text
  } catch {
    // A directory outside a checkout, a detached HEAD, an unborn branch and a
    // Git that is not installed are the same answer to this reader: no fact.
    // The panel shows the directory either way.
    return null
  }
}

/** The checkout containing `directory`, or null outside one. */
async function checkoutOf(directory: string): Promise<PanelCheckout | null> {
  const root = await git(directory, ['rev-parse', '--show-toplevel'])
  if (root === null) return null
  const [branch, commit, commonDir, remote] = await Promise.all([
    git(directory, ['symbolic-ref', '--short', '-q', 'HEAD']),
    git(directory, ['rev-parse', '--short', 'HEAD']),
    git(directory, ['rev-parse', '--git-common-dir']),
    git(directory, ['config', '--get', 'remote.origin.url']),
  ])
  return {
    root,
    branch,
    commit,
    // A linked worktree's common directory is the source checkout's `.git`,
    // which differs from the worktree's own root-relative one.
    linked: commonDir !== null && resolve(directory, commonDir) !== resolve(root, '.git'),
    repository: repositorySlug(remote),
  }
}

/**
 * What the panel names about the machine and the session's working directory.
 *
 * The answer is kept per directory for a few seconds: the panel asks again on
 * every read, and a branch changes only when the session checks another one out.
 * A directory that is no checkout answers the folder alone: the checkouts beside
 * it are other sessions' business and never enter this answer (D94).
 */
export async function panelEnvironment(directory: string | null): Promise<PanelEnvironment | null> {
  const home = homedir()
  const resolved = directory === null || directory.trim() === '' ? null : resolve(directory)
  const target = resolved ?? home
  let user = ''
  try {
    user = userInfo().username
  } catch {
    // An account record is not required for the panel; the machine row keeps an
    // empty name.
    user = ''
  }
  const cached = environments.get(target)
  if (cached !== undefined && Date.now() - cached.at < CHECKOUT_TTL_MS) return { ...cached.value, user }
  let checkout: PanelCheckout | null = null
  try {
    checkout = await checkoutOf(target)
  } catch {
    // Reading Git is an optional fact here; a failure answers no checkout.
    checkout = null
  }
  const value: CachedEnvironment['value'] = { home, user, directory: target, checkout }
  environments.set(target, { value, at: Date.now() })
  prune()
  return value
}

/** One directory's kept answer, by its resolved path. */
const environments = new Map<string, CachedEnvironment>()
/** Kept directories; the panel reads a handful of workspaces in a page's life. */
const ENVIRONMENT_LIMIT = 16

function prune() {
  if (environments.size <= ENVIRONMENT_LIMIT) return
  const oldest = [...environments.entries()].sort((left, right) => left[1].at - right[1].at)[0]
  if (oldest !== undefined) environments.delete(oldest[0])
}
