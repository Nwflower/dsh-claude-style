import { MODEL_COPY_FALLBACK_LOCALE, MODEL_COPY_ROUTE } from './model-labels'
import { createHostResource } from '@dsh-claude-style/engine/resource'
import { textOf } from './format'
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

/** One `match`/`text` rule of the copy document, before its regexp is built (D79). */
interface CopyRuleDocument {
  match: string
  text?: CopyPair
}

/** One `match`/`brand` rule: the lockup a model claims (D79). */
interface BrandRuleDocument {
  match: string
  brand: string
}

/**
 * The copy document's shape, as packages/client/data/model-descriptions.schema.json
 * validates it before it ships (scripts/build/model-copy.mjs, D5). Every block is
 * optional here because the fetched document is not trusted to be the build's
 * own: a block that is missing indexes as empty.
 */
interface ModelCopyDocument {
  fallback?: string
  families?: CopyRuleDocument[]
  tiers?: CopyRuleDocument[]
  brands?: {
    providers?: Record<string, string>
    models?: BrandRuleDocument[]
  }
}

/**
 * Model & settings localized copy.
 *
 * The copy document ships as `model-descriptions.json` beside the bundle.
 * Both the model picker (packages/client/src/features/model/model-picker.ts) and the settings section
 * (packages/client/src/features/settings/settings.ts) consume this copy, so the state
 * lives in the shared context where both zones can reach it.
 *
 * The build loads this module in a Node sandbox (peakrate/match.ts folds ids
 * through normalizeModelId), so it must not value-import the page's runtime:
 * core/i18n reaches, through host-context and identity, core/prefs and with it
 * engine/host's document, which is why the row-facing description line lives
 * in rows.ts.
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
  // Narrowed once: the build validated this shape before the document shipped
  // (scripts/build/model-copy.mjs, D5), so the readers below trust it and only
  // an absent block falls back to empty.
  const parsed = doc as unknown as ModelCopyDocument
  const brands = parsed.brands ?? {}
  return {
    fallback: typeof parsed.fallback === 'string' && parsed.fallback ? parsed.fallback : MODEL_COPY_FALLBACK_LOCALE,
    families: compileCopyRules(parsed.families),
    tiers: compileCopyRules(parsed.tiers),
    providerBrands: brands.providers ?? {},
    brandRules: compileBrandRules(brands.models),
  }
}

/** Compile one `{ match, text }` list into the regexps the lookups try (D79). */
function compileCopyRules(rules: CopyRuleDocument[] = []): CopyRule[] {
  const out: CopyRule[] = []
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i]
    if (!rule || typeof rule.match !== 'string') continue
    out.push({ re: new RegExp(rule.match, 'i'), text: rule.text })
  }
  return out
}

/**
 * Compile the brand rule list: the rules carry no copy, only the lockup's id,
 * which the build already checked against the vendored marks.
 */
function compileBrandRules(rules: BrandRuleDocument[] = []): BrandRule[] {
  const out: BrandRule[] = []
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i]
    if (!rule || typeof rule.match !== 'string' || typeof rule.brand !== 'string') continue
    out.push({ re: new RegExp(rule.match, 'i'), brand: rule.brand })
  }
  return out
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
