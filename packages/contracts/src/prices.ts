/**
 * Shared official price snapshot and arithmetic (D73); currency tables remain distinct.
 * `costMicro` returns millionths of the currency, so `tokens × rate per million` needs no division.
 */

/** The two currencies the snapshot carries, in the settings' order. */
export const CURRENCY_CNY = 'CNY'
export const CURRENCY_USD = 'USD'
export const CURRENCIES = [CURRENCY_CNY, CURRENCY_USD] as const
export type Currency = typeof CURRENCIES[number]

/** The symbol each currency writes before its amount. */
export const CURRENCY_SYMBOL: Record<Currency, string> = {
  [CURRENCY_CNY]: '¥',
  [CURRENCY_USD]: '$',
}

/** The document version this reader understands. */
export const PRICE_SCHEMA_VERSION = 1

/** One tier's three rates, per million tokens. Cache writes bill at the hit rate: the official page lists no write price. */
export interface PriceTier {
  cacheHit: number
  cacheMiss: number
  output: number
}

/** One model's two tiers. */
export interface ModelPrice {
  offPeak: PriceTier
  peak: PriceTier
}

/** One peak window, `HH:mm` in the schedule's own zone. */
export interface PriceWindow {
  start: string
  end: string
}

/** Peak weekdays/windows in `timeZone`; dates in `holidayZone` are fully off-peak. */
export interface PriceSchedule {
  timeZone: string
  peakDays: number[]
  peakWindows: PriceWindow[]
  holidays: string[]
  holidayZone: string
}

/** The price snapshot. */
export interface PriceDocument {
  schemaVersion: number
  /** The day the document was captured, `YYYY-MM-DD`. */
  updatedAt: string
  /** The instant of the capture. */
  capturedAt?: string
  source?: { zh?: string, en?: string }
  schedule: PriceSchedule
  /** Model id → currency → its two tiers. */
  models: Record<string, Record<Currency, ModelPrice>>
  /** Retired or provider-prefixed ids that bill as another model. */
  aliases: Record<string, string>
  /** Fallback `"input cacheRead output"` USD rates per million tokens for models absent from the official table. */
  catalog?: Record<string, string>
  /** Published CNY fallback rates; models without one convert `catalog` at `usdToCny`. */
  catalogCny?: Record<string, string>
  /** The rate the USD catalogue converts at when the reader chose CNY. */
  usdToCny?: number
}

/** One usage sample's four disjoint buckets. */
export interface PriceUsage {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

/** What a session's cost route answers, in both currencies. */
export interface SessionCostAnswer {
  cny: number
  usd: number
  /** Whether every settlement could be priced: a settlement with no route is left out. */
  partial: boolean
  /** The route the latest settlement named; a streaming estimate is priced at it. */
  model: string | null
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(timeZone: string) {
  let held = formatters.get(timeZone)
  if (held === undefined) {
    held = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    formatters.set(timeZone, held)
  }
  return held
}

/** Calendar fields in `timeZone`, or null for an invalid instant or unresolvable zone. */
export function clockAt(atMs: number, timeZone: string): { weekday: number, date: string, minutes: number } | null {
  if (!Number.isFinite(atMs)) return null
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = formatter(timeZone).formatToParts(new Date(atMs))
  } catch {
    return null
  }
  const field = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  const weekday = WEEKDAYS.indexOf(field('weekday'))
  const year = Number(field('year'))
  const month = Number(field('month'))
  const day = Number(field('day'))
  const hour = Number(field('hour'))
  const minute = Number(field('minute'))
  if (weekday < 0 || !Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)
    || !Number.isFinite(hour) || !Number.isFinite(minute)) return null
  const pad = (value: number) => String(value).padStart(2, '0')
  return { weekday, date: `${year}-${pad(month)}-${pad(day)}`, minutes: hour * 60 + minute }
}

/** `HH:mm` in minutes, or NaN. */
function clockMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (match === null) return Number.NaN
  return Number(match[1]) * 60 + Number(match[2])
}

/** Peak requires a listed weekday/window and no holiday; unresolved zones stay off-peak. */
export function isPeak(atMs: number, schedule: PriceSchedule): boolean {
  const clock = clockAt(atMs, schedule.timeZone)
  if (clock === null || !schedule.peakDays.includes(clock.weekday)) return false
  // The holiday list is the calendar's own (Asia/Shanghai for DeepSeek), which
  // is not always the clock's zone: the catalog states the windows in UTC.
  const holiday = clockAt(atMs, schedule.holidayZone)
  if (holiday !== null && schedule.holidays.includes(holiday.date)) return false
  for (let i = 0; i < schedule.peakWindows.length; i++) {
    const window = schedule.peakWindows[i]
    const start = clockMinutes(window.start)
    const end = clockMinutes(window.end)
    if (clock.minutes >= start && clock.minutes < end) return true
  }
  return false
}

/** One model id's bare form: lowercase, without a provider prefix, or null. */
export function bareModelId(modelId: string): string | null {
  const raw = modelId.trim().toLowerCase()
  if (raw === '') return null
  return raw.includes('/') ? raw.slice(raw.lastIndexOf('/') + 1) : raw
}

/** The suffixes a session may add to a model id that the catalogue does not carry. */
const CATALOG_SUFFIXES = ['-high', '-low', '-fast', '-sg', '-256k', '-128k', '-1m', '-32k', '-200k', '-flex']

/** Resolve by alias, bare id, then known variant-suffix removal. */
function catalogIdFor(document: PriceDocument, bare: string): string | null {
  const catalog = document.catalog
  if (catalog === undefined) return null
  const candidates = [document.aliases[bare], bare]
  for (const suffix of CATALOG_SUFFIXES) {
    if (bare.endsWith(suffix) && bare.length > suffix.length) candidates.push(bare.slice(0, -suffix.length))
  }
  for (const candidate of candidates) {
    if (candidate !== undefined && Object.hasOwn(catalog, candidate)) return candidate
  }
  return null
}

/** The model id the document prices, following the aliases the snapshot carries. */
export function priceModelId(document: PriceDocument, modelId: string): string | null {
  const bare = bareModelId(modelId)
  if (bare === null) return null
  if (Object.hasOwn(document.models, bare)) return bare
  const alias = document.aliases[bare]
  return alias !== undefined && Object.hasOwn(document.models, alias) ? alias : null
}

/**
 * Prefer official rates; catalog-only models use published CNY or converted USD fallback rates.
 * Catalog fallback tiers are identical because the catalog has no schedule.
 */
export function priceFor(document: PriceDocument, modelId: string, currency: Currency): ModelPrice | undefined {
  const id = priceModelId(document, modelId)
  if (id !== null) return document.models[id]?.[currency]
  const bare = bareModelId(modelId)
  if (bare === null) return undefined
  const catalogId = catalogIdFor(document, bare)
  if (catalogId === null) return undefined
  const published = currency === 'CNY' ? document.catalogCny?.[catalogId] : undefined
  const parts = (published ?? document.catalog?.[catalogId] ?? '').split(' ').map(Number)
  if (parts.length !== 3 || !parts.every(value => Number.isFinite(value) && value >= 0)) return undefined
  if (parts[0] === 0 && parts[2] === 0) return undefined
  // A published CNY line is already in the reader's currency; a USD line is
  // converted only when the reader chose CNY.
  const rate = published !== undefined ? 1 : currency === 'CNY' ? (document.usdToCny ?? 7.2) : 1
  const tier: PriceTier = { cacheHit: parts[1] * rate, cacheMiss: parts[0] * rate, output: parts[2] * rate }
  return { offPeak: tier, peak: tier }
}

/** The tier in force at one instant. */
export function priceTierAt(price: ModelPrice, atMs: number, schedule: PriceSchedule): PriceTier {
  return isPeak(atMs, schedule) ? price.peak : price.offPeak
}

/** Cache writes use the hit rate; reasoning tokens are already included in `output`. */
export function costMicro(usage: PriceUsage, tier: PriceTier): number {
  const count = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0)
  const cost = count(usage.input) * tier.cacheMiss
    + count(usage.cacheRead) * tier.cacheHit
    + count(usage.cacheWrite) * tier.cacheHit
    + count(usage.output) * tier.output
  return Number.isFinite(cost) && cost > 0 ? cost : 0
}

/** Four significant digits of `amount`, written without an exponent. */
function significantFigure(amount: number) {
  const text = amount.toPrecision(4)
  if (!text.includes('e')) return text
  // Past four integer digits toPrecision turns to an exponent; rounding at the
  // same scale keeps the figure a currency is written in.
  const scale = 10 ** (Math.floor(Math.log10(amount)) - 3)
  return String(Math.round(amount / scale) * scale)
}

/** Use the shorter of four-significant-digit and four-decimal formatting. */
export function formatMoneyMicro(micro: number, currency: Currency): string {
  const amount = Number.isFinite(micro) && micro > 0 ? micro / 1_000_000 : 0
  const decimals = amount.toFixed(4)
  const significant = significantFigure(amount)
  return `${CURRENCY_SYMBOL[currency]}${significant.length < decimals.length ? significant : decimals}`
}
