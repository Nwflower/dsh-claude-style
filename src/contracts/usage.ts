/**
 * The usage payload the plugin's two halves exchange (D27's panel, D38's route).
 *
 * `host/usage.js` answers `GET /dsh-claude-style/usage` with this shape and the
 * browser half reads it in `src/features/home/data.ts`; the session list's own
 * roll-up (`sessions.list`, a host service) answers a narrower version of the
 * same entries, which is why several fields below are optional. These types are
 * the plugin's own contract rather than the host's, so they live beside the code
 * that produces them; D46 moves them into the shared contracts package.
 */

/** One day of a roll-up: the four buckets, the settled calls, and the day's models. */
export interface UsageDay {
  /** The calendar day, `YYYY-MM-DD`. */
  date: string
  input?: number
  output?: number
  cacheRead?: number
  cacheWrite?: number
  /** One total for the day; the session list's roll-up carries this where the fold carries buckets. */
  total?: number
  /** The day's settled calls; absent on the session list's roll-up. */
  calls?: number
  sessions?: number
  /** The sessions behind the day, so a range window can union them instead of summing counts. */
  sessionIds?: string[]
  /** The day's tokens per model id; absent when nothing on the day is attributed. */
  models?: Record<string, number>
  /** The day's settlements per hour, which only the fold knows. */
  hours?: number[]
}

/** One model of a roll-up, biggest spender first. */
export interface UsageModel {
  id: string
  input?: number
  output?: number
  cacheRead?: number
  cacheWrite?: number
  calls?: number
  /** The model's bucket sum. */
  tokens: number
  sessions?: number
  lastAt?: number
}

/** What the usage route answers: the window's days, the models, and where the figures came from. */
export interface UsageReport {
  /** Which source answered: the fold over the session logs, or the cost ledger. */
  source: string
  computedAt: number
  days: UsageDay[]
  models: UsageModel[]
  firstDay: string | null
  lastDay: string | null
  /** The window's settlements per hour, when the fold could place them. */
  hours?: number[]
  /** The window's sums: the four buckets, the settled calls, and how many days and sessions they came from. */
  totals: UsageTotals
  /** An older host half sent the window's favourite model here; the panel still reads it as a fallback. */
  model?: string
  totalSessions?: number
}

/** The window's sums, as the panel's headline figures read them. */
export interface UsageTotals {
  input?: number
  output?: number
  cacheRead?: number
  cacheWrite?: number
  calls?: number
  sessions?: number
  activeDays?: number
  /** One total, when the source only keeps one (the session list's roll-up). */
  total?: number
}

/**
 * The usage route's envelope: whether the read worked, the report behind it,
 * and whether the host half is still folding (in which case the panel polls
 * again).
 */
export interface UsageAnswer {
  ok?: boolean
  value?: UsageReport | null
  computing?: boolean
  error?: string
}

/**
 * The answer of the plugin's own content search (`host/search.js`,
 * `GET /dsh-claude-style/session-search`): the hits, each naming its session
 * and the match inside the excerpt.
 */
export interface SearchAnswer {
  ok?: boolean
  error?: string
  sessions?: ContentHit[]
}

/** One content hit: the session it belongs to, the excerpt, and the match's range inside it. */
export interface ContentHit {
  sessionId: string
  snippet: string
  /** The matched span of `snippet`, as `[start, end]`. */
  match: [number, number]
}

