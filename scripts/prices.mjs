/** prices.mjs — validate the shipped price snapshot with the host parser. */
import { loadModule } from './shared/ts-module.mjs'

export const PRICES_FILE = 'prices.json'

export function validatePrices(doc, file) {
  const { parsePriceDocument } = loadModule('packages/host/src/prices-document.ts')
  const parsed = parsePriceDocument(doc)
  if (parsed === null) throw new Error(`build: ${file} is not a price snapshot this build understands`)
  // The line is judged against these two models; a snapshot that lost one of
  // them would leave the sessions on it unpriced while the build stayed green.
  for (const id of ['deepseek-flash', 'deepseek-v4-pro']) {
    if (parsed.models[id] === undefined) throw new Error(`build: ${file} prices no "${id}"`)
  }
  return Object.keys(parsed.models).length
}
