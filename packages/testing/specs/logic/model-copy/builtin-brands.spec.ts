/**
 * Built-in vendor coverage for SenseNova and SCNet (D5, D79).
 *
 * @capability model-copy
 * @features model
 * @risk SenseNova falls through to Amazon Nova or a tier-only description, and SCNet loses its vendor mark and copy.
 */
import { expect, test } from 'vitest'
import { MODEL_COPY_DOCUMENT as document, indexModelCopy, resolveModelBrand, resolveModelCopy } from '@dsh-claude-style/client/pure'

const index = indexModelCopy(document)
const copyFor = (match: string) => document.families.find((rule) => rule.match === match)?.text

test('SenseNova claims the whole name before Amazon Nova and carries vendor copy', () => {
  expect(resolveModelBrand(index, 'sensenova-6.8-flash-lite', 'SenseNova 6.8 Flash Lite')).toBe('sensenova')
  expect(resolveModelCopy(index, 'sensenova', 'sensenova-6.8-flash-lite', 'SenseNova 6.8 Flash Lite')).toEqual(copyFor('sensenova'))
  expect(resolveModelBrand(index, 'nova-pro', 'Amazon Nova Pro')).toBe('nova')
})

test('SCNet has its own mark and vendor copy instead of the Max tier fallback', () => {
  expect(resolveModelBrand(index, 'scnet-max', 'SCNet-Max')).toBe('scnet')
  expect(resolveModelCopy(index, 'scnet', 'scnet-max', 'SCNet-Max')).toEqual(copyFor('(^|[^a-z0-9])scnet($|-)'))
})
