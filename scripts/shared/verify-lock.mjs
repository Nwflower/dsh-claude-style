/**
 * verify-lock.mjs — serialize browser runs on a shared tree (D87): child gates inherit
 * the lock, and stale owner records are reclaimed.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const LOCK = path.join(ROOT, '.debug', 'verify.lock')
const OWNER = path.join(LOCK, 'owner.json')
const HELD = 'DSH_CLAUDE_STYLE_LOCK_HELD'
const DEV = 'DSH_CLAUDE_STYLE_DEV'
const OWNER_GRACE_MS = 60_000
/** Outliving every stage deadline means the pid may have been reused; treat the lock as stale. */
const MAX_HOLD_MS = 90 * 60 * 1000
/** How often a waiting request looks at the lock again. */
const WAIT_POLL_MS = 2_000
/** How often a waiting request says it is still waiting. */
const WAIT_SAY_MS = 30_000

const say = (line) => process.stdout.write(`${line}\n`)

/** `EPERM` still proves the process exists; `ESRCH` means it is gone. */
function alive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code === 'EPERM'
  }
}


function lockState() {
  const stat = fs.statSync(LOCK, { throwIfNoEntry: false })
  if (stat === undefined) return { kind: 'free' }
  if (fs.existsSync(OWNER)) {
    let owner = null
    // Written whole, so what fails here is a reader that raced a run taking the lock, not a state.
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
      // Create .debug first so an existing lock reports EEXIST rather than ENOENT.
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

/** Always release after `body`; inherited gates and watcher rebuilds already hold the lock. */
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
