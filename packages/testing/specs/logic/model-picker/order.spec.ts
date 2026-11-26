/**
 * Model-row ordering within one provider group (D5, D79).
 *
 * @capability model-picker
 * @features model
 * @risk Recognised vendor rows and unbranded rows interleave unpredictably, vendor families split apart, or a provider's curated catalog order inside one vendor is scrambled.
 */
import { expect, test } from 'vitest'
import { MODEL_COPY_DOCUMENT, byModelId, indexModelCopy, modelComparator, resolveModelBrand } from '@dsh-claude-style/client/pure'
import type { HostModelEntry } from '@dsh-claude-style/contracts/services'

const copyIndex = indexModelCopy(MODEL_COPY_DOCUMENT)
const realBrand = (id: unknown, name: unknown) => resolveModelBrand(copyIndex, id, name)

test('recognised brands precede the unbranded second tier, brands sort by brand id, each brand keeps catalog order, and the second tier sorts by model id', () => {
  const rows: HostModelEntry[] = [
    { id: 'zeta-plain', name: 'Zeta Plain' },
    { id: 'openai/o3-mini', name: 'o3-mini' },
    { id: 'anthropic/claude-opus-4-6', name: 'Claude Opus 4.6' },
    { id: 'alpha-plain', name: 'Alpha Plain' },
    { id: 'openai/gpt-5', name: 'GPT-5' },
    { id: 'anthropic/claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    { id: 'anthropic/claude-haiku-4-5', name: 'Claude Haiku 4.5' },
  ]

  expect(rows.slice().sort(modelComparator(realBrand)).map(row => row.id)).toEqual([
    'anthropic/claude-opus-4-6',
    'anthropic/claude-sonnet-4-6',
    'anthropic/claude-haiku-4-5',
    'openai/o3-mini',
    'openai/gpt-5',
    'alpha-plain',
    'zeta-plain',
  ])
})

test('display-name brand fallback groups opaque gateway ids with their vendor in catalog order', () => {
  const rows: HostModelEntry[] = [
    { id: 'opaque-z', name: 'Custom Gateway Model Z' },
    { id: 'route-2', name: 'DeepSeek R1' },
    { id: 'opaque-a', name: 'Custom Gateway Model A' },
    { id: 'route-1', name: 'DeepSeek V3' },
  ]

  expect(rows.slice().sort(modelComparator(realBrand)).map(row => row.id)).toEqual([
    'route-2',
    'route-1',
    'opaque-a',
    'opaque-z',
  ])
})

test('when no brand is recognised (or before model copy loads), all rows sort by model id', () => {
  const rows: HostModelEntry[] = [
    { id: 'c-model', name: 'C' },
    { id: 'a-model', name: 'A' },
    { id: 'b-model', name: 'B' },
  ]

  expect(rows.slice().sort(modelComparator(() => null)).map(row => row.id))
    .toEqual(rows.slice().sort(byModelId).map(row => row.id))
})
