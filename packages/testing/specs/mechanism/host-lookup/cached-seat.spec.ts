/**
 * A host seat the skin reads on every pass is found once and kept (D9): the page
 * is queried again only when the kept element leaves, an earlier match arrives,
 * or a missing seat mounts. The whole-document query count is the contract here.
 *
 * @capability host-lookup
 * @features engine
 * @risk A long conversation slows to a crawl because every frame walks the whole page for a seat the skin already holds, or a seat the host mounts late is never found.
 */
import { afterEach, expect, test } from 'vitest'
import { cacheFirstMatch } from '@dsh-claude-style/engine/host'

/** A batch of mutations is delivered on the microtask queue. */
const settle = () => new Promise(resolve => setTimeout(resolve, 0))

afterEach(() => {
  document.body.replaceChildren()
})

/** Count the whole-document queries made until the returned function is called. */
function countQueries() {
  const seen: string[] = []
  const original = Document.prototype.querySelector
  // cost: D9 — the whole-document query count is what this accessor promises.
  Document.prototype.querySelector = function patched(selector: string) {
    seen.push(selector)
    return original.call(this, selector)
  }
  return () => {
    // cost: D9 — the browser's own method back once the count is read.
    Document.prototype.querySelector = original
    return seen
  }
}

function seat(attribute: string) {
  const element = document.createElement('div')
  element.setAttribute(attribute, '')
  return element
}

test('a seat the page does not carry is queried once, not once per read', async () => {
  const stop = countQueries()
  const find = cacheFirstMatch<HTMLElement>('[data-test-absent]')
  expect(find()).toBe(null)
  expect(find()).toBe(null)
  expect(find()).toBe(null)
  await settle()
  expect(find()).toBe(null)
  expect(stop().length).toBe(1)
})

test('a seat the page carries is queried once and then kept', () => {
  const card = seat('data-test-card')
  document.body.append(card)
  const stop = countQueries()
  const find = cacheFirstMatch<HTMLElement>('[data-test-card]')
  expect(find()).toBe(card)
  expect(find()).toBe(card)
  expect(stop().length).toBe(1)
})

test('a kept seat is reused across unrelated mutation batches', async () => {
  const card = seat('data-test-stable')
  document.body.append(card)
  const stop = countQueries()
  const find = cacheFirstMatch<HTMLElement>('[data-test-stable]')
  expect(find()).toBe(card)
  document.body.append(document.createElement('span'))
  await settle()
  expect(find()).toBe(card)
  document.body.append(document.createElement('span'))
  await settle()
  expect(find()).toBe(card)
  expect(stop()).toEqual(['[data-test-stable]'])
})

test('a kept match is re-queried once an earlier match arrives', () => {
  const later = seat('data-test-early')
  document.body.append(later)
  const stop = countQueries()
  const find = cacheFirstMatch<HTMLElement>('[data-test-early]')
  expect(find()).toBe(later)
  const earlier = seat('data-test-early')
  document.body.insertBefore(earlier, later)
  expect(find()).toBe(earlier)
  expect(stop().length).toBe(2)
})

test('a kept match is re-queried once the host replaces it', () => {
  const first = seat('data-test-replaced')
  document.body.append(first)
  const stop = countQueries()
  const find = cacheFirstMatch<HTMLElement>('[data-test-replaced]')
  expect(find()).toBe(first)
  const second = seat('data-test-replaced')
  first.replaceWith(second)
  expect(find()).toBe(second)
  expect(stop().length).toBe(2)
})

test('a seat that mounts later is found after the batch that added it', async () => {
  const find = cacheFirstMatch<HTMLElement>('[data-test-late]')
  expect(find()).toBe(null)
  const late = seat('data-test-late')
  document.body.append(late)
  await settle()
  expect(find()).toBe(late)
})
