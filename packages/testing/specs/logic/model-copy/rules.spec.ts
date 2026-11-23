/**
 * Rule precedence, boundary guards and vendor coverage in the shipped copy
 * document (D5, D79).
 *
 * @capability model-copy
 * @features model
 * @risk Model rules misclassify third-party models, lose vendor copy to generic fallbacks, or hide copy because brand and family tables disagree.
 */
import { expect, test } from 'vitest'
import { MODEL_COPY_DOCUMENT as document, indexModelCopy, resolveModelBrand, resolveModelCopy } from '@dsh-claude-style/client/pure'

const index = indexModelCopy(document)
const familyText = (match: string) => {
  const rule = document.families.find((entry) => entry.match === match)
  expect(rule, `missing family rule ${match}`).toBeDefined()
  return rule!.text
}

test('Nano Banana and Gemini 4 elemental lines resolve before generic Gemini copy', () => {
  expect(resolveModelBrand(index, 'gemini-nano-banana-2.1', 'Gemini Nano Banana 2.1')).toBe('nanobanana')
  expect(resolveModelCopy(index, 'google', 'gemini-nano-banana-2.1', '')).toEqual(familyText('nano-?banana'))
  expect(resolveModelCopy(index, 'google', 'gemini-4-carbon', '')).toEqual(familyText('gemini.*carbon'))
  expect(resolveModelCopy(index, 'google', 'gemini-4-neon', '')).toEqual(familyText('gemini.*neon'))
  expect(resolveModelCopy(index, 'google', 'gemini-4-hydrogen', '')).toEqual(familyText('gemini.*hydrogen'))
  expect(resolveModelCopy(index, 'google', 'gemini-4-argon', '')).toEqual(familyText('gemini.*argon'))
})

test('GPT-6 Terra, GPT image models, GPT-5.4 mini/nano and Codex resolve cleanly', () => {
  expect(resolveModelCopy(index, 'openai', 'gpt-6.1-terra', '')).toEqual(familyText('gpt.*terra'))
  expect(resolveModelCopy(index, 'openai', 'gpt-5.6-terra', '')).toEqual(familyText('gpt.*terra'))
  expect(resolveModelCopy(index, 'openai', 'gpt-5.4-image-2', '')).toEqual(familyText('gpt.*image|chatgpt.*image'))
  expect(resolveModelCopy(index, 'openai', 'gpt-5.4-mini', '')).toEqual(familyText('gpt[._-]?5[._-]?4.*(mini|nano)'))
  expect(resolveModelCopy(index, 'openai', 'gpt-5.4', '')).toEqual(familyText('gpt[._-]?5[._-]?4(?!\\d)'))
  expect(resolveModelBrand(index, 'codex-mini', 'Codex Mini')).toBe('openai')
  expect(resolveModelCopy(index, 'openai', 'codex-mini', '')).toEqual(familyText('codex'))
})

test('Short aliases stay bounded and do not claim third-party models', () => {
  for (const id of ['bge-m3', 'bge-reranker-v2-m3', 'humain-m3-preview', 'baichuan-m2-32b', 'midm-k-3.0-pro']) {
    expect(resolveModelBrand(index, id, '')).toBeNull()
  }
  expect(resolveModelBrand(index, 'qwen3.8-27b-kimiko', '')).toBe('qwen')
  expect(resolveModelCopy(index, 'qwen', 'qwen3.8-27b-kimiko', '')).toEqual(familyText('qwen.*[-_]([0-9](\\.\\d+)?|[12]\\d|3[0-2])b($|[^a-z])'))

  expect(resolveModelBrand(index, 'cn:m3', '')).toBe('minimax')
  expect(resolveModelCopy(index, '', 'minimax-m-3-0', '')).toEqual(familyText('minimax.*m[._-]?3|(^|[:/])m3($|[._-])'))
  expect(resolveModelBrand(index, 'm2-her', '')).toBe('minimax')
  expect(resolveModelCopy(index, '', 'm2-her', '')).toEqual(familyText('minimax|(^|[:/])m2($|[._-])'))

  expect(resolveModelBrand(index, 'kimi-k3p1-pro', '')).toBe('kimi')
  expect(resolveModelCopy(index, '', 'kimi-k3p1-pro', '')).toEqual(familyText('(^|[^a-z0-9])kimi.*k3[._p-]?1(?!\\d)|(^|[^a-z0-9])k3[._p-]?1(?!\\d)'))
  expect(resolveModelBrand(index, 'morph-kimik3', '')).toBe('kimi')
  expect(resolveModelCopy(index, '', 'morph-kimik3', '')).toEqual(familyText('(^|[^a-z0-9])kimi.*k-?3|(^|[^a-z0-9])k3($|[^0-9a-z])'))
  expect(resolveModelCopy(index, '', 'glm-5p3-flash', '')).toEqual(familyText('glm[._-]?5[._p-]?3.*flash'))
})

test('Distilled third-party models keep their own base family', () => {
  expect(resolveModelBrand(index, 'gemma-4-31b-claude-4.6-opus-reasoning-distilled', '')).toBe('gemma')
  expect(resolveModelCopy(index, '', 'gemma-4-31b-claude-4.6-opus-reasoning-distilled', '')).toEqual(familyText('gemma'))
  expect(resolveModelBrand(index, 'qwen3.5-27b-claude-4.6-opus-reasoning-distilled-derestricted', '')).toBe('qwen')
  expect(resolveModelCopy(index, '', 'deepseek-v4-pro-qwen3.5-9b-uncensored-heretic', '')).toEqual(familyText('deepseek'))
})

test('Vendor lines with brand marks carry matching family copy and compact size rules stay bounded', () => {
  expect(resolveModelCopy(index, '', 'mimo-v2.5-pro', '')).toEqual(familyText('mimo'))
  expect(resolveModelCopy(index, '', 'mimo-v2-6-flash', '')).toEqual(familyText('mimo.*(flash|lite)'))
  expect(resolveModelCopy(index, '', 'longcat-2.5', '')).toEqual(familyText('longcat'))
  expect(resolveModelCopy(index, '', 'beam-1.0-501b-a23b', '')).toEqual(familyText('(^|[^a-z0-9])beam($|[^a-z0-9])'))
  expect(resolveModelCopy(index, '', 'hy-mt2-30b-a3b', '')).toEqual(familyText('(^|[^a-z0-9])hy-?mt|hunyuan.*mt'))
  expect(resolveModelCopy(index, '', 'muse-spark-open-816b-a42b', '')).toEqual(familyText('muse-spark.*open'))
  expect(resolveModelCopy(index, '', 'mercury-coder-small', '')).toEqual(familyText('mercury.*coder'))
  expect(resolveModelCopy(index, '', 'mercury-edit-2', '')).toEqual(familyText('mercury|inception'))
  expect(resolveModelCopy(index, '', 'grok-4-1-fast-non-reasoning', '')).toEqual(familyText('grok[._-]?4.*(non-reasoning|fast)'))
  expect(resolveModelCopy(index, '', 'qwen-4-max', '')).toEqual(familyText('qwen[._-]?4(?!\\d).*max'))
  expect(resolveModelCopy(index, '', 'qwen-2.5-72b-instruct', '')).toEqual(familyText('qwen'))
  expect(resolveModelCopy(index, '', 'custom-405b', '')).toBeNull()
})
