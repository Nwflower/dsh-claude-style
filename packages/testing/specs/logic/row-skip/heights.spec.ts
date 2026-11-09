/**
 * A row's kept height is looked up by what the row is, not by which element it
 * was: the host unmounts and mounts the same messages again on a session
 * switch, so the key has to survive that, and a node key shared by two rows of
 * one step has to tell them apart. The cache keeps the most recently seen
 * heights and drops the oldest, so a long-lived page does not grow without end.
 *
 * @capability row-skip
 * @features row-skip
 * @risk A kept height answers for another row, or never leaves the cache: the transcript stands at a wrong scroll height on a switch, or the page's memory follows the number of messages ever seen.
 */
import { expect, test } from 'vitest'
import { CHAT_GROUP_PART_ATTRIBUTE, CHAT_NODE_KEY_ATTRIBUTE, FLOW_KIND_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { createRowHeightCache, ROW_HEIGHT_CACHE_LIMIT, rowHeightKey } from '@dsh-claude-style/client/pure'

function row(nodeKey: string | null, kind: string, part?: string) {
  const element = document.createElement('div')
  if (nodeKey !== null) element.setAttribute(CHAT_NODE_KEY_ATTRIBUTE, nodeKey)
  element.setAttribute(FLOW_KIND_ATTRIBUTE, kind)
  if (part !== undefined) element.setAttribute(CHAT_GROUP_PART_ATTRIBUTE, part)
  return element
}

test('a row without a node key keeps nothing', () => {
  expect(rowHeightKey(row(null, 'assistant-step'))).toBeNull()
})

test('two rows of one step stay apart by kind and group part', () => {
  const reasoning = rowHeightKey(row('14:assistant-step4:1', 'assistant-step', 'reasoning'))
  const answer = rowHeightKey(row('14:assistant-step4:1', 'assistant-step', 'response'))
  expect(reasoning).not.toBeNull()
  expect(answer).not.toBeNull()
  expect(reasoning).not.toBe(answer)
})

test('the same row on a later mount answers to the same key', () => {
  const first = row('13:input-message', 'user')
  const second = row('13:input-message', 'user')
  expect(rowHeightKey(second)).toBe(rowHeightKey(first))
})

test('a kept height is found again and a missing one is not invented', () => {
  const cache = createRowHeightCache()
  cache.set('a', 636)
  expect(cache.get('a')).toBe(636)
  expect(cache.get('b')).toBeUndefined()
  cache.clear()
  expect(cache.get('a')).toBeUndefined()
})

test('a height that is not a positive number is not kept', () => {
  const cache = createRowHeightCache()
  cache.set('zero', 0)
  cache.set('negative', -4)
  cache.set('unreadable', Number.NaN)
  expect(cache.size).toBe(0)
})

test('the oldest heights leave past the limit, the most recently read stay', () => {
  const cache = createRowHeightCache(3)
  cache.set('a', 10)
  cache.set('b', 20)
  cache.set('c', 30)
  // Reading a refreshes it, so b is the oldest when the fourth arrives.
  expect(cache.get('a')).toBe(10)
  cache.set('d', 40)
  expect(cache.size).toBe(3)
  expect(cache.get('b')).toBeUndefined()
  expect(cache.get('a')).toBe(10)
  expect(cache.get('c')).toBe(30)
  expect(cache.get('d')).toBe(40)
})

test('the shipped cache holds a few hundred rows of many sessions', () => {
  expect(ROW_HEIGHT_CACHE_LIMIT).toBeGreaterThanOrEqual(1024)
})
