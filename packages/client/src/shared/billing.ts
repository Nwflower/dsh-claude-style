/**
 * The reader's own billing rows and the query that carries them to the host.
 *
 * The host prices a session with the rows the page holds (billing-table.ts), so
 * every route that asks for a settled total sends them along. The state is one
 * per page: the settings' adoption writes it once, and each reader builds the
 * same query from it.
 */
import { billingRowEntry, parseBillingTable } from '@dsh-claude-style/contracts/billing-table'
import type { BillingRow } from '@dsh-claude-style/contracts/billing-table'

/** The reader's own rows, and the currency they answer in, as the page last sent them. */
let billing: { rows: readonly BillingRow[], currency: string | null } = { rows: [], currency: null }

/** Adopt the reader's rows from the preferences; the answer to hand back is whether they moved. */
export function adoptBillingRows(entries: readonly string[], currency: string | null) {
  const rows = parseBillingTable(entries)
  const same = rows.length === billing.rows.length
    && rows.every((row, i) => entryOf(row) === entryOf(billing.rows[i]))
  billing = { rows, currency }
  return !same
}

/** One row written back as its stored entry, for comparing what stands. */
export function entryOf(row: BillingRow) {
  return billingRowEntry(row.model, String(row.cacheMiss ?? ''), String(row.cacheHit ?? ''), String(row.output ?? ''))
}

/** The reader's rows in force, for a caller that prices without asking the host. */
export function billingRows() {
  return billing.rows
}

/** The query the host needs to price with the reader's rows. */
export function billingQuery() {
  const parts: string[] = []
  if (billing.currency !== null) parts.push(`cur=${encodeURIComponent(billing.currency)}`)
  for (const row of billing.rows) parts.push(`b=${encodeURIComponent(entryOf(row))}`)
  return parts.length === 0 ? '' : `&${parts.join('&')}`
}
