#!/usr/bin/env node
/**
 * fetch-prices.mjs — refresh independent CNY and USD snapshots from official
 * tables. Require the peak catalog so holidays are not priced as off-peak.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PRICES_FILE, validatePrices } from './prices.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TARGET = path.join(ROOT, 'packages', 'host', 'data', PRICES_FILE)
const CATALOG = path.join(ROOT, 'packages', 'host', 'data', 'peakrate-catalog.json')
const SOURCE = {
  zh: 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/',
  en: 'https://api-docs.deepseek.com/quick_start/pricing/',
}
/** Fallback prices use the first positive public list price for each model id. */
const CATALOG_URL = 'https://models.dev/api.json'
/** The rate the USD catalogue converts at for a reader who chose CNY. */
const USD_TO_CNY = 7.2
/** Cache writes use the hit rate; retain only the three metrics this meter prices. */
const CATALOG_CNY = {
  'kimi-k3': '20 2 100',
  'kimi-k3.1-pro': '13 1.3 68',
  'kimi-k3.1-pro-highspeed': '26 1.3 136',
}
const ALIASES = {
  'deepseek-v4-flash': 'deepseek-flash',
  'deepseek-v4-flash-vision-exp': 'deepseek-flash',
  'deepseek-v4.1-flash': 'deepseek-flash',
  'deepseek-chat': 'deepseek-flash',
  'deepseek-reasoner': 'deepseek-flash',
  // The Kimi Code picker names its routes without the vendor's prefix; the
  // catalogue lists them as kimi-k3 and kimi-k3.1-pro.
  'k3': 'kimi-k3',
  'k3-256k': 'kimi-k3',
  'k3.1-pro': 'kimi-k3.1-pro',
  'k3.1-pro-highspeed': 'kimi-k3.1-pro-highspeed',
}
const MODEL_ID = /deepseek-[a-z0-9_.-]+/i

async function load(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: { accept: 'text/html', 'user-agent': 'dsh-claude-style price snapshot' },
  })
  if (!response.ok) throw new Error(`${url} answered ${response.status}`)
  return response.text()
}

function decode(text) {
  return text.replace(/&(nbsp|lt|gt|quot|#39|mdash|amp);/g,
    (_, entity) => ({ nbsp: ' ', lt: '<', gt: '>', quot: '"', '#39': "'", mdash: '—', amp: '&' })[entity])
}

function stripTags(html) {
  return decode(String(html).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function tables(html) {
  return (String(html).match(/<table[\s\S]*?<\/table>/gi) ?? []).map((block) => {
    const rows = []
    for (const tr of block.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
      const cells = []
      for (const cell of tr.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) ?? []) {
        cells.push(stripTags(cell.replace(/^<t[dh][^>]*>/, '').replace(/<\/t[dh]>$/, '')))
      }
      if (cells.length > 0) rows.push(cells)
    }
    return rows
  })
}

function money(cell) {
  const usd = /(?:^|[^\w.$])\$([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)/.exec(cell)
  if (usd !== null) return { value: Number(usd[1].replace(/,/g, '')), currency: 'USD' }
  const cny = /([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)\s*元/.exec(cell)
  if (cny !== null) return { value: Number(cny[1].replace(/,/g, '')), currency: 'CNY' }
  return null
}

function metricOf(text) {
  const upper = text.toUpperCase()
  if (text.includes('缓存未命中') || upper.includes('CACHE MISS')) return 'cacheMiss'
  if (text.includes('缓存命中') || upper.includes('CACHE HIT')) return 'cacheHit'
  if (upper.includes('OUTPUT') && upper.includes('TOKEN')) return 'output'
  if (text.includes('输出') && (text.includes('百万') || text.includes('TOKEN'))) return 'output'
  return null
}

function tierOf(cell) {
  const text = cell.trim().toUpperCase()
  if (text === 'PEAK' || cell.trim() === '高峰时段') return 'peak'
  if (text === 'OFF-PEAK' || cell.trim() === '空闲时段') return 'offPeak'
  return null
}

/**
 * One page's rate table.
 *
 * @returns model id → currency → { offPeak, peak } with the three metrics.
 */
function parsePage(html, url) {
  const found = new Map()
  let currency = null
  for (const rows of tables(html)) {
    let ids = []
    let metric = null
    for (const row of rows) {
      const first = (row[0] ?? '').trim()
      if (/^MODEL$/i.test(first) || first === '模型') {
        const named = row.slice(1).map(cell => (MODEL_ID.exec(cell) ?? [])[0]).filter(Boolean)
        if (named.length > 0) ids = named.map(id => id.toLowerCase())
        continue
      }
      const detected = metricOf(row.join(' '))
      if (detected !== null) metric = detected
      if (ids.length === 0 || metric === null) continue
      const tierIndex = row.findIndex(cell => tierOf(cell) !== null)
      if (tierIndex < 0) continue
      const tier = tierOf(row[tierIndex])
      const prices = row.slice(tierIndex + 1, tierIndex + 1 + ids.length).map(money)
      if (prices.some(price => price === null)) continue
      if (prices.some(price => price.currency !== prices[0].currency)) {
        throw new Error(`fetch-prices: ${url} mixes currencies in one row`)
      }
      currency = prices[0].currency
      for (let i = 0; i < ids.length; i++) {
        let model = found.get(ids[i])
        if (model === undefined) {
          model = { offPeak: {}, peak: {} }
          found.set(ids[i], model)
        }
        model[tier][metric] = prices[i].value
      }
    }
  }
  for (const [id, model] of found) {
    for (const tier of ['offPeak', 'peak']) {
      for (const metric of ['cacheHit', 'cacheMiss', 'output']) {
        const value = model[tier][metric]
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
          throw new Error(`fetch-prices: ${url} does not price ${id} ${tier}.${metric}`)
        }
      }
    }
    for (const metric of ['cacheHit', 'cacheMiss', 'output']) {
      if (model.peak[metric] < model.offPeak[metric]) {
        throw new Error(`fetch-prices: ${url} prices ${id} peak ${metric} below off-peak`)
      }
    }
  }
  if (currency === null) throw new Error(`fetch-prices: ${url} yields no rates`)
  return { currency, models: found }
}

/** The Chinese public holidays the peak rate catalog carries for DeepSeek. */
/**
 * Copy the shared DeepSeek billing clock so pricing and badges cannot drift.
 */
function scheduleFromCatalog() {
  if (!fs.existsSync(CATALOG)) throw new Error(`fetch-prices: ${CATALOG} is missing; run scripts/fetch-peakrate-catalog.mjs first`)
  const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'))
  const profile = (catalog.profiles ?? []).find(entry => entry?.id === 'deepseek-v4')
  const schedule = profile?.schedule
  if (schedule === null || schedule === undefined) {
    throw new Error('fetch-prices: the peak rate catalog carries no DeepSeek clock')
  }
  const timeZone = typeof schedule.timeZone === 'string' && schedule.timeZone !== '' ? schedule.timeZone : null
  const holidayZone = typeof schedule.publicHolidayTimeZone === 'string' && schedule.publicHolidayTimeZone !== ''
    ? schedule.publicHolidayTimeZone
    : timeZone
  const peakDays = Array.isArray(schedule.peakDays)
    ? [...new Set(schedule.peakDays.filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort()
    : []
  const peakWindows = Array.isArray(schedule.peakWindows)
    ? schedule.peakWindows
      .filter(win => win !== null && typeof win === 'object' && /^([01]?\d|2[0-3]):[0-5]\d$/.test(win.start) && /^([01]?\d|2[0-3]):[0-5]\d$/.test(win.end))
      .map(win => ({ start: win.start, end: win.end }))
    : []
  const dates = schedule.publicHolidayDates
  if (timeZone === null || holidayZone === null) throw new Error('fetch-prices: the DeepSeek clock names no time zone')
  if (peakDays.length === 0) throw new Error('fetch-prices: the DeepSeek clock lists no peak day')
  if (peakWindows.length === 0) throw new Error('fetch-prices: the DeepSeek clock lists no peak window')
  if (!Array.isArray(dates) || dates.length === 0) {
    throw new Error('fetch-prices: the peak rate catalog carries no Chinese public holidays for DeepSeek')
  }
  const holidays = [...new Set(dates.filter(day => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)))].sort()
  return { timeZone, holidayZone, peakDays, peakWindows, holidays }
}

/** Use per-model medians to ignore provider order and reseller outliers; omit zero-priced plans. */
async function catalogPrices() {
  const body = JSON.parse(await load(CATALOG_URL))
  const providers = body !== null && typeof body === 'object' ? body : {}
  /** Bare model id → the positive prices the vendors list for it. */
  const entries = new Map()
  for (const providerId of Object.keys(providers)) {
    const models = providers[providerId]?.models
    if (models === null || typeof models !== 'object') continue
    for (const [id, entry] of Object.entries(models)) {
      const cost = entry?.cost
      if (cost === null || typeof cost !== 'object') continue
      const input = Number(cost.input)
      const output = Number(cost.output)
      const cacheRead = cost.cache_read === undefined ? input : Number(cost.cache_read)
      if (![input, output, cacheRead].every(value => Number.isFinite(value) && value >= 0)) continue
      if (input === 0 && output === 0) continue
      // The vendor's own prefix is not part of the model: `alibaba/kimi-k3`
      // and `kimi-k3` are one model, and a session id may name either.
      const key = id.trim().toLowerCase().replace(/^.*\//, '')
      if (key === '') continue
      let held = entries.get(key)
      if (held === undefined) {
        held = []
        entries.set(key, held)
      }
      held.push({ input, cacheRead, output })
    }
  }
  /** The middle of a field's values, so one reseller's outlier does not set the row. */
  const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b)
    const middle = sorted.length >> 1
    const value = sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
    return Number(value.toFixed(6))
  }
  const catalog = {}
  for (const [key, prices] of entries) {
    catalog[key] = [median(prices.map(price => price.input)), median(prices.map(price => price.cacheRead)), median(prices.map(price => price.output))].join(' ')
  }
  return Object.fromEntries(Object.entries(catalog).sort(([a], [b]) => (a < b ? -1 : 1)))
}

const zh = parsePage(await load(SOURCE.zh), SOURCE.zh)
const en = parsePage(await load(SOURCE.en), SOURCE.en)
if (zh.currency !== 'CNY' || en.currency !== 'USD') {
  throw new Error(`fetch-prices: expected CNY from the Chinese page and USD from the English one, got ${zh.currency}/${en.currency}`)
}
const ids = [...zh.models.keys()].sort()
const englishIds = [...en.models.keys()].sort()
if (ids.join(',') !== englishIds.join(',')) {
  throw new Error(`fetch-prices: the two pages price different models (${ids.join(',')} vs ${englishIds.join(',')})`)
}

const models = {}
for (const id of ids) {
  models[id] = { CNY: zh.models.get(id), USD: en.models.get(id) }
}

const now = new Date()
// A catalogue outage must not take the official prices down with it: the
// previous snapshot's table answers, and only a run with neither fails.
let catalog
try {
  catalog = await catalogPrices()
} catch (error) {
  const previous = fs.existsSync(TARGET) ? JSON.parse(fs.readFileSync(TARGET, 'utf8')) : null
  if (previous?.catalog === undefined) throw error
  console.warn(`fetch-prices: ${CATALOG_URL} unreachable (${error.message}); keeping the committed catalogue`)
  catalog = previous.catalog
}
const document = {
  schemaVersion: 1,
  updatedAt: now.toISOString().slice(0, 10),
  capturedAt: now.toISOString(),
  source: SOURCE,
  schedule: scheduleFromCatalog(),
  models,
  aliases: ALIASES,
  catalog,
  catalogCny: CATALOG_CNY,
  usdToCny: USD_TO_CNY,
}
validatePrices(document, TARGET)

// A daily rewrite that only moves the timestamps would make a commit a day.
// The rates, the clock and the holidays are what the document is for; when they
// match the committed copy, the file is left alone.
if (fs.existsSync(TARGET)) {
  const previous = JSON.parse(fs.readFileSync(TARGET, 'utf8'))
  const facts = (doc) => {
    const { updatedAt, capturedAt, ...rest } = doc
    return JSON.stringify(rest)
  }
  if (facts(previous) === facts(document)) {
    console.log(`prices unchanged (${ids.length} models)`)
    process.exit(0)
  }
}

fs.writeFileSync(TARGET, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
console.log(`wrote packages/host/data/${PRICES_FILE} (${ids.length} models, CNY/USD, ${document.schedule.holidays.length} holidays, updatedAt ${document.updatedAt})`)
