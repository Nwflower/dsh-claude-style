/**
 * The price snapshot's validator: the shape the host half and the build both
 * hold a document to.
 *
 * The document is produced by `scripts/data/fetch-prices.mjs` from the official page
 * and every field a judgement is made from is checked here. A document this
 * reader refuses is dropped whole, because a half-read table would price some
 * settlements at one rate and the rest at another.
 */
import { CURRENCIES, PRICE_SCHEMA_VERSION, clockAt } from '@dsh-claude-style/contracts/prices'
import type { Currency, ModelPrice, PriceDocument, PriceSchedule, PriceTier, PriceWindow } from '@dsh-claude-style/contracts/prices'
import { asRecord } from './json-document.js'

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function asRate(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
}

function asDate(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const [year, month, day] = value.split('-').map(Number)
  const at = new Date(Date.UTC(year, month - 1, day))
  return at.getUTCFullYear() === year && at.getUTCMonth() === month - 1 && at.getUTCDate() === day ? value : undefined
}

function asClock(value: unknown): string | undefined {
  const text = asText(value)
  if (text === undefined || !/^([01]?\d|2[0-3]):[0-5]\d$/.test(text)) return undefined
  return text
}

function asTier(value: unknown): PriceTier | null {  const raw = asRecord(value)
  if (raw === null) return null
  const cacheHit = asRate(raw.cacheHit)
  const cacheMiss = asRate(raw.cacheMiss)
  const output = asRate(raw.output)
  if (cacheHit === undefined || cacheMiss === undefined || output === undefined) return null
  return { cacheHit, cacheMiss, output }
}

function asPrice(value: unknown): ModelPrice | null {
  const raw = asRecord(value)
  if (raw === null) return null
  const offPeak = asTier(raw.offPeak)
  const peak = asTier(raw.peak)
  if (offPeak === null || peak === null) return null
  // The official scheme bills peak at twice off-peak; a table below the
  // off-peak rate would make the tier judgement show up as a discount.
  for (const key of ['cacheHit', 'cacheMiss', 'output'] as const) {
    if (peak[key] < offPeak[key]) return null
  }
  return { offPeak, peak }
}

function asWindows(value: unknown): PriceWindow[] | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const windows: PriceWindow[] = []
  for (const entry of value) {
    const raw = asRecord(entry)
    if (raw === null) continue
    const start = asClock(raw.start)
    const end = asClock(raw.end)
    if (start === undefined || end === undefined) continue
    windows.push({ start, end })
  }
  return windows.length > 0 ? windows : null
}

function asSchedule(value: unknown): PriceSchedule | null {
  const raw = asRecord(value)
  if (raw === null) return null
  const timeZone = asText(raw.timeZone)
  const holidayZone = asText(raw.holidayZone) ?? timeZone
  if (timeZone === undefined || holidayZone === undefined) return null
  // A zone the platform cannot resolve would throw inside every tier judgement.
  if (clockAt(Date.now(), timeZone) === null || clockAt(Date.now(), holidayZone) === null) return null
  const peakDays: number[] = []
  if (!Array.isArray(raw.peakDays)) return null
  for (const day of raw.peakDays) {
    if (!Number.isInteger(day) || day < 0 || day > 6 || peakDays.includes(day)) continue
    peakDays.push(day)
  }
  if (peakDays.length === 0) return null
  const peakWindows = asWindows(raw.peakWindows)
  if (peakWindows === null) return null
  const holidays: string[] = []
  if (raw.holidays !== undefined) {
    if (!Array.isArray(raw.holidays)) return null
    for (const day of raw.holidays) {
      const date = asDate(day)
      if (date !== undefined && !holidays.includes(date)) holidays.push(date)
    }
    holidays.sort()
  }
  return { timeZone, peakDays, peakWindows, holidays, holidayZone }
}

/**
 * One catalogue table, validated: model id → `"input cacheRead output"`. A line
 * holding exactly three non-negative numbers is kept; anything else is dropped
 * alone. A run of spaces is one separator, and the stored line is rewritten with
 * single spaces because the client splits it that way (`split(' ')` in the price
 * contract).
 */
function asCatalog(value: unknown): Record<string, string> | null {
  const raw = asRecord(value)
  if (raw === null) return null
  const out: Record<string, string> = {}
  for (const [id, line] of Object.entries(raw)) {
    if (typeof line !== 'string' || id.trim() === '') continue
    const parts = line.trim().split(/\s+/u)
    const rates = parts.map(Number)
    if (parts.length !== 3 || !rates.every(candidate => Number.isFinite(candidate) && candidate >= 0)) continue
    out[id.trim().toLowerCase()] = rates.join(' ')
  }
  return out
}

/**
 * Validate one snapshot.
 *
 * @param value - the parsed JSON.
 * @returns the document, or null when it is not this version, carries no model,
 *     prices a model in one currency only, or holds a rate that is not a number.
 */
export function parsePriceDocument(value: unknown): PriceDocument | null {
  const raw = asRecord(value)
  if (raw === null || raw.schemaVersion !== PRICE_SCHEMA_VERSION) return null
  const updatedAt = asDate(raw.updatedAt)
  const schedule = asSchedule(raw.schedule)
  if (updatedAt === undefined || schedule === null) return null
  const rawModels = asRecord(raw.models)
  if (rawModels === null) return null
  const models: Record<string, Record<Currency, ModelPrice>> = {}
  for (const [id, entry] of Object.entries(rawModels)) {
    if (id.trim() === '') continue
    const perCurrency = asRecord(entry)
    if (perCurrency === null) return null
    const priced = {} as Record<Currency, ModelPrice>
    for (const currency of CURRENCIES) {
      const price = asPrice(perCurrency[currency])
      if (price === null) return null
      priced[currency] = price
    }
    models[id] = priced
  }
  if (Object.keys(models).length === 0) return null
  // The catalogue is a flat list of list prices, one line per model id. A line
  // that is not three non-negative numbers is dropped alone: the rest of the
  // table still answers, and the official models never depend on it.
  const catalog = raw.catalog === undefined ? {} : asCatalog(raw.catalog)
  if (catalog === null) return null
  const catalogCny = raw.catalogCny === undefined ? {} : asCatalog(raw.catalogCny)
  if (catalogCny === null) return null
  const aliases: Record<string, string> = {}
  if (raw.aliases !== undefined) {
    const rawAliases = asRecord(raw.aliases)
    if (rawAliases === null) return null
    for (const [from, to] of Object.entries(rawAliases)) {
      const target = asText(to)
      if (target !== undefined && (Object.hasOwn(models, target) || Object.hasOwn(catalog, target) || Object.hasOwn(catalogCny, target)) && from.trim() !== '') {
        aliases[from.trim().toLowerCase()] = target
      }
    }
  }
  const document: PriceDocument = { schemaVersion: PRICE_SCHEMA_VERSION, updatedAt, schedule, models, aliases }
  if (Object.keys(catalog).length > 0) document.catalog = catalog
  if (Object.keys(catalogCny).length > 0) document.catalogCny = catalogCny
  const rate = raw.usdToCny
  if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) document.usdToCny = rate
  const capturedAt = asText(raw.capturedAt)
  if (capturedAt !== undefined) document.capturedAt = capturedAt
  const source = asRecord(raw.source)
  if (source !== null) {
    const zh = asText(source.zh)
    const en = asText(source.en)
    if (zh !== undefined || en !== undefined) document.source = { ...(zh === undefined ? {} : { zh }), ...(en === undefined ? {} : { en }) }
  }
  return document
}
