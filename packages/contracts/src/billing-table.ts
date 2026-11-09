/**
 * Custom rates overlay the table by model; blank buckets inherit its rates.
 * Stored as `model|input|cacheRead|output` text to preserve entered digits, and shared by both halves (D73).
 */
import type { PriceTier } from './prices'

/** Parsed custom price row. */
export interface BillingRow {
  /** The model id as the reader wrote it, trimmed. */
  model: string
  /** The three rates per million tokens, or null for a bucket the table answers. */
  cacheMiss: number | null
  cacheHit: number | null
  output: number | null
}

/** One row's four fields, split and trimmed, empty strings allowed. */
export function splitBillingRow(entry: string): [string, string, string, string] {
  const parts = entry.split('|')
  return [parts[0] ?? '', parts[1] ?? '', parts[2] ?? '', parts[3] ?? ''].map(part => part.trim()) as [string, string, string, string]
}

/** One entry, from its four fields: the shape a stored row keeps. */
export function billingRowEntry(model: string, input: string, cacheRead: string, output: string) {
  return [model, input, cacheRead, output].map(field => field.trim()).join('|')
}

/** One row from its entry, or null when it names no model. */
export function parseBillingRow(entry: string): BillingRow | null {
  const [model, input, cacheRead, output] = splitBillingRow(entry)
  if (model === '') return null
  return { model, cacheMiss: rate(input), cacheHit: rate(cacheRead), output: rate(output) }
}

/** A rate written as text, or null for a blank, an unreadable or a negative one. */
function rate(text: string): number | null {
  if (text === '') return null
  const value = Number(text)
  return Number.isFinite(value) && value >= 0 ? value : null
}

/** Every row of a stored table, parsed, in the order they stand. */
export function parseBillingTable(entries: readonly string[]): BillingRow[] {
  const rows: BillingRow[] = []
  for (const entry of entries) {
    const row = parseBillingRow(entry)
    if (row !== null) rows.push(row)
  }
  return rows
}

/** A model id's lowercase bare form: the shape the price tables match on. */
export function billingModelKey(modelId: string) {
  const raw = modelId.trim().toLowerCase()
  if (raw === '') return null
  return raw.includes('/') ? raw.slice(raw.lastIndexOf('/') + 1) : raw
}

/** The row one model answers with, or null. */
export function billingRowFor(rows: readonly BillingRow[], modelId: string): BillingRow | null {
  const key = billingModelKey(modelId)
  if (key === null) return null
  for (const row of rows) {
    if (billingModelKey(row.model) === key) return row
  }
  return null
}

/** Apply custom rows; an entirely zero result means neither source prices the model. */
export function overlayBilling(
  rows: readonly BillingRow[],
  modelId: string,
  table: PriceTier | undefined,
): PriceTier | undefined {
  const row = billingRowFor(rows, modelId)
  if (row === null) return table
  const base = table ?? { cacheHit: 0, cacheMiss: 0, output: 0 }
  const tier: PriceTier = {
    cacheMiss: row.cacheMiss ?? base.cacheMiss,
    cacheHit: row.cacheHit ?? base.cacheHit,
    output: row.output ?? base.output,
  }
  if (tier.cacheMiss === 0 && tier.cacheHit === 0 && tier.output === 0) return undefined
  return tier
}
