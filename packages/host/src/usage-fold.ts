/**
 * The session logs: which ones exist, how to read one, and the fold that turns
 * its events into per-day buckets and hour histograms.
 *
 * The events come through the host's own `sessionQuery` service. A log is
 * multi-frame zstd and `node:zlib` decodes only the first frame, silently
 * discarding the rest, so the frames are left to the engine's reader and only
 * the aggregation is ours.
 *
 * The fold mirrors the host's own `tokenUsage` projection (see
 * `@deepseek-ai/dsh-token-meter/usage-projection`): one durable Assistant
 * settlement contributes the last usage sample embedded in its stream, a retry on
 * the same turn/step replaces that sample instead of adding to it, and the four
 * buckets are disjoint. The one addition is the day dimension: a replaced sample
 * is subtracted from the day it was recorded on.
 */
import { existsSync } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { DshContext } from '@dsh-claude-style/engine/node/dsh'
import { sessionIdFromDirectoryName } from './session-name.js'
import { BUCKET_KEYS, addBuckets, emptyBuckets } from './usage-ledger.js'
import type { Buckets, DayBuckets } from './usage-ledger.js'

/** Session log names: v0 is `session.jsonl`, vN is `session.vN.jsonl`, `.zstd` appended. */
const SESSION_LOG = /^session(?:\.v([1-9][0-9]*))?\.jsonl(?:\.zstd)?$/i

/** One raw log event, as the usage samples are read out of it. */
export interface UsageEvent {
  type?: string
  seq?: number
  time?: number
  turn?: number
  step?: number
  data?: {
    usage?: UsageSample
    turn?: number
    step?: number
    stream?: { type?: string, chunk?: { type?: string, usage?: UsageSample } }[]
    message?: { source?: { model?: unknown }, usage?: UsageSample }
  }
}

/** One usage sample, in the host's own token names. */
export interface UsageSample {
  inputTokens?: unknown
  outputTokens?: unknown
  cacheReadTokens?: unknown
  cacheWriteTokens?: unknown
}

/** One session log on disk: its logical id, the name it is stored under, and its fingerprint. */
export interface SessionLog {
  /** The logical id, decoded from the directory name: what the session services look a session up by. */
  id: string
  /** The directory name on disk, which is also the key the usage record holds. */
  storedName: string
  path: string
  size: number
  mtimeMs: number
}

/** What one session's fold produced: its days and its hours. */
interface FoldedSession {
  days: Map<string, DayBuckets>
  hours: number[]
}

/**
 * A local calendar day, the same key the cost-meter ledger uses. Also how the
 * service places a session log's last write on the calendar.
 */
export function dayKey(time: number): string | null {
  const date = new Date(time)
  if (!Number.isFinite(date.getTime())) return null
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * The usage one durable Assistant settlement reports for its attempt.
 *
 * `assistant/message` may carry it directly; otherwise the sample is the last
 * raw `usage` chunk of the settlement's compact stream.
 */
export function usageOf(event: UsageEvent): UsageSample | undefined {
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
function bucketsFrom(usage: UsageSample | null | undefined): Buckets {
  const count = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0)
  return {
    input: count(usage?.inputTokens),
    output: count(usage?.outputTokens),
    cacheRead: count(usage?.cacheReadTokens),
    cacheWrite: count(usage?.cacheWriteTokens),
    calls: 1,
  }
}

function bucketsEqual(left: Buckets, right: Buckets) {
  return BUCKET_KEYS.every((key) => left[key] === right[key])
}

/**
 * The route a settlement's sample belongs to, or null when the event names none.
 * Only `assistant/message` carries the assembled message; an `assistant/attempt`
 * that committed no surface message keeps its usage but has no route, so its
 * tokens count toward the day alone.
 */
export function modelOf(event: UsageEvent): string | null {
  const model = event?.data?.message?.source?.model
  return typeof model === 'string' && model !== '' ? model : null
}

/**
 * Fold one session's events into per-day buckets, plus a settlement count per
 * hour of day for the dashboard's peak-hour cell, both for the whole session and
 * for each day, so a range window can sum its own days' hours. A replaced sample
 * leaves its hour the same way it leaves its day.
 *
 * @param events - the session's durable events, in sequence order.
 * @returns a map of local day key to buckets, and a 24-slot hour histogram.
 */
export function foldSession(events: UsageEvent[]): FoldedSession {
  const days = new Map<string, DayBuckets>()
  const hours = new Array(24).fill(0) as number[]
  const bump = (day: string, hour: number, buckets: Buckets, sign: number, model: string | null) => {
    hours[hour] += sign
    let target = days.get(day)
    if (target === undefined) {
      if (sign < 0) return
      const fresh: DayBuckets = emptyBuckets()
      fresh.hours = new Array(24).fill(0)
      fresh.models = new Map<string, Buckets>()
      days.set(day, fresh)
      target = fresh
    }
    const targetHours = target.hours ?? (target.hours = new Array(24).fill(0))
    targetHours[hour] += sign
    addBuckets(target, buckets, sign)
    // The same day, per route: what the models chart stacks. A sample whose
    // event names no route still counts toward the day, and only there.
    if (model !== null) {
      const models = target.models ?? (target.models = new Map<string, Buckets>())
      let cell = models.get(model)
      if (cell === undefined && sign > 0) {
        if (target.models === undefined) target.models = new Map()
        cell = emptyBuckets()
        models.set(model, cell)
      }
      if (cell !== undefined) {
        addBuckets(cell, buckets, sign)
        if (sign < 0 && BUCKET_KEYS.every((key) => cell[key] === 0) && cell.calls === 0) models.delete(model)
      }
    }
    if (sign < 0 && BUCKET_KEYS.every((key) => target[key] === 0) && target.calls === 0) days.delete(day)
  }
  // The replacement slot: one settlement per turn/step, replaced on retry.
  type Settlement = { turn?: number, step?: number, buckets: Buckets, day: string, hour: number, model: string | null }
  let last: Settlement | null = null
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
    if (typeof event.time !== 'number') continue
    const day = dayKey(event.time)
    if (day === null) continue
    const hour = new Date(event.time).getHours()
    const buckets = bucketsFrom(usage)
    const model = modelOf(event)
    const turn = event.data?.turn
    const step = event.data?.step
    const previous = last as Settlement | null
    const replacing = previous !== null && previous.turn === turn && previous.step === step
    if (replacing && previous !== null && bucketsEqual(previous.buckets, buckets)) continue
    if (replacing && previous !== null) bump(previous.day, previous.hour, previous.buckets, -1, previous.model)
    bump(day, hour, buckets, 1, model)
    last = { turn, step, buckets, day, hour, model }
  }
  return { days, hours }
}

/** The newest generation of a session directory's log, with its fingerprint. */
async function newestLog(dir: string): Promise<{ path: string, size: number, mtimeMs: number } | null> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (error) {
    // A session directory removed between the root listing and this read is a
    // session deleted mid-pass: it has no log to fold, and every other one
    // still does (D12).
    if ((error as { code?: string }).code === 'ENOENT') return null
    throw error
  }
  let best: { name: string, version: number, compressed: boolean } | null = null
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
  try {
    const info = await stat(path)
    return { path, size: info.size, mtimeMs: info.mtimeMs }
  } catch (error) {
    // The log itself removed between that listing and this stat is the same
    // deletion the directory read above tolerates.
    if ((error as { code?: string }).code === 'ENOENT') return null
    throw error
  }
}

/**
 * Every stored session: its logical id, the directory name it is stored under,
 * its newest log and that log's fingerprint. A harness home that has never
 * stored a session has no sessions root yet.
 */
export async function listSessionLogs(root: string): Promise<SessionLog[]> {
  const out: SessionLog[] = []
  if (!existsSync(root)) return out
  for (const project of await readdir(root, { withFileTypes: true })) {
    if (!project.isDirectory()) continue
    let sessions
    try {
      sessions = await readdir(join(root, project.name), { withFileTypes: true })
    } catch (error) {
      // A workspace directory removed since the root listing went with its
      // sessions: the pass walks the ones that are left.
      if ((error as { code?: string }).code === 'ENOENT') continue
      throw error
    }
    for (const session of sessions) {
      if (!session.isDirectory()) continue
      const log = await newestLog(join(root, project.name, session.name))
      if (log === null) continue
      const storedName = session.name
      out.push({ id: sessionIdFromDirectoryName(storedName), storedName, ...log })
    }
  }
  return out
}

