import { PEAKRATE_ROUTE } from '../../constants'
import { forgetRates } from './schedule'
import type { HostAnswer } from '../../shared/resource'
import type { RateProfile } from '@dsh-claude-style/contracts/peakrate'

/**
 * The catalog in the browser: what the host half holds, read once and kept
 * (D54).
 *
 * The host owns the fetching, the disk cache and the refresh timer; this side
 * asks it once when the feature installs and again only when the copy it got
 * is older than the source's own refresh interval. A browser-side copy in
 * localStorage would only duplicate what the host already keeps on disk, so
 * there is none: a reload asks the host, which answers from memory.
 */

/** How old the host's copy may be before this side asks it to fetch again. */
const STALE_MS = 24 * 60 * 60 * 1000

/** How long after an attempt the next pass may try again. */
const RETRY_MS = 5 * 60 * 1000

let profiles: readonly RateProfile[] = []
/** When the host last fetched the source, or NaN when it never has. */
let fetchedAt = Number.NaN
/** When this page last asked, so the scheduler's passes cannot become a poll. */
let attemptedAt = 0
/** True while a request is in flight: one at a time. */
let inFlight = false
/** True once a copy has been adopted, so a later failure keeps what is on screen. */
let loaded = false
/** How many catalogs this page has adopted; the rows' render signature reads it. */
let generation = 0
/**
 * Bumped when the feature is torn down: an answer that arrives afterwards
 * belongs to a scope that is gone, so it is dropped rather than adopted.
 */
let epoch = 0
const listeners = new Set<() => void>()

/** Tell every reader the catalog moved (a new one arrived, or the first attempt failed). */
function announce(): void {
  for (const listener of listeners) listener()
}

/** Read one host answer into the held catalog; `false` when the answer is unusable. */
function adopt(answer: HostAnswer): boolean {
  if (answer === null || answer.ok !== true) return false
  const list = answer.profiles
  if (!Array.isArray(list) || list.length === 0) return false
  const accepted: RateProfile[] = []
  for (const entry of list) {
    if (entry === null || typeof entry !== 'object') return false
    const profile = entry as RateProfile
    if (typeof profile.id !== 'string' || typeof profile.provider !== 'string') return false
    if (profile.schedule === null || typeof profile.schedule !== 'object') return false
    accepted.push(profile)
  }
  profiles = accepted
  fetchedAt = typeof answer.fetchedAt === 'string' ? Date.parse(answer.fetchedAt) : Number.NaN
  loaded = true
  generation += 1
  // The judgement memo is keyed by profile id, so a new catalog has to drop it.
  forgetRates()
  announce()
  return true
}

/**
 * One request to the host half. `refresh` asks it to fetch the source first,
 * which the browser cannot do itself: the source's address is the host's to
 * know.
 */
function call(refresh: boolean): Promise<boolean> {
  const startedAt = epoch
  inFlight = true
  attemptedAt = Date.now()
  return fetch(PEAKRATE_ROUTE, {
    method: refresh ? 'POST' : 'GET',
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  }).then(
    response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    },
  ).then(
    (answer: HostAnswer) => {
      // The feature may have been switched off while this request was out.
      if (epoch !== startedAt) return false
      inFlight = false
      return adopt(answer)
    },
    () => {
      // The host half did not answer: the catalog already held stays, and the
      // meter draws nothing until the next attempt (docs/decisions D54).
      if (epoch !== startedAt) return false
      inFlight = false
      return false
    },
  )
}

/** Whether the copy in hand is old enough to be worth replacing, or was never obtained. */
function stale(now: number): boolean {
  if (!loaded) return true
  return !Number.isFinite(fetchedAt) || now - fetchedAt > STALE_MS
}

/**
 * Bring the catalog up to date, called from the feature's sync. The guards
 * here are what keep the scheduler's passes from becoming a poll: one request
 * at a time, and no attempt within RETRY_MS of the last one.
 *
 * @param now - the instant of the pass.
 */
export function loadPeakRate(now: number): void {
  if (inFlight) return
  if (loaded && !stale(now)) return
  if (attemptedAt !== 0 && now - attemptedAt < RETRY_MS) return
  // Holding a stale copy means the host's own answer is already known to be
  // old, so it is asked to fetch the source in the same round trip.
  const refresh = loaded && stale(now)
  const startedAt = epoch
  void call(refresh).then((adopted) => {
    if (epoch !== startedAt) return
    if (!refresh && adopted && stale(Date.now())) void call(true)
  })
}

/** Forget the page's copy: the feature is being torn down. */
export function stopPeakRate(): void {
  epoch += 1
  profiles = []
  fetchedAt = Number.NaN
  attemptedAt = 0
  loaded = false
  inFlight = false
  forgetRates()
}

/** The catalog in force, empty until the host answers. */
export function peakProfiles(): readonly RateProfile[] {
  return profiles
}

/** How many catalogs this page has adopted; the rows repaint when the number moves. */
export function peakRateGeneration(): number {
  return generation
}

/** Subscribe to the catalog moving; the returned call removes the listener. */
export function subscribePeakRate(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
