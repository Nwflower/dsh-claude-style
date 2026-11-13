/**
 * The session's cost in the currency the reader's billing setting chose (D94):
 * the host's settled totals and the live reading each arrive in one currency,
 * and the setting decides which one the rail prints. Billing off leaves no cost
 * row at all.
 */
import { formatMoneyMicro } from '@dsh-claude-style/contracts/prices'
import type { Currency } from '@dsh-claude-style/contracts/prices'
import { BILLING_OFF } from '../../constants'
import type { SessionFigures } from '../../shared/session-projections'

/** The currency the rail prices in, or null while billing is off. */
export function billingCurrency(choice: string | null): Currency | null {
  return choice === null || choice === BILLING_OFF ? null : choice as Currency
}

/** One figure in micro units of its own currency, as the reader reads it. */
function microCostText(cost: number | null, currency: Currency | null) {
  if (cost === null || currency === null) return null
  return formatMoneyMicro(cost, currency)
}

/**
 * One settled cost as the reader reads it.
 * @param cost - the settled totals in both currencies, in micro units.
 * @param currency - the chosen currency, or null while billing is off.
 * @returns the written figure, or null when there is nothing to print.
 */
export function statsCostText(cost: { cny: number, usd: number } | null, currency: Currency | null) {
  if (cost === null) return null
  return microCostText(currency === 'USD' ? cost.usd : cost.cny, currency)
}

/**
 * The live reading's cost as the reader reads it: already in the currency it was
 * priced in, and grown by the answer still streaming (shared/session-projections.ts).
 * @param figures - the session's live figures.
 * @returns the written figure, or null while no cost is known.
 */
export function figuresCostText(figures: SessionFigures) {
  return microCostText(figures.cost, figures.currency)
}
