/**
 * verify-lock.mjs — the one run at a time a shared working tree allows (D87).
 *
 * Two sessions on one tree otherwise drive browsers on top of each other's
 * runs. Every entry that drives a browser through `lib/` takes this lock — the
 * smoke, the end-to-end lane and the live probes — and `npm run verify` owns
 * the run that starts the gates, so a gate it starts inherits
 * `DSH_CLAUDE_STYLE_LOCK_HELD` and takes nothing. A build takes nothing: it is
 * the loop development runs on and never waits minutes for a test run (D87),
 * and a run whose page a build swapped files no verdict (scripts/verify.mjs).
 *
 * The lock is a directory and `owner.json` names the process holding it, so a
 * run killed outright reads as gone and its lock is taken over: either its pid
 * is dead, or — where the platform handed that number to another process — the
 * time it states is past the longest run this repository has.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const LOCK = path.join(ROOT, '.debug', 'verify.lock')
const OWNER = path.join(LOCK, 'owner.json')
/** Set on the gates of a run and on the rebuilds of the watcher. */
const HELD = 'DSH_CLAUDE_STYLE_LOCK_HELD'
const DEV = 'DSH_CLAUDE_STYLE_DEV'
/** A lock whose owner file cannot be read is given this long before it is read as a run that died taking it. */
const OWNER_GRACE_MS = 60_000
/**
 * How long one run may hold the lock: past the sum of its stages' deadlines
 * (scripts/verify.mjs takes a gate down at its own), so a holder older than this
 * is a dead run whose pid the platform reused, which is the one state the
 * liveness check reads as alive forever.
 */
const MAX_HOLD_MS = 90 * 60 * 1000
/** How often a waiting request looks at the lock again. */
const WAIT_POLL_MS = 2_000
/** How often a waiting request says it is still waiting. */
const WAIT_SAY_MS = 30_000

const say = (line) => process.stdout.write(`${line}\n`)

/**
 * Whether a pid is still alive. The operating system answers this by throwing
 * rather than by returning: `ESRCH` means the process is gone, `EPERM` that it
 * exists and belongs to somebody else.
 */
function alive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code === 'EPERM'
  }
}

/**
 * What the lock says right now.
 * @returns `{ kind: 'free' }`, `{ kind: 'held', owner }` or `{ kind: 'stale', note }`.
 */
function lockState() {
  const stat = fs.statSync(LOCK, { throwIfNoEntry: false })
  if (stat === undefined) return { kind: 'free' }
  if (fs.existsSync(OWNER)) {
    let owner = null
    // The file is read and parsed in one step: it is written whole, so what
    // fails here is a reader that raced a run taking the lock, not a state.
    try {
      owner = JSON.parse(fs.readFileSync(OWNER, 'utf8'))
    } catch {
      owner = null
    }
    if (owner !== null && Number.isInteger(owner.pid)) {
      if (!alive(owner.pid)) return { kind: 'stale', note: `pid ${owner.pid} is gone` }
      const held = Date.now() - Date.parse(owner.at ?? '')
      if (Number.isFinite(held) && held > MAX_HOLD_MS) {
        return { kind: 'stale', note: `pid ${owner.pid} states it took the lock ${Math.round(held / 60_000)} min ago` }
      }
      return { kind: 'held', owner }
    }
  }
  const age = Date.now() - stat.mtimeMs
  return age > OWNER_GRACE_MS
    ? { kind: 'stale', note: `no owner file after ${Math.round(age / 1000)} s` }
    : { kind: 'held', owner: null }
}

/** Hold the lock, waiting out any run in flight, and return the release. */
async function takeLock(label, runId) {
  let announced = 0
  for (;;) {
    try {
      // The lock directory is the lock, and it lives under `.debug/`, which a
      // fresh checkout does not have yet: create that parent first, so the
      // mkdir below answers EEXIST for a lock in flight instead of ENOENT for
      // a missing parent.
      fs.mkdirSync(path.dirname(LOCK), { recursive: true })
      fs.mkdirSync(LOCK)
      fs.writeFileSync(OWNER, `${JSON.stringify({ pid: process.pid, at: new Date().toISOString(), label, runId }, null, 2)}\n`)
      return () => fs.rmSync(LOCK, { recursive: true, force: true })
    } catch (error) {
      // The lock directory is the lock: another run holds it.
      if (error.code !== 'EEXIST') throw error
    }
    const state = lockState()
    if (state.kind === 'stale') {
      say(`${label}: taking the lock from a run that left it behind — ${state.note}`)
      fs.rmSync(LOCK, { recursive: true, force: true })
      continue
    }
    const owner = state.owner
    if (announced === 0 || Date.now() - announced >= WAIT_SAY_MS) {
      announced = Date.now()
      say(owner === null
        ? `${label}: a run is taking the lock; waiting for it`
        : `${label}: waiting for the run in flight — pid ${owner.pid}, started ${owner.at}, ${owner.runId}`)
    }
    await new Promise((resolve) => { setTimeout(resolve, WAIT_POLL_MS) })
  }
}

/**
 * Run `body` under the lock, releasing it however `body` ends. A gate of a run
 * and a rebuild behind the watcher go straight through: the lock is already
 * held above them.
 */
async function withLock(label, runId, body) {
  if (process.env[HELD] === LOCK || process.env[DEV] === '1') return await body()
  const release = await takeLock(label, runId)
  process.env[HELD] = LOCK
  try {
    return await body()
  } finally {
    release()
    delete process.env[HELD]
  }
}

export { LOCK, HELD, DEV, lockState, takeLock, withLock }
