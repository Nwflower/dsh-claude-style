/**
 * The session's settled cost in the currency the reader's billing setting chose
 * (D94): both totals arrive from the host, and the setting decides which one the
 * rail prints. Billing off leaves no cost row at all.
 */
import { formatMoneyMicro } from '@dsh-claude-style/contracts/prices'
import type { Currency } from '@dsh-claude-style/contracts/prices'
import { BILLING_OFF } from '../../constants'

/** The currency the rail prices in, or null while billing is off. */
export function billingCurrency(choice: string | null): Currency | null {
  return choice === null || choice === BILLING_OFF ? null : choice as Currency
}

/**
 * One settled cost as the reader reads it.
 * @param cost - the settled totals in both currencies, in micro units.
 * @param currency - the chosen currency, or null while billing is off.
 * @returns the written figure, or null when there is nothing to print.
 */
export function statsCostText(cost: { cny: number, usd: number } | null, currency: Currency | null) {
  if (cost === null || currency === null) return null
  return formatMoneyMicro(currency === 'USD' ? cost.usd : cost.cny, currency)
}
