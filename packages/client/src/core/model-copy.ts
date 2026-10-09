import { MODEL_COPY_FALLBACK_LOCALE, MODEL_COPY_ROUTE } from '../features/model/copy-fallbacks'
import { createHostResource } from '../shared/resource'
import type { HostAnswer } from '../shared/resource'

/** One `{ locale: text }` pair of the copy document. */
export type CopyPair = Record<string, string>

/** A family or tier rule: a model-id pattern and the line every id it claims reads. */
export interface CopyRule {
  re: RegExp
  text?: CopyPair
}

/** The copy document, indexed for lookups (indexModelCopy). */
export interface ModelCopyIndex {
  ui: Record<string, CopyPair>
  settings: Record<string, CopyPair>
  ban: Record<string, CopyPair>
  reader: Record<string, CopyPair>
  fallback: string
  families: CopyRule[]
  tiers: CopyRule[]
  providerBrands: Record<string, string>
  brandRules: { re: RegExp, brand: string }[]
}

/**
 * Model & settings localized copy.
 *
 * The copy document ships as `model-descriptions.json` beside the bundle.
 * Both the model picker (packages/client/src/features/model/model-picker.ts) and the settings section
 * (packages/client/src/features/settings/settings.ts) consume this copy, so the state lives in the shared context.
 * where both zones can reach it.
 */
export let modelCopy: ModelCopyIndex | null = null

/**
 * The model copy document the host half serves. A document that does not
 * index is not adopted: the bundle's English constants stay.
 */
const modelCopyResource = createHostResource(MODEL_COPY_ROUTE, (doc) => {
  const indexed = indexModelCopy(doc)
  if (indexed === null) return undefined
  modelCopy = indexed
  return modelCopy
})

export function onModelCopyLoaded(listener: (copy: ModelCopyIndex) => void) {
  return modelCopyResource.onLoaded(listener)
}

/**
 * Fetch the model copy document the host half serves.
 */
export function loadModelCopy() {
  modelCopyResource.load()
}

/**
 * Compile a copy document into the shape lookups want: the rule lists with
 * their regexps built once.
 * @param doc - parsed document, as validated by the build.
 * @returns the index, or null when the document is unusable.
 */
function indexModelCopy(doc: HostAnswer): ModelCopyIndex | null {
  if (!doc || typeof doc !== 'object') return null
  // The build validated the document's shape before it shipped (D5); a block
  // that is missing reads as empty.
  const table = <T>(value: unknown) => (value && typeof value === 'object' ? value : {}) as Record<string, T>
  const brands = table<any>(doc.brands)
  const index: ModelCopyIndex = {
    ui: table(doc.ui),
    settings: table(doc.settings),
    // The account-hold easter egg's page copy rides the same document
    // (packages/client/src/features/ban-screen/ban-screen.ts). Every block the document carries has to
    // be listed here: this index IS what lookups read, so an unlisted block
    // would silently fall back to the bundle's English constants.
    ban: table(doc.ban),
    // The reading view's copy (packages/client/src/features/chat-reader/, D57).
    reader: table(doc.reader),
    fallback: typeof doc.fallback === 'string' && doc.fallback ? doc.fallback : MODEL_COPY_FALLBACK_LOCALE,
    families: [],
    tiers: [],
    providerBrands: table(brands.providers),
    brandRules: [],
  }
  const compile = (rules: any) => {
    const out: CopyRule[] = []
    for (let i = 0; i < (rules || []).length; i++) {
      const rule = rules[i]
      if (!rule || typeof rule.match !== 'string') continue
      // The build compiles every rule before it ships the document.
      out.push({ re: new RegExp(rule.match, 'i'), text: rule.text })
    }
    return out
  }
  index.families = compile(doc.families)
  index.tiers = compile(doc.tiers)
  // Brand rules carry no copy, only the mark's id; the build has already
  // checked every id against the vendored marks.
  const brandRules: ModelCopyIndex['brandRules'] = []
  for (let b = 0; b < (brands.models || []).length; b++) {
    const brandRule = brands.models[b]
    if (!brandRule || typeof brandRule.match !== 'string' || typeof brandRule.brand !== 'string') continue
    brandRules.push({ re: new RegExp(brandRule.match, 'i'), brand: brandRule.brand })
  }
  index.brandRules = brandRules
  return index
}

/** Fold case and separators so `glm-5.3-flash` and `glm-5-3-flash` agree. */
export function normalizeModelId(id: unknown) {
  return String(id === undefined || id === null ? '' : id).toLowerCase().replace(/[^a-z0-9]/g, '')
}
