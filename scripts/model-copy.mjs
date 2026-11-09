/**
 * model-copy.mjs — the model copy document's check before it ships (D5).
 */
import fs from 'node:fs'
import path from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

/** The model copy and its schema: data beside the browser half's code, never bundled. */
const DATA = path.join(path.resolve(import.meta.dirname, '..'), 'packages', 'client', 'data')
/** The browser fetches this data at runtime, so malformed copy must fail the build (D5). */
export const MODEL_COPY = 'model-descriptions.json'
/** The model copy's declared shape; validateModelCopy adds the references a schema cannot see. */
const MODEL_COPY_SCHEMA = 'model-descriptions.schema.json'
const validateModelCopyShape = addFormats(new Ajv2020({ allErrors: true }), ['regex'])
  .compile(JSON.parse(fs.readFileSync(path.join(DATA, MODEL_COPY_SCHEMA), 'utf8')))

/** Check schema-external brand references and translations so picker rows cannot lose copy silently. */
export function validateModelCopy(doc, lobeBrands) {
  const fail = (message) => {
    throw new Error(`build: ${MODEL_COPY} ${message}`)
  }
  if (!validateModelCopyShape(doc)) {
    fail(validateModelCopyShape.errors.map((error) => `${error.instancePath || '/'} ${error.message}`).join('; '))
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
  for (const group of ['ui', 'settings', 'ban']) {
    for (const pair of Object.values(doc[group] ?? {})) addLocales(pair)
  }
  for (const list of ['families', 'tiers']) {
    for (const rule of doc[list] ?? []) {
      if (rule.text !== undefined) addLocales(rule.text)
    }
  }
  if (locales.size < 2) fail('carries fewer than two locales; i18n needs at least the fallback and one translation')
  return doc.families.length
}
