import { MODEL_COPY_FALLBACK_LOCALE, MODEL_COPY_ROUTE } from './copy-fallbacks'
import { createHostResource } from '@dsh-claude-style/engine/resource'
import { textOf } from '../../shared/format'
import type { HostAnswer } from '@dsh-claude-style/engine/resource'

/** One `{ locale: text }` pair of the copy document. */
export type CopyPair = Record<string, string>

/** A family or tier rule: a pattern tried against a model's id and then its display name (D79), and the line every row it claims reads. */
export interface CopyRule {
  re: RegExp
  text?: CopyPair
}

/** A brand rule: a pattern tried against a model's id and then its display name (D79), and the vendored lockup it claims. */
export interface BrandRule {
  re: RegExp
  brand: string
}

/** The copy document, indexed for lookups (indexModelCopy). */
export interface ModelCopyIndex {
  fallback: string
  families: CopyRule[]
  tiers: CopyRule[]
  providerBrands: Record<string, string>
  brandRules: BrandRule[]
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
export function indexModelCopy(doc: HostAnswer): ModelCopyIndex | null {
  if (!doc || typeof doc !== 'object') return null
  // The build validated the document's shape before it shipped (D5); a block
  // that is missing reads as empty.
  const table = <T>(value: unknown) => (value && typeof value === 'object' ? value : {}) as Record<string, T>
  const brands = table<any>(doc.brands)
  const index: ModelCopyIndex = {
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
  const brandRules: BrandRule[] = []
  for (let b = 0; b < (brands.models || []).length; b++) {
    const brandRule = brands.models[b]
    if (!brandRule || typeof brandRule.match !== 'string' || typeof brandRule.brand !== 'string') continue
    brandRules.push({ re: new RegExp(brandRule.match, 'i'), brand: brandRule.brand })
  }
  index.brandRules = brandRules
  return index
}

/**
 * The strings a rule table reads for one catalog model, strongest first
 * (D79): the id the host ships, then the display name the reader may have set
 * beside it. A gateway's id is often an opaque alias (`kmodel`) while the
 * display name is the model's own (`kimi-k2.6`), so a table reading only the
 * id left those rows unclaimed. The id stays first because it is what the
 * provider and the host agree on: the name only answers for what the id leaves
 * open, and a rename can neither move a row off its own model nor claim one
 * another rule already holds.
 */
export function modelIdentity(modelId: unknown, modelName: unknown) {
  const id = textOf(modelId).toLowerCase()
  const name = textOf(modelName).toLowerCase()
  return name === '' || name === id ? [id] : [id, name]
}

/**
 * The first rule that claims any candidate, the candidates being tried in
 * order: a row's own id outranks the name beside it, and within one candidate
 * the rule list's own order decides.
 */
function claimedBy<T extends { re: RegExp }>(rules: T[], candidates: string[]) {
  for (let c = 0; c < candidates.length; c++) {
    for (let i = 0; i < rules.length; i++) {
      if (rules[i].re.test(candidates[c])) return rules[i]
    }
  }
  return null
}

/**
 * The copy pair for one catalog model: family rules, then tier rules.
 *
 * `provider/id` is a candidate of its own, between the id and the name, for
 * ids that carry no brand of their own (`abab6.5s-chat` under a provider
 * called `minimax`); it reads only the id, because the name is the reader's
 * own spelling rather than anything the provider route says.
 *
 * @param index - the document compiled by indexModelCopy, or null before it arrives.
 * @param groupId - the provider group the model is listed under.
 * @param modelId - the catalog model id.
 * @param modelName - the catalog display name.
 * @returns the pair the first claiming rule carries, or null.
 */
export function resolveModelCopy(index: ModelCopyIndex | null, groupId: unknown, modelId: unknown, modelName: unknown): CopyPair | null {
  if (index === null) return null
  const [id, ...aliases] = modelIdentity(modelId, modelName)
  const provider = textOf(groupId).toLowerCase()
  const family = claimedBy(index.families, provider === '' ? [id, ...aliases] : [id, `${provider}/${id}`, ...aliases])
  if (family !== null) return family.text ?? null
  const tier = claimedBy(index.tiers, [id, ...aliases])
  return tier === null ? null : (tier.text ?? null)
}

/**
 * The vendored lockup's id for one catalog model, or null when no rule claims
 * it. The provider route is deliberately no candidate here: a reseller's own
 * lockup on a model it did not make reads as a wrong answer rather than a
 * missing one (D79).
 */
export function resolveModelBrand(index: ModelCopyIndex | null, modelId: unknown, modelName: unknown) {
  if (index === null) return null
  const rule = claimedBy(index.brandRules, modelIdentity(modelId, modelName))
  return rule === null ? null : rule.brand
}

/** Fold case and separators so `glm-5.3-flash` and `glm-5-3-flash` agree. */
export function normalizeModelId(id: unknown) {
  return String(id === undefined || id === null ? '' : id).toLowerCase().replace(/[^a-z0-9]/g, '')
}
