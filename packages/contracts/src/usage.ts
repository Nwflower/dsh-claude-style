import type { HomeSessionScope } from './prefs'

/**
 * Shared usage payload (D73). The narrower `sessions.list` roll-up omits fields
 * that the plugin's own usage route can supply.
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
  /** `cost-meter+local` merges sources by date to fill missing or partial figures; never sums them. */
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
  /** The window's favourite model, read as a fallback for the headline. */
  model?: string
  /** Which session filter produced this answer; an older host leaves it absent. */
  scope?: HomeSessionScope
  /** The unfiltered record's session count, shown as a filtered figure's denominator. */
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

/** `computing` tells the panel to poll again while the host folds usage. */
export interface UsageAnswer {
  ok?: boolean
  value?: UsageReport | null
  computing?: boolean
  error?: string
}

/** Content-search hits identify their session and matched excerpt range. */
export interface SearchAnswer {
  ok?: boolean
  error?: string
  sessions?: ContentHit[]
}

/** One content hit: the session it belongs to, the message that matched, and the excerpt with its range. */
export interface ContentHit {
  sessionId: string
  /** The event sequence of the message that matched: what the jump lands on */
  seq: number
  snippet: string
  /** The matched span of `snippet`, as `[start, end]`. */
  match: [number, number]
}

