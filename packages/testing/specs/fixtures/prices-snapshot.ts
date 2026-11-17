/**
 * The shipped price snapshot, for the specs that judge the data the build
 * validates: the aliases the generator writes and the rates behind them.
 */
import shipped from '../../../host/data/prices.json'
import type { PriceDocument } from '@dsh-claude-style/contracts/prices'

export const shippedPrices: PriceDocument = shipped
