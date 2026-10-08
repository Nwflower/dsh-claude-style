import { normalizeModelId } from '../../core/model-copy'
import type { RateProfile } from '@dsh-claude-style/contracts/peakrate'

/**
 * Which billing profile applies to one provider and model (D54).
 *
 * A profile is a provider's clock, not a model's: the data source lists direct
 * vendors, and a provider that resells one of them inherits its schedule. So
 * the host's own provider id is translated to the data source's provider name
 * first — the ids are local labels the user chose, and nothing in them is a
 * billing reality — and the model id then picks between the profiles that
 * vendor publishes (one provider can run several clocks: Z.ai's GLM-5.3 and
 * GLM-5.3-Flash do).
 *
 * A model that matches nothing carries no rate at all: decorating it with a
 * clock it does not bill by is worse than showing nothing.
 */

/** Host provider id → the data source's provider name. */
export const PROVIDER_ALIASES: Record<string, string> = {
  'deepseek-official': 'DeepSeek',
  'deepseek-account': 'DeepSeek',
  ocg: 'DeepSeek',
  'ocg-1': 'DeepSeek',
  'opencode-go': 'DeepSeek',
  ollama: 'Ollama',
  zai: 'Z.ai',
  qoder: 'Qoder',
  'qoder-cn': 'Qoder CN',
  bai: 'B.AI',
  'baidu-qianfan': 'Baidu Qianfan',
  'tencent-cloud': 'Tencent Cloud',
  'alibaba-cloud': 'Alibaba Cloud',
  siliconflow: 'SiliconFlow',
  'xiaomi-token-plan-cn': 'Xiaomi MiMo',
  swarms: 'Swarms',
}

/**
 * One profile's model pattern, keyed by the **catalog's** provider name (the
 * alias table's target), so every provider that resolves to a vendor shares
 * that vendor's patterns. Patterns are model-id prefixes in the folded form
 * (`normalizeModelId`); the first hit wins, so a longer pattern has to stand
 * above the shorter one it starts with.
 */
export const MODEL_MAPPINGS: { provider: string, match: string, profile: string }[] = [
  // The official service and every gateway that resells it: one clock, so
  // every DeepSeek model of these providers shares a profile.
  { provider: 'DeepSeek', match: 'deepseek-v4-pro', profile: 'deepseek-v4' },
  { provider: 'DeepSeek', match: 'deepseek-v4-flash', profile: 'deepseek-v4' },
  { provider: 'DeepSeek', match: 'deepseek-flash', profile: 'deepseek-v4' },
  { provider: 'DeepSeek', match: 'deepseek-v4', profile: 'deepseek-v4' },
  { provider: 'Ollama', match: 'deepseek', profile: 'ollama-deepseek-v4' },
  { provider: 'Z.ai', match: 'glm-5.3-flash', profile: 'zai-glm-5-3-flash' },
  { provider: 'Z.ai', match: 'glm-5.3', profile: 'zai-glm-5-3' },
  { provider: 'Qoder', match: 'qwen3.8-max', profile: 'qoder-qwen3-8-max' },
  { provider: 'Qoder', match: 'qwen3.7-max', profile: 'qoder-qwen3-7-max' },
  { provider: 'Qoder', match: 'qwen3.7-plus', profile: 'qoder-qwen3-7-plus' },
  { provider: 'Qoder CN', match: 'qwen3.8-flash', profile: 'qoder-qwen3-8-flash' },
  { provider: 'B.AI', match: 'deepseek-v4-pro', profile: 'bai-deepseek-v4-pro' },
  { provider: 'B.AI', match: 'deepseek', profile: 'bai-deepseek-v4' },
  { provider: 'B.AI', match: 'glm-5.3-flash', profile: 'bai-glm53-flash' },
  { provider: 'B.AI', match: 'glm-5.3', profile: 'bai-glm53' },
  { provider: 'B.AI', match: 'glm-5.2', profile: 'bai-glm52' },
  { provider: 'B.AI', match: 'mimo', profile: 'bai-mimo26-flash' },
  { provider: 'Baidu Qianfan', match: 'deepseek', profile: 'baidu-qianfan-deepseek-v4' },
  { provider: 'Baidu Qianfan', match: 'glm', profile: 'baidu-qianfan-glm53' },
  { provider: 'Tencent Cloud', match: 'deepseek', profile: 'tencent-deepseek-v4-vendor-direct' },
  { provider: 'Alibaba Cloud', match: 'deepseek', profile: 'alibaba-deepseek-v4-token-plan' },
  { provider: 'Alibaba Cloud', match: 'qwen3.8-max', profile: 'alibaba-qwen3-8-max' },
  { provider: 'Alibaba Cloud', match: 'qwen3.7-plus', profile: 'alibaba-qwen3-7-plus-api-global' },
  { provider: 'Alibaba Cloud Model Studio', match: 'deepseek', profile: 'alibaba-model-studio-deepseek-v4' },
  { provider: 'SiliconFlow', match: 'deepseek', profile: 'siliconflow-deepseek-v4-flash' },
  // Two gateways whose published clock covers whatever is routed through them.
  { provider: 'Swarms', match: '', profile: 'swarms-swarm-completions' },
  { provider: 'Xiaomi MiMo', match: '', profile: 'xiaomi-mimo-v2-5-token-plan' },
]

/** The mappings with their patterns folded once, so a row costs one comparison. */
const FOLDED_MAPPINGS = MODEL_MAPPINGS.map(entry => ({ ...entry, folded: normalizeModelId(entry.match) }))

/**
 * The profile that bills `modelId` under `providerId`, or undefined when the
 * provider is unknown to the catalog or none of its profiles claims the model.
 *
 * @param providerId - the host's provider id.
 * @param modelId - the host's model id.
 * @param profiles - the catalog in force.
 */
export function matchProfile(providerId: string, modelId: string, profiles: readonly RateProfile[]): RateProfile | undefined {
  const providerName = PROVIDER_ALIASES[providerId] ?? providerId
  const candidates = profiles.filter(profile => profile.provider === providerName)
  if (candidates.length === 0) return undefined
  const folded = normalizeModelId(modelId)
  for (const mapping of FOLDED_MAPPINGS) {
    if (mapping.provider !== providerName) continue
    if (mapping.folded !== '' && !folded.startsWith(mapping.folded)) continue
    const profile = candidates.find(candidate => candidate.id === mapping.profile)
    if (profile !== undefined) return profile
  }
  return undefined
}
