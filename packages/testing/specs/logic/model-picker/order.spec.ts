/**
 * Model-row ordering within one provider group (D5, D79).
 *
 * @capability model-picker
 * @features model
 * @risk Recognised vendor rows and plain-text rows interleave unpredictably, or a custom provider/model order is ignored by either picker level.
 */
import { expect, test } from 'vitest'
import { byModelId, modelComparator } from '@dsh-claude-style/client/pure'
import type { HostModelEntry } from '@dsh-claude-style/contracts/services'

const rows: HostModelEntry[] = [
  { id: 'unknown-b', name: 'Unknown B' },
  { id: 'known-b', name: 'Known B' },
  { id: 'unknown-a', name: 'Unknown A' },
  { id: 'known-a', name: 'Known A' },
]
const brand = (id: unknown) => String(id).startsWith('known-') ? 'known' : null
const ids = (order: 'id' | 'brand' | 'catalog' | 'custom', custom: string[] = []) => rows.slice()
  .sort(modelComparator(order, 'provider', custom, brand))
  .map(row => row.id)

test('id order remains the compatible default', () => {
  expect(ids('id')).toEqual(['known-a', 'known-b', 'unknown-a', 'unknown-b'])
  expect(rows.slice().sort(byModelId).map(row => row.id)).toEqual(ids('id'))
})

test('brand order groups recognised lockups before plain names', () => {
  expect(ids('brand')).toEqual(['known-a', 'known-b', 'unknown-a', 'unknown-b'])
})

test('catalog order preserves the provider sequence', () => {
  expect(ids('catalog')).toEqual(rows.map(row => row.id))
})

test('custom order ranks provider/model rows and leaves the rest in id order', () => {
  expect(ids('custom', ['provider/unknown-b', 'provider/known-b'])).toEqual(['unknown-b', 'known-b', 'known-a', 'unknown-a'])
  expect(ids('custom', ['other/unknown-b'])).toEqual(ids('id'))
})
