/**
 * The usage roll-up as a widget-board capability.
 *
 * The board runs beside this plugin in the same host process, so the dashboard
 * widget reads the account this half already folds instead of walking every
 * session log a second time. The capability answers `createUsage`'s snapshot —
 * the same value the `usage` route serves — so a widget card and the home panel
 * cannot disagree about a day.
 *
 * The answer covers the user's whole session history, which is why the capability
 * asks for a permission `{}` the way the board's own read-only sources do; the
 * board grants it once per widget version.
 */
import type { DshContext } from '@dsh-claude-style/engine/node/dsh'
import { createUsage } from './usage.js'
import type { UsageSummary } from './usage-summary.js'

/** The name the widget manifest declares (`dsh-claude-style:usage`). */
export const WIDGET_USAGE_CAPABILITY = 'usage'

/** How the board names this capability's provider. */
export const WIDGET_USAGE_PROVIDER = 'dsh-claude-style'

/** The board service version this capability registers against. */
const WIDGET_BOARD_API_VERSION = 3

/** The board's host service name. */
const WIDGET_BOARD_SERVICE = 'widgetBoard'

/**
 * How long a card waits for a pass in flight. The board aborts a capability
 * call at 15s; answering earlier with `ready: false` leaves the card its own
 * refresh to follow instead of a rejection it cannot retry.
 */
const WIDGET_USAGE_WAIT_MS = 12_000

/** One day of the roll-up, as the board's widget copies it out. */
interface WidgetUsageDay {
  date: string
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  calls: number
  sessions: number
  hours?: number[]
}

/** The capability's answer: the roll-up, or the reasons there is none yet. */
export interface WidgetUsageAnswer {
  ready: boolean
  computedAt: number | null
  error: string | null
  days: WidgetUsageDay[]
  /** Per-model token totals, biggest spender first. */
  models: { id: string, tokens: number }[]
  /** Settlements per hour of the day over the whole history; absent when no pass has landed. */
  hours: number[] | null
  totals: { input: number, output: number, cacheRead: number, cacheWrite: number, calls: number, sessions: number, activeDays: number }
  firstDay: string | null
  lastDay: string | null
}

const NUMBER = { type: 'number', minimum: 0 } as const

/**
 * The part of the board's host service this file calls. Declared here rather
 * than imported so the skin loads without the board installed.
 */
interface WidgetBoardService {
  readonly apiVersion: number
  registerCapability(registration: unknown): () => void
}

/** One capability registration, in the shape the board validates. */
interface WidgetUsageCapability {
  apiVersion: number
  provider: string
  id: string
  title: { zh: string, en: string }
  description: { zh: string, en: string }
  permission: Record<string, never>
  input: unknown
  output: unknown
  timeoutMs: number
  call(instance: unknown, args: unknown, signal: AbortSignal): Promise<WidgetUsageAnswer>
}

/** The input schema: the card passes nothing. */
const WIDGET_USAGE_INPUT = { type: 'object', additionalProperties: false, properties: {} } as const

/** The output schema the board validates an answer against. */
const WIDGET_USAGE_OUTPUT = {
  type: 'object',
  additionalProperties: false,
  required: ['ready', 'computedAt', 'error', 'days', 'models', 'hours', 'totals', 'firstDay', 'lastDay'],
  properties: {
    ready: { type: 'boolean' },
    computedAt: { type: ['number', 'null'] },
    error: { type: ['string', 'null'] },
    days: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['date', 'input', 'output', 'cacheRead', 'cacheWrite', 'calls', 'sessions'],
        properties: {
          date: { type: 'string' },
          input: NUMBER,
          output: NUMBER,
          cacheRead: NUMBER,
          cacheWrite: NUMBER,
          calls: NUMBER,
          sessions: NUMBER,
          hours: { type: 'array', items: NUMBER },
        },
      },
    },
    models: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'tokens'],
        properties: { id: { type: 'string' }, tokens: NUMBER },
      },
    },
    hours: { type: ['array', 'null'], items: NUMBER },
    totals: {
      type: 'object',
      additionalProperties: false,
      required: ['input', 'output', 'cacheRead', 'cacheWrite', 'calls', 'sessions', 'activeDays'],
      properties: {
        input: NUMBER,
        output: NUMBER,
        cacheRead: NUMBER,
        cacheWrite: NUMBER,
        calls: NUMBER,
        sessions: NUMBER,
        activeDays: NUMBER,
      },
    },
    firstDay: { type: ['string', 'null'] },
    lastDay: { type: ['string', 'null'] },
  },
} as const

/** A count the board can take: a missing or non-finite figure reads as zero. */
function count(value: unknown): number {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

/** The empty answer a card reads while the first pass is still running. */
function pending(error: string | null): WidgetUsageAnswer {
  return {
    ready: false,
    computedAt: null,
    error,
    days: [],
    models: [],
    hours: null,
    totals: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0, sessions: 0, activeDays: 0 },
    firstDay: null,
    lastDay: null,
  }
}

/**
 * Shape one summary into the answer. Only the four buckets, the counts, the
 * hour histogram and the model totals cross: the session ids and the record's
 * own bookkeeping stay in this half.
 */
export function widgetUsageAnswer(value: UsageSummary): WidgetUsageAnswer {
  const days = Array.isArray(value.days) ? value.days : []
  const totals = value.totals ?? {}
  const hours = Array.isArray(value.hours)
    ? Array.from({ length: 24 }, (_, hour) => count(value.hours?.[hour]))
    : null
  return {
    ready: true,
    computedAt: typeof value.computedAt === 'number' ? value.computedAt : null,
    error: null,
    days: days.map((day) => ({
      date: String(day.date ?? ''),
      input: count(day.input),
      output: count(day.output),
      cacheRead: count(day.cacheRead),
      cacheWrite: count(day.cacheWrite),
      calls: count(day.calls),
      sessions: count(day.sessions),
      ...(Array.isArray(day.hours) ? { hours: Array.from({ length: 24 }, (_, hour) => count((day.hours as unknown[])[hour])) } : {}),
    })),
    models: (Array.isArray(value.models) ? value.models : []).map((model) => ({
      id: String(model.id ?? ''),
      tokens: count(model.tokens),
    })),
    hours,
    totals: {
      input: count(totals.input),
      output: count(totals.output),
      cacheRead: count(totals.cacheRead),
      cacheWrite: count(totals.cacheWrite),
      calls: count(totals.calls),
      sessions: count(totals.sessions),
      activeDays: count(totals.activeDays),
    },
    firstDay: typeof value.firstDay === 'string' ? value.firstDay : null,
    lastDay: typeof value.lastDay === 'string' ? value.lastDay : null,
  }
}

/**
 * Wait until the service holds a summary, or the wait runs out.
 *
 * @param usage - the roll-up service.
 * @param signal - the board's abort signal.
 * @returns the snapshot to answer with.
 */
async function waitForSummary(usage: ReturnType<typeof createUsage>, signal: AbortSignal) {
  const deadline = Date.now() + WIDGET_USAGE_WAIT_MS
  let snapshot = usage.snapshot()
  // The first query asks for a pass; later ones wait on the one in flight.
  while (snapshot.value === null && !signal.aborted && Date.now() < deadline) {
    usage.refresh()
    await new Promise((resolve) => setTimeout(resolve, 250))
    snapshot = usage.snapshot()
    if (snapshot.value === null && snapshot.computing !== true && snapshot.error !== undefined) return snapshot
  }
  return snapshot
}

/**
 * Register the usage capability on the board's service.
 *
 * The board is waited for through `inject`, like the routes wait for the web
 * server: a profile lists the two plugins in its own order, and the board
 * provides its service only when its own fiber applies.
 *
 * @param ctx - the host plugin context.
 * @returns nothing; the registration drops with this generation.
 */
export function registerWidgetUsage(ctx: DshContext): void {
  const register = (scope: DshContext) => {
    const board = scope.get(WIDGET_BOARD_SERVICE) as WidgetBoardService | undefined
    if (board === undefined || board.apiVersion !== WIDGET_BOARD_API_VERSION) return
    const usage = createUsage(ctx)
    ctx.effect?.(() => {
      usage.dispose()
    })
    board.registerCapability({
      apiVersion: WIDGET_BOARD_API_VERSION,
      provider: WIDGET_USAGE_PROVIDER,
      id: WIDGET_USAGE_CAPABILITY,
      title: { zh: '用量汇总', en: 'Usage roll-up' },
      description: {
        zh: '读取本插件已经折好的会话用量：每天的分桶、按小时的结算次数与各模型的 token 总量。',
        en: 'Reads the session usage this plugin has already folded: per-day buckets, hourly settlements and per-model token totals.',
      },
      permission: {},
      input: WIDGET_USAGE_INPUT,
      output: WIDGET_USAGE_OUTPUT,
      timeoutMs: 14_000,
      async call(_instance: unknown, _args: unknown, signal: AbortSignal) {
        const snapshot = await waitForSummary(usage, signal)
        if (snapshot.value === null) return pending(snapshot.error ?? null)
        return widgetUsageAnswer(snapshot.value)
      },
    } satisfies WidgetUsageCapability)
  }
  if (typeof ctx.inject === 'function') ctx.inject([WIDGET_BOARD_SERVICE], register)
  else register(ctx)
}
