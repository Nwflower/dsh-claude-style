/**
 * model-copy.mjs — the model copy document's check before it ships (D5).
 */
import fs from 'node:fs'
import path from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

/** The model copy and its schema: data beside the browser half's code, never bundled. */
const DATA = path.join(path.resolve(import.meta.dirname, '..'), 'packages', 'client', 'data')
/**
 * Model copy ships as DATA beside the bundle, not inside it: the browser half
 * fetches it at runtime (the host half serves it), so the table grows without
 * touching this build. It is validated here so a malformed table fails the
 * build instead of the picker.
 */
export const MODEL_COPY = 'model-descriptions.json'
/** The model copy's declared shape; validateModelCopy adds the references a schema cannot see. */
const MODEL_COPY_SCHEMA = 'model-descriptions.schema.json'
const validateModelCopyShape = addFormats(new Ajv2020({ allErrors: true }), ['regex'])
  .compile(JSON.parse(fs.readFileSync(path.join(DATA, MODEL_COPY_SCHEMA), 'utf8')))

/**
 * Check the model copy document before it ships. Every failure here is one the
 * picker could otherwise only express as a silently missing or wrong line, so
 * they all throw.
 *
 * The document's shape is declared in packages/client/data/model-descriptions.schema.json: the
 * tables, the `{locale: text}` lines, a rule's compilable `match` and its `key`
 * or `text`. What a schema cannot see is checked after it: a `families[].key`,
 * `tiers[].key` or `aliases` target must name an `exact` entry, every brand id
 * must be a vendored lockup under packages/assets/src/icons/combine/ (a typo would render
 * as a silently missing mark on one row), and the document must carry at least
 * two locales.
 *
 * @param doc - parsed `packages/client/data/model-descriptions.json`.
 * @param lobeBrands - the vendored lockups keyed by brand id (loadCombines).
 * @returns the number of exact entries, for the build log.
 */
export function validateModelCopy(doc, lobeBrands) {
  const fail = (message) => {
    throw new Error(`build: ${MODEL_COPY} ${message}`)
  }
  if (!validateModelCopyShape(doc)) {
    fail(validateModelCopyShape.errors.map((error) => `${error.instancePath || '/'} ${error.message}`).join('; '))
  }

  const requireEntry = (where, key) => {
    if (!(key in doc.exact)) fail(`${where} points at unknown entry "${key}"`)
  }
  for (const [from, to] of Object.entries(doc.aliases ?? {})) requireEntry(`alias "${from}"`, to)
  for (const list of ['families', 'tiers']) {
    for (const [index, rule] of (doc[list] ?? []).entries()) {
      if (rule.key !== undefined) requireEntry(`${list}[${index}]`, rule.key)
    }
  }

  const requireBrand = (where, brand) => {
    if (!(brand in lobeBrands)) fail(`${where} names brand "${brand}", which has no vendored lockup in packages/assets/src/icons/combine/`)
  }
  for (const [provider, brand] of Object.entries(doc.brands.providers ?? {})) requireBrand(`brands.providers["${provider}"]`, brand)
  for (const [index, rule] of doc.brands.models.entries()) requireBrand(`brands.models[${index}].brand`, rule.brand)

  const locales = new Set([doc.fallback])
  const addLocales = (pair) => {
    for (const locale of Object.keys(pair)) locales.add(locale)
  }
  for (const pair of Object.values(doc.exact)) addLocales(pair)
  for (const group of ['ui', 'settings', 'ban']) {
    for (const pair of Object.values(doc[group] ?? {})) addLocales(pair)
  }
  for (const list of ['families', 'tiers']) {
    for (const rule of doc[list] ?? []) {
      if (rule.text !== undefined) addLocales(rule.text)
    }
  }
  if (locales.size < 2) fail('carries fewer than two locales; i18n needs at least the fallback and one translation')
  return Object.keys(doc.exact).length
}
