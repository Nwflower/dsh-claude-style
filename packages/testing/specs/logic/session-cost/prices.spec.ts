/**
 * What one settlement costs: the bucket arithmetic, the tier the clock picks,
 * the route the snapshot resolves, and the fold that turns a session's
 * settlements into one figure.
 *
 * @capability session-cost
 * @features context-stats
 * @risk A session's cost is billed at the wrong tier or the wrong model, or a retry is priced twice, so the figure beside the tokens disagrees with the official bill.
 */
import { expect, test } from 'vitest'
import { costMicro, formatMoneyMicro, isPeak, priceFor, priceModelId, priceTierAt } from '@dsh-claude-style/contracts/prices'
import type { PriceDocument, PriceSchedule } from '@dsh-claude-style/contracts/prices'
import { shippedPrices } from '../../fixtures/prices-snapshot'

const schedule: PriceSchedule = {
  timeZone: 'Asia/Shanghai',
  peakDays: [1, 2, 3, 4, 5],
  peakWindows: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }],
  holidays: ['2026-10-01'],
  holidayZone: 'Asia/Shanghai',
}

const document: PriceDocument = {
  schemaVersion: 1,
  updatedAt: '2026-10-20',
  schedule,
  models: {
    'deepseek-flash': {
      CNY: {
        offPeak: { cacheHit: 0.02, cacheMiss: 1, output: 4 },
        peak: { cacheHit: 0.04, cacheMiss: 2, output: 8 },
      },
      USD: {
        offPeak: { cacheHit: 0.003, cacheMiss: 0.15, output: 0.6 },
        peak: { cacheHit: 0.006, cacheMiss: 0.3, output: 1.2 },
      },
    },
  },
  aliases: {
    'deepseek-v4-flash': 'deepseek-flash',
    'k3': 'kimi-k3',
    'k3-256k': 'kimi-k3',
    'k3.1-pro': 'kimi-k3.1-pro',
    'k3.1-pro-highspeed': 'kimi-k3.1-pro-highspeed',
  },
  catalog: {
    'kimi-k3': '3 3 15',
    'kimi-k3.1-pro': '2 0.2 10',
    'kimi-k3.1-pro-highspeed': '4 0.2 20',
    'gemini-3.8-flash': '0.75 0.75 3.75',
    'plan-only': '0 0 0',
  },
  catalogCny: {
    'kimi-k3': '20 2 100',
    'kimi-k3.1-pro': '13 1.3 68',
    'kimi-k3.1-pro-highspeed': '26 1.3 136',
  },
  usdToCny: 7.2,
}

test('the clock reads Beijing weekdays, windows and holidays', () => {
  // Monday 10:00 Beijing.
  expect(isPeak(Date.parse('2026-10-19T02:00:00Z'), schedule)).toBe(true)
  // Monday 13:00 Beijing, between the two windows.
  expect(isPeak(Date.parse('2026-10-19T05:00:00Z'), schedule)).toBe(false)
  // Saturday 10:00 Beijing.
  expect(isPeak(Date.parse('2026-10-17T02:00:00Z'), schedule)).toBe(false)
  // Thursday 10:00 Beijing, a listed holiday.
  expect(isPeak(Date.parse('2026-10-01T02:00:00Z'), schedule)).toBe(false)
})

test('a UTC clock reads the holiday list on the calendar it names', () => {
  // The shipped snapshot copies the catalog's clock: windows in UTC, holidays
  // on the Beijing calendar. The holiday must still match at 10:00 Beijing.
  const utc: PriceSchedule = {
    timeZone: 'UTC',
    peakDays: [1, 2, 3, 4, 5],
    peakWindows: [{ start: '01:00', end: '04:00' }, { start: '06:00', end: '10:00' }],
    holidays: ['2026-10-01'],
    holidayZone: 'Asia/Shanghai',
  }
  expect(isPeak(Date.parse('2026-09-30T02:00:00Z'), utc)).toBe(true)
  expect(isPeak(Date.parse('2026-10-01T02:00:00Z'), utc)).toBe(false)
})

test('a price is the sum of the buckets against their own rates', () => {
  const offPeak = priceTierAt(document.models['deepseek-flash'].CNY, Date.parse('2026-10-17T02:00:00Z'), schedule)
  expect(costMicro({ input: 1_000_000, output: 1_000_000, cacheRead: 0, cacheWrite: 0 }, offPeak)).toBe(5_000_000)
  const peak = priceTierAt(document.models['deepseek-flash'].CNY, Date.parse('2026-10-19T02:00:00Z'), schedule)
  expect(costMicro({ input: 1_000_000, output: 1_000_000, cacheRead: 0, cacheWrite: 0 }, peak)).toBe(10_000_000)
  // Cache writes bill at the input (miss) rate, never cheaper than uncached input; reasoning tokens are already inside output.
  expect(costMicro({ input: 0, output: 0, cacheRead: 0, cacheWrite: 1_000_000 }, peak)).toBe(2_000_000)
})

test('a route is resolved through its aliases and a provider prefix', () => {
  expect(priceFor(document, 'deepseek-v4-flash', 'CNY')?.peak.output).toBe(8)
  expect(priceFor(document, 'deepseek-official/deepseek-flash', 'USD')?.offPeak.cacheMiss).toBe(0.15)
  expect(priceFor(document, 'unknown-model', 'CNY')).toBeUndefined()
})

test('a model the official table does not carry is priced from the catalogue', () => {
  // The picker's own id for Kimi K3, aliased to the catalogue's id.
  expect(priceFor(document, 'k3-256k', 'USD')?.offPeak.output).toBe(15)
  // K3's vendor publishes a CNY list price: that line answers as published,
  // without the USD conversion.
  expect(priceFor(document, 'k3-256k', 'CNY')?.offPeak.cacheHit).toBe(2)
  expect(priceFor(document, 'k3-256k', 'CNY')?.offPeak.cacheMiss).toBe(20)
  expect(priceFor(document, 'k3-256k', 'CNY')?.offPeak.output).toBe(100)
  // A model with only a USD line converts at the snapshot's rate.
  expect(priceFor(document, 'gemini-3.8-flash', 'CNY')?.offPeak.output).toBeCloseTo(27, 5)
  // A variant suffix falls back to the base id the catalogue lists.
  expect(priceFor(document, 'gemini-3.8-flash-high', 'USD')?.offPeak.cacheMiss).toBe(0.75)
  // A plan listing (every number zero) is no price at all.
  expect(priceFor(document, 'plan-only', 'USD')).toBeUndefined()
})

test('a Kimi Code route resolves to the model the catalogue lists', () => {
  // Kimi Code names its routes without the vendor's prefix, so the picker id
  // reaches the catalogue through the snapshot's aliases.
  expect(priceFor(document, 'k3.1-pro', 'USD')?.offPeak.cacheMiss).toBe(2)
  expect(priceFor(document, 'k3.1-pro', 'USD')?.offPeak.output).toBe(10)
  expect(priceFor(document, 'k3.1-pro-highspeed', 'USD')?.offPeak.output).toBe(20)
  expect(priceFor(document, 'k3', 'USD')?.offPeak.output).toBe(15)
  // The vendor publishes the K3.1 lines in CNY: they answer as published.
  expect(priceFor(document, 'k3.1-pro', 'CNY')?.offPeak.cacheHit).toBe(1.3)
  expect(priceFor(document, 'k3.1-pro', 'CNY')?.offPeak.output).toBe(68)
  expect(priceFor(document, 'k3.1-pro-highspeed', 'CNY')?.offPeak.output).toBe(136)
})

test('the figure takes the shorter of four significant digits and four decimals', () => {
  expect(formatMoneyMicro(200, 'USD')).toBe('$0.0002')
  expect(formatMoneyMicro(1500, 'CNY')).toBe('¥0.0015')
  expect(formatMoneyMicro(0, 'CNY')).toBe('¥0.000')
  expect(formatMoneyMicro(1_234_567, 'CNY')).toBe('¥1.235')
})

test('a snapshot-dated DeepSeek route bills at the official two tiers', () => {
  // The official table lists the undated id; the dated route the picker names
  // reaches it through the shipped snapshot's aliases. A catalogue row would
  // answer with one tier for both hours and bill the off-peak at the peak rate.
  const shippedDocument = shippedPrices
  const route = 'remote-magpie/qwen-token-plan/deepseek-v4.1-flash-1017'
  expect(priceModelId(shippedDocument, route)).toBe('deepseek-flash')
  expect(priceModelId(shippedDocument, 'deepseek-v4-pro-0813')).toBe('deepseek-v4-pro')
  const flash = priceFor(shippedDocument, route, 'CNY')
  expect(flash?.offPeak.cacheMiss).toBe(shippedDocument.models['deepseek-flash'].CNY.offPeak.cacheMiss)
  expect(flash?.peak.cacheMiss).toBe(shippedDocument.models['deepseek-flash'].CNY.peak.cacheMiss)
  const pro = priceFor(shippedDocument, 'deepseek-v4-pro-0813', 'USD')
  expect(pro?.offPeak.output).toBe(shippedDocument.models['deepseek-v4-pro'].USD.offPeak.output)
  expect(pro?.peak.output).toBe(shippedDocument.models['deepseek-v4-pro'].USD.peak.output)
  // Beijing 13:00 on a weekday sits between the two peak windows: the tier in
  // force for the dated route is the official off-peak one.
  const tier = priceTierAt(flash!, Date.parse('2026-11-17T05:00:00Z'), shippedDocument.schedule)
  expect(tier.cacheMiss).toBe(shippedDocument.models['deepseek-flash'].CNY.offPeak.cacheMiss)
})
