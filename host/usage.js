/**
 * Usage aggregation for the skin's home dashboard.
 *
 * The dashboard needs cross-session token totals bucketed by day, which no host
 * service publishes: the `tokenUsage` projection is per session and the session
 * list carries only that session's own totals. This module produces the day
 * buckets and their per-model cells, from the cheapest source that can answer.
 *
 * Two sources, in this order:
 *
 *   1. The cost-meter plugin's ledger (`$DSH_HOME/storages/cost-meter/ledger.json`),
 *      read ONLY. Its `days` map is already a per-day token roll-up, and each
 *      day's `byProviderModel` splits it by `<provider>:<model>` — so when it
 *      exists and covers the newest session activity there is nothing left to
 *      compute. It also outlives the logs: a deleted session's tokens stay in
 *      it. It has no hour dimension, so the fold below still runs behind a
 *      ledger answer for the hour histograms alone. The file is never written: its owner rebuilds the whole document
 *      from a fixed field list and rewrites it under a cross-process lock, so a
 *      foreign key would be dropped by their next flush, a write outside their
 *      lock could lose theirs, and a version they do not recognise makes them
 *      quarantine the file (`ledger.json.corrupt-<stamp>`) and start empty.
 *   2. Our own fold over the session logs, read through the host's own
 *      `sessionQuery` service. The logs are multi-frame zstd (one frame per
 *      appended batch: a 9 MB log holds ~4000 frames) and `node:zlib` decodes
 *      only the first frame, silently discarding the rest — so the frames are
 *      left to the engine's reader and only the aggregation is ours.
 *
 * The fold mirrors the host's own `tokenUsage` projection (see
 * `@deepseek-ai/dsh-token-meter/usage-projection`): one durable Assistant
 * settlement contributes the last usage sample embedded in its stream, a retry
 * on the same turn/step replaces that sample instead of adding to it, and the
 * four buckets are disjoint. The one addition is the day dimension: a replaced
 * sample is subtracted from the day it was recorded on.
 *
 * Our own result is cached under `$DSH_HOME/cache/dsh-claude-style/usage.json`,
 * keyed per session by the newest log's size and modification time, so a warm
 * start costs one directory walk plus one stat per session and re-reads only
 * the logs that changed.
 */
import { mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

/** The ledger's document version this reader understands; anything else is ignored. */
const LEDGER_VERSION = 1
/** Our own cache document version; 2 added the per-session hour histogram, 3 the per-day per-model map, 4 the per-day hour histogram. */
const CACHE_VERSION = 4
/** Session log names: v0 is `session.jsonl`, vN is `session.vN.jsonl`, `.zstd` appended. */
const SESSION_LOG = /^session(?:\.v([1-9][0-9]*))?\.jsonl(?:\.zstd)?$/i
/** Buckets are disjoint; reasoning tokens ride inside output. */
const BUCKET_KEYS = ['input', 'output', 'cacheRead', 'cacheWrite']

/** A local calendar day, the same key the cost-meter ledger uses. */
function dayKey(time) {
  const date = new Date(time)
  if (!Number.isFinite(date.getTime())) return null
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function emptyBuckets() {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0 }
}

function addBuckets(target, buckets, sign) {
  for (const key of BUCKET_KEYS) {
    const value = Number(buckets?.[key])
    if (Number.isFinite(value) && value !== 0) target[key] += sign * value
  }
  target.calls += sign * (Number.isFinite(Number(buckets?.calls)) ? Number(buckets.calls) : 0)
}

/**
 * The usage one durable Assistant settlement reports for its attempt.
 *
 * `assistant/message` may carry it directly; otherwise the sample is the last
 * raw `usage` chunk of the settlement's compact stream.
 */
function usageOf(event) {
  const data = event?.data
  if (data === null || data === undefined || typeof data !== 'object') return undefined
  if (event.type === 'assistant/message' && data.usage !== undefined) return data.usage
  if (event.type !== 'assistant/message' && event.type !== 'assistant/attempt') return undefined
  const stream = data.stream
  if (!Array.isArray(stream)) return undefined
  for (let index = stream.length - 1; index >= 0; index -= 1) {
    const record = stream[index]
    if (record !== null && typeof record === 'object' && record.type === 'chunk'
      && record.chunk !== null && typeof record.chunk === 'object' && record.chunk.type === 'usage') {
      return record.chunk.usage
    }
  }
  return undefined
}

/** The four disjoint buckets of one usage sample. */
function bucketsFrom(usage) {
  const count = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0)
  return {
    input: count(usage?.inputTokens),
    output: count(usage?.outputTokens),
    cacheRead: count(usage?.cacheReadTokens),
    cacheWrite: count(usage?.cacheWriteTokens),
    calls: 1,
  }
}

function bucketsEqual(left, right) {
  return BUCKET_KEYS.every((key) => left[key] === right[key])
}

/** A stored 24-slot hour histogram, or an empty one when the entry has none. */
function hoursFrom(raw) {
  return Array.isArray(raw) && raw.length === 24
    ? raw.map((value) => (Number.isFinite(Number(value)) ? Number(value) : 0))
    : new Array(24).fill(0)
}

/** The four disjoint buckets of one day or one model, summed. */
function bucketTotal(buckets) {
  let total = 0
  for (const key of BUCKET_KEYS) total += Number(buckets?.[key]) || 0
  return total
}

/**
 * The route a settlement's sample belongs to, or null when the event names none.
 *
 * Only `assistant/message` carries the assembled message; an `assistant/attempt`
 * that committed no surface message keeps its usage but has no route to attribute
 * it to, and its tokens then count toward the day alone.
 */
function modelOf(event) {
  const model = event?.data?.message?.source?.model
  return typeof model === 'string' && model !== '' ? model : null
}

/**
 * Fold one session's events into per-day buckets, plus a settlement count per
 * hour of day — the dashboard's peak-hour cell — both for the whole session and
 * for each day, so a range window can sum its own days' hours. A replaced
 * sample leaves its hour the same way it leaves its day.
 *
 * @param events - the session's durable events, in sequence order.
 * @returns a map of local day key to buckets, and a 24-slot hour histogram.
 */
function foldSession(events) {
  const days = new Map()
  const hours = new Array(24).fill(0)
  const bump = (day, hour, buckets, sign, model) => {
    hours[hour] += sign
    let target = days.get(day)
    if (target === undefined) {
      if (sign < 0) return
      target = emptyBuckets()
      target.hours = new Array(24).fill(0)
      days.set(day, target)
    }
    target.hours[hour] += sign
    addBuckets(target, buckets, sign)
    // The same day, per route: what the models chart stacks. A sample whose
    // event names no route still counts toward the day, and only there.
    if (model !== null) {
      let cell = target.models === undefined ? undefined : target.models.get(model)
      if (cell === undefined && sign > 0) {
        if (target.models === undefined) target.models = new Map()
        cell = emptyBuckets()
        target.models.set(model, cell)
      }
      if (cell !== undefined) {
        addBuckets(cell, buckets, sign)
        if (sign < 0 && BUCKET_KEYS.every((key) => cell[key] === 0) && cell.calls === 0) target.models.delete(model)
      }
    }
    if (sign < 0 && BUCKET_KEYS.every((key) => target[key] === 0) && target.calls === 0) days.delete(day)
  }
  // The replacement slot: one settlement per turn/step, replaced on retry.
  let last = null
  for (const event of events) {
    const type = event?.type
    if (type === 'llm/retry-started') {
      const data = event.data
      if (last !== null && last.turn === data?.turn && last.step === data?.step) last = null
      continue
    }
    if (type !== 'assistant/message' && type !== 'assistant/attempt') continue
    const usage = usageOf(event)
    if (usage === undefined) continue
    const day = dayKey(event.time)
    if (day === null) continue
    const hour = new Date(event.time).getHours()
    const buckets = bucketsFrom(usage)
    const model = modelOf(event)
    const turn = event.data?.turn
    const step = event.data?.step
    const replacing = last !== null && last.turn === turn && last.step === step
    if (replacing && bucketsEqual(last.buckets, buckets)) continue
    if (replacing) bump(last.day, last.hour, last.buckets, -1, last.model)
    bump(day, hour, buckets, 1, model)
    last = { turn, step, buckets, day, hour, model }
  }
  return { days, hours }
}

/** A bucket map as a plain object, for the cache document. */
function daysToObject(days) {
  const out = {}
  for (const [day, buckets] of days) {
    const entry = { ...buckets }
    if (buckets.models !== undefined) {
      entry.models = {}
      for (const [model, cell] of buckets.models) entry.models[model] = cell
    }
    out[day] = entry
  }
  return out
}

function daysFromObject(raw) {
  const days = new Map()
  if (raw === null || typeof raw !== 'object') return days
  for (const [day, buckets] of Object.entries(raw)) {
    if (buckets === null || typeof buckets !== 'object') continue
    const clean = emptyBuckets()
    addBuckets(clean, buckets, 1)
    clean.hours = hoursFrom(buckets.hours)
    if (buckets.models !== null && typeof buckets.models === 'object') {
      clean.models = new Map()
      for (const [model, cell] of Object.entries(buckets.models)) {
        if (cell === null || typeof cell !== 'object') continue
        const into = emptyBuckets()
        addBuckets(into, cell, 1)
        clean.models.set(model, into)
      }
    }
    days.set(day, clean)
  }
  return days
}

/** The newest generation of a session directory's log, with its fingerprint. */
function newestLog(dir) {
  let best = null
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return null
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const match = SESSION_LOG.exec(entry.name)
    if (match === null) continue
    const version = Number(match[1] ?? 0)
    const compressed = /\.zstd$/i.test(entry.name)
    if (best === null || version > best.version
      || (version === best.version && Number(compressed) > Number(best.compressed))) {
      best = { name: entry.name, version, compressed }
    }
  }
  if (best === null) return null
  const path = join(dir, best.name)
  let stat
  try {
    stat = statSync(path)
  } catch {
    return null
  }
  return { path, size: stat.size, mtimeMs: stat.mtimeMs }
}

/** Every stored session: id, newest log, and that log's fingerprint. */
function listSessionLogs(root) {
  const out = []
  let projects
  try {
    projects = readdirSync(root, { withFileTypes: true })
  } catch {
    return out
  }
  for (const project of projects) {
    if (!project.isDirectory()) continue
    let sessions
    try {
      sessions = readdirSync(join(root, project.name), { withFileTypes: true })
    } catch {
      continue
    }
    for (const session of sessions) {
      if (!session.isDirectory()) continue
      const log = newestLog(join(root, project.name, session.name))
      if (log === null) continue
      out.push({ id: session.name, ...log })
    }
  }
  return out
}

/**
 * Build the usage service.
 *
 * @param ctx - the host plugin context, used for its home path and the
 *   `sessionQuery` service.
 * @returns the service: `snapshot()` reads the current state, `refresh()`
 *   recomputes in the background.
 */
export function createUsage(ctx) {
  let homePath = null
  try {
    const resolved = ctx.get('dshHomePath')
    if (typeof resolved === 'function') homePath = resolved
  } catch { /* no home-path service: fall back to the environment */ }
  const home = () => {
    if (homePath !== null) {
      try {
        return homePath()
      } catch { /* fall through to the environment */ }
    }
    return process.env.DSH_HOME ?? join(homedir(), '.dsh')
  }

  let state = null
  let pending = null
  let disposed = false

  function readLedger() {
    let raw
    try {
      raw = readFileSync(join(home(), 'storages', 'cost-meter', 'ledger.json'), 'utf8')
    } catch {
      return null
    }
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      return null
    }
    if (parsed === null || typeof parsed !== 'object') return null
    if (parsed.version !== LEDGER_VERSION) return null
    const rawDays = parsed.days
    if (rawDays === null || typeof rawDays !== 'object' || Array.isArray(rawDays)) return null
    const days = new Map()
    for (const [day, bucket] of Object.entries(rawDays)) {
      if (bucket === null || typeof bucket !== 'object') continue
      const clean = emptyBuckets()
      addBuckets(clean, {
        input: bucket.input,
        output: bucket.output,
        cacheRead: bucket.cacheRead,
        cacheWrite: bucket.cacheWrite,
        calls: bucket.calls,
      }, 1)
      // The ledger keeps one record per session per day; the ids are what make
      // the total session count a union rather than a sum.
      clean.sessionIds = Array.isArray(bucket.sessions)
        ? bucket.sessions
          .map((entry) => (entry !== null && typeof entry === 'object' && typeof entry.id === 'string' ? entry.id : null))
          .filter((id) => id !== null)
        : []
      clean.sessions = clean.sessionIds.length
      // The day's split by `<provider>:<model>`, the owner's own key (it splits
      // at the first colon too). The dashboard ranks models, so one model served
      // by two providers is one cell.
      const byProviderModel = bucket.byProviderModel
      if (byProviderModel !== null && typeof byProviderModel === 'object' && !Array.isArray(byProviderModel)) {
        for (const [key, entry] of Object.entries(byProviderModel)) {
          if (entry === null || typeof entry !== 'object') continue
          const model = key.slice(key.indexOf(':') + 1)
          if (model === '') continue
          if (clean.models === undefined) clean.models = new Map()
          let cell = clean.models.get(model)
          if (cell === undefined) {
            cell = emptyBuckets()
            clean.models.set(model, cell)
          }
          addBuckets(cell, entry, 1)
        }
      }
      days.set(day, clean)
    }
    if (days.size === 0) return null
    return days
  }

  function cacheFile() {
    return join(home(), 'cache', 'dsh-claude-style', 'usage.json')
  }

  function readCache() {
    let raw
    try {
      raw = readFileSync(cacheFile(), 'utf8')
    } catch {
      return new Map()
    }
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      return new Map()
    }
    if (parsed === null || typeof parsed !== 'object' || parsed.version !== CACHE_VERSION) return new Map()
    const sessions = new Map()
    const rawSessions = parsed.sessions
    if (rawSessions === null || typeof rawSessions !== 'object') return sessions
    for (const [id, entry] of Object.entries(rawSessions)) {
      if (entry === null || typeof entry !== 'object') continue
      if (!Number.isFinite(entry.size) || !Number.isFinite(entry.mtimeMs)) continue
      sessions.set(id, { size: entry.size, mtimeMs: entry.mtimeMs, days: daysFromObject(entry.days), hours: hoursFrom(entry.hours) })
    }
    return sessions
  }

  function writeCache(sessions) {
    const document = { version: CACHE_VERSION, computedAt: Date.now(), sessions: {} }
    for (const [id, entry] of sessions) {
      document.sessions[id] = { size: entry.size, mtimeMs: entry.mtimeMs, days: daysToObject(entry.days), hours: entry.hours }
    }
    const path = cacheFile()
    const temp = `${path}.${process.pid}.tmp`
    try {
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(temp, JSON.stringify(document), 'utf8')
      renameSync(temp, path)
    } catch { /* an unwritable cache only costs the next cold pass */ }
  }

  /** Sum the per-session day maps into one, tracking distinct sessions per day. */
  function mergeSessions(sessions) {
    const days = new Map()
    const hours = new Array(24).fill(0)
    const seen = new Set()
    for (const [id, entry] of sessions) {
      seen.add(id)
      if (Array.isArray(entry.hours)) {
        for (let hour = 0; hour < 24; hour += 1) hours[hour] += Number(entry.hours[hour]) || 0
      }
      for (const [day, buckets] of entry.days) {
        let target = days.get(day)
        if (target === undefined) {
          target = emptyBuckets()
          target.sessions = new Set()
          target.hours = new Array(24).fill(0)
          days.set(day, target)
        }
        addBuckets(target, buckets, 1)
        target.sessions.add(id)
        for (let hour = 0; hour < 24; hour += 1) target.hours[hour] += buckets.hours[hour]
        if (buckets.models === undefined) continue
        for (const [model, cell] of buckets.models) {
          if (target.models === undefined) target.models = new Map()
          let into = target.models.get(model)
          if (into === undefined) {
            into = emptyBuckets()
            target.models.set(model, into)
          }
          addBuckets(into, cell, 1)
        }
      }
    }
    for (const day of days.values()) {
      day.sessionIds = [...day.sessions].sort()
      day.sessions = day.sessions.size
    }
    return { days, sessionCount: seen.size, hours }
  }

  function summarize(days, sessionCount, source, hours) {
    const list = [...days.entries()].map(([date, buckets]) => ({
      date,
      input: buckets.input,
      output: buckets.output,
      cacheRead: buckets.cacheRead,
      cacheWrite: buckets.cacheWrite,
      calls: buckets.calls,
      sessions: Number.isFinite(buckets.sessions) ? buckets.sessions : 0,
      // The ids behind the day, so the dashboard can union them over any range
      // window instead of summing per-day counts (a two-day session is one).
      sessionIds: buckets.sessionIds === undefined ? []
        : [...buckets.sessionIds].filter((id) => typeof id === 'string').sort(),
      // The day's tokens per model, for the models chart. Absent when nothing
      // on the day is attributed to a model.
      models: buckets.models === undefined ? undefined
        : Object.fromEntries([...buckets.models].map(([id, cell]) => [id, bucketTotal(cell)])),
      // The day's settlements per hour, so a range window can find its own peak
      // hour. Only the fold knows the hour of a settlement.
      ...(buckets.hours === undefined ? {} : { hours: buckets.hours }),
    })).sort((left, right) => (left.date < right.date ? -1 : 1))
    const totals = emptyBuckets()
    const byModel = new Map()
    for (const buckets of days.values()) {
      addBuckets(totals, buckets, 1)
      if (buckets.models === undefined) continue
      for (const [id, cell] of buckets.models) {
        let into = byModel.get(id)
        if (into === undefined) {
          into = emptyBuckets()
          byModel.set(id, into)
        }
        addBuckets(into, cell, 1)
      }
    }
    // Biggest spender first: the dashboard's ranked list and its colour ramp
    // both read this order.
    const models = [...byModel.entries()]
      .map(([id, cell]) => ({ id, ...cell, tokens: bucketTotal(cell) }))
      .sort((left, right) => right.tokens - left.tokens)
    return {
      source,
      computedAt: Date.now(),
      days: list,
      models,
      firstDay: list.length === 0 ? null : list[0].date,
      lastDay: list.length === 0 ? null : list[list.length - 1].date,
      // The fold knows the hour of every settlement; the cost-meter ledger has
      // no hour dimension, so its histogram arrives from the fold afterwards.
      ...(hours === undefined ? {} : { hours }),
      totals: {
        ...totals,
        sessions: sessionCount,
        activeDays: list.length,
      },
    }
  }

  /** Read one session's events through the host's own reader. */
  async function readEvents(sessionId) {
    let query = null
    try {
      query = ctx.get('sessionQuery')
    } catch {
      query = null
    }
    if (query === null || query === undefined || typeof query.readSession !== 'function') return null
    let snapshot
    try {
      snapshot = await query.readSession(sessionId)
    } catch {
      // A log the reader cannot parse (corrupt tail, torn write) is the same
      // failure as a refusal: the session is skipped and retried on the next
      // pass, it never fails the whole fold.
      return null
    }
    const events = snapshot?.events
    return Array.isArray(events) ? events : null
  }

  /** Fold every session whose log changed since the cache was written. */
  async function computeLocal(logs) {
    const cache = readCache()
    const sessions = new Map()
    let read = 0
    let failed = 0
    for (const log of logs) {
      const cached = cache.get(log.id)
      if (cached !== undefined && cached.size === log.size && cached.mtimeMs === log.mtimeMs) {
        sessions.set(log.id, cached)
        continue
      }
      const events = await readEvents(log.id)
      if (events === null) {
        // The reader refused (no `sessionQuery` service, or a log it cannot
        // parse). Leave the session out of the cache so the next pass retries it
        // instead of freezing an empty day map behind a fresh fingerprint.
        failed += 1
        if (cached !== undefined) sessions.set(log.id, cached)
        continue
      }
      const folded = foldSession(events)
      sessions.set(log.id, { size: log.size, mtimeMs: log.mtimeMs, days: folded.days, hours: folded.hours })
      read += 1
    }
    writeCache(sessions)
    const merged = mergeSessions(sessions)
    const summary = summarize(merged.days, merged.sessionCount, 'local', merged.hours)
    if (sessions.size === 0 && failed > 0) {
      return { ...summary, unavailable: true, reason: 'session-query-unavailable' }
    }
    return { ...summary, read, failed, sessions: logs.length }
  }

  /**
   * @param publish - receives an answer that is already worth serving while the
   *   rest of the pass is still running.
   */
  async function compute(publish) {
    const root = resolve(join(home(), 'sessions'))
    const logs = listSessionLogs(root)
    const ledgerDays = readLedger()

    if (ledgerDays !== null) {
      // The shared cache answers for every day it covers; our own fold runs only
      // when session activity reaches past its newest day.
      const ledgerLast = [...ledgerDays.keys()].sort().at(-1) ?? ''
      const activityLast = logs.reduce((newest, log) => {
        const day = dayKey(log.mtimeMs)
        return day !== null && day > newest ? day : newest
      }, '')
      if (activityLast === '' || activityLast <= ledgerLast) {
        const sessionIds = new Set()
        for (const buckets of ledgerDays.values()) {
          for (const id of buckets.sessionIds) sessionIds.add(id)
        }
        const ledgerValue = { ...summarize(ledgerDays, sessionIds.size, 'cost-meter'), sessions: logs.length }
        if (logs.length === 0) return ledgerValue
        // The ledger has no hour dimension. It answers at once, and the fold
        // then supplies the hour histograms — whole and per day — from the
        // sessions whose logs remain; every other figure stays the ledger's.
        publish(ledgerValue)
        const local = await computeLocal(logs)
        if (local.unavailable === true) return ledgerValue
        const localHours = new Map(local.days.map((day) => [day.date, day.hours]))
        return {
          ...ledgerValue,
          hours: local.hours,
          days: ledgerValue.days.map((day) => (localHours.has(day.date) ? { ...day, hours: localHours.get(day.date) } : day)),
        }
      }
    }
    if (logs.length === 0) return summarize(new Map(), 0, 'local', new Array(24).fill(0))
    return await computeLocal(logs)
  }

  function refresh() {
    if (disposed) return Promise.resolve(null)
    if (pending !== null) return pending
    state = state === null ? { value: null, computing: true } : { ...state, computing: true }
    pending = compute((partial) => {
      if (!disposed) state = { value: partial, computing: true }
    }).then(
      (value) => {
        pending = null
        if (disposed) return value
        state = { value, computing: false }
        return value
      },
      (error) => {
        pending = null
        if (!disposed) state = { value: state?.value ?? null, computing: false, error: String(error?.message ?? error) }
        return null
      },
    )
    return pending
  }

  return {
    /** The current state: a value, a computing flag, and the last error if any. */
    snapshot() {
      return state === null
        ? { ok: true, value: null, computing: false }
        : { ok: true, value: state.value, computing: state.computing === true, error: state.error }
    },
    refresh,
    dispose() {
      disposed = true
    },
  }
}
