/**
 * The strings a copy or brand rule reads for one catalog model: the id the host
 * ships, then the display name the reader set beside it. A gateway's id is
 * often an opaque alias, so the name is the only field that says which model a
 * row is (D79).
 *
 * @capability model-copy
 * @features model
 * @risk A model listed under a gateway's own id keeps an empty description line and draws no vendor mark, and a row's name can claim the copy of a model another rule already holds.
 */
import { expect, test } from 'vitest'
import { indexModelCopy, modelIdentity, resolveModelBrand, resolveModelCopy } from '@dsh-claude-style/client/pure'

/** A document shaped as the build validated one, small enough to read. */
const DOCUMENT = {
  fallback: 'en',
  brands: {
    providers: {},
    models: [
      { match: 'kimi|(^|[^a-z0-9])k3($|-)', brand: 'kimi' },
      { match: 'qwen', brand: 'qwen' },
    ],
  },
  families: [
    { match: 'qwen.*plus', text: { zh: '均衡档。', en: 'The balanced tier.' } },
    { match: 'qwen', text: { zh: '通义系列。', en: 'The Qwen line.' } },
    { match: 'kimi', text: { zh: '月之暗面。', en: 'The Kimi line.' } },
  ],
  tiers: [
    { match: 'flash', text: { zh: '快。', en: 'Fast.' } },
  ],
}

const index = indexModelCopy(DOCUMENT)

test('the id is read before the name, so a rename never moves a claimed row', () => {
  expect(modelIdentity('kimi-k3', 'Kimi K3')).toEqual(['kimi-k3', 'kimi k3'])
  // A name that repeats the id adds no second candidate.
  expect(modelIdentity('kimi-k3', 'kimi-k3')).toEqual(['kimi-k3'])
  // A row with no name of its own is read by its id alone.
  expect(modelIdentity('kimi-k3', '')).toEqual(['kimi-k3'])
  expect(modelIdentity('kimi-k3', undefined)).toEqual(['kimi-k3'])
})

test('a row whose id is an opaque alias is claimed through its display name', () => {
  // The gateway's own spelling says nothing; the reader's name is the model.
  expect(resolveModelCopy(index, 'kmodel', 'kmodel', 'kimi-k2.6')).toEqual({ zh: '月之暗面。', en: 'The Kimi line.' })
  expect(resolveModelBrand(index, 'kmodel', 'Kimi K2.6')).toBe('kimi')
  // The same row with no name at all stays unclaimed: nothing is invented.
  expect(resolveModelCopy(index, 'kmodel', 'kmodel', '')).toBeNull()
  expect(resolveModelBrand(index, 'kmodel', '')).toBeNull()
})

test('a family rule outranks a tier rule, and the name is read by both', () => {
  expect(resolveModelCopy(index, 'qoder', 'dashscope_qmodel', 'qwen-3.6-plus')).toEqual({ zh: '均衡档。', en: 'The balanced tier.' })
  // An id no family claims still reaches the tier rules through the name.
  expect(resolveModelCopy(index, 'qoder', 'dashscope_qmodel', 'some-flash')).toEqual({ zh: '快。', en: 'Fast.' })
})

test('the provider route is read for the id alone, never for the name', () => {
  expect(resolveModelCopy(index, 'qwen', 'qwen-3.6-plus', '')).toEqual({ zh: '均衡档。', en: 'The balanced tier.' })
  // A route with no provider said reads as the id alone, never as `/id`.
  expect(resolveModelCopy(index, '', 'qwen-3.6-plus', '')).toEqual({ zh: '均衡档。', en: 'The balanced tier.' })
})

test('the row\'s own id wins over the name beside it', () => {
  // The name's broad rule must not claim a row whose id a narrow rule holds.
  expect(resolveModelCopy(index, '', 'qwen-3.6-flash', 'qwen-3.6-plus')).toEqual({ zh: '通义系列。', en: 'The Qwen line.' })
})

test('a document that never arrived claims nothing', () => {
  expect(resolveModelCopy(null, 'qwen', 'qwen-3.6-plus', 'Qwen 3.6 Plus')).toBeNull()
  expect(resolveModelBrand(null, 'qwen', 'Qwen')).toBeNull()
  expect(indexModelCopy(null)).toBeNull()
})
