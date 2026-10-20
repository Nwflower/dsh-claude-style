/**
 * The observation bus every feature watches the page through (D40): one
 * observer per kind, each subscription handed exactly the records its own
 * options select, in subscription order, with the skin's quiet writes left out
 * where asked; size subscriptions hear the current size first and run after the
 * host's own observers where asked; match registries follow the page in
 * document order.
 *
 * @capability page-observation
 * @features engine
 * @risk A feature misses the host's change and the page stops following the conversation, or reacts to its own writes in a loop that never lets the page idle.
 */
import { afterEach, expect, test } from 'vitest'
import { observeMatches, observeSize, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { QUIET_ATTR } from '../../fixtures/vocabulary'

/** The attribute these specs match on; the registry is told the selector. */
const PROBE = 'data-test-probe'
const settle = () => new Promise(resolve => setTimeout(resolve, 0))
const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

const cleanups: (() => void)[] = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  document.body.replaceChildren()
})

function host() {
  const root = document.createElement('div')
  document.body.append(root)
  return root
}

function probed(tag: string) {
  const element = document.createElement(tag)
  element.setAttribute(PROBE, '')
  return element
}

test('each subscription receives exactly the records its own options select', async () => {
  const root = host()
  const child = document.createElement('span')
  root.append(child)
  const seen: Record<string, string[]> = { childList: [], ariaLabel: [], anyAttribute: [], text: [] }
  const describe = (record: MutationRecord) => record.type === 'attributes' ? `attr:${record.attributeName}` : record.type
  cleanups.push(subscribeMutations(root, { childList: true, subtree: true }, records => seen.childList.push(...records.map(describe))))
  cleanups.push(subscribeMutations(root, { attributeFilter: ['aria-label'], subtree: true }, records => seen.ariaLabel.push(...records.map(describe))))
  cleanups.push(subscribeMutations(child, { attributes: true }, records => seen.anyAttribute.push(...records.map(describe))))
  cleanups.push(subscribeMutations(root, { characterData: true, subtree: true }, records => seen.text.push(...records.map(describe))))
  child.setAttribute('aria-label', 'a')
  child.setAttribute('title', 'b')
  root.setAttribute('title', 'c')
  const text = document.createTextNode('x')
  child.append(text)
  text.data = 'y'
  await settle()
  expect(seen.childList).toEqual(['childList'])
  expect(seen.ariaLabel).toEqual(['attr:aria-label'])
  expect(seen.anyAttribute).toEqual(['attr:aria-label', 'attr:title'])
  expect(seen.text).toEqual(['characterData'])
})

test('a subscription without subtree hears its target alone', async () => {
  const root = host()
  const child = document.createElement('div')
  root.append(child)
  const seen: Node[] = []
  cleanups.push(subscribeMutations(root, { childList: true, subtree: true }, () => {}))
  cleanups.push(subscribeMutations(root, { childList: true }, records => seen.push(...records.map(record => record.target))))
  child.append(document.createElement('i'))
  root.append(document.createElement('b'))
  await settle()
  expect(seen).toEqual([root])
})

test('callbacks run in subscription order, and one removed earlier in the batch is not called', async () => {
  const root = host()
  const calls: string[] = []
  let removeSecond = () => {}
  cleanups.push(subscribeMutations(root, { childList: true }, () => { calls.push('first'); removeSecond() }))
  removeSecond = subscribeMutations(root, { childList: true }, () => calls.push('second'))
  cleanups.push(subscribeMutations(root, { childList: true }, () => calls.push('third')))
  root.append(document.createElement('div'))
  await settle()
  expect(calls).toEqual(['first', 'third'])
})

test('skipQuiet leaves the skin\'s quiet writes out', async () => {
  const root = host()
  const quiet = document.createElement('div')
  quiet.setAttribute(QUIET_ATTR, '')
  const seen: MutationRecord[] = []
  cleanups.push(subscribeMutations(root, { childList: true, subtree: true, skipQuiet: true }, records => seen.push(...records)))
  root.append(quiet)
  quiet.append(document.createElement('span'))
  await settle()
  expect(seen).toHaveLength(0)
  root.append(document.createElement('p'))
  await settle()
  expect(seen).toHaveLength(1)
})

test('records gathered before a subscription change still reach their subscribers', async () => {
  const root = host()
  const seen: MutationRecord[] = []
  cleanups.push(subscribeMutations(root, { childList: true }, records => seen.push(...records)))
  root.append(document.createElement('div'))
  // A second subscription re-attaches the observer before the first batch is delivered.
  cleanups.push(subscribeMutations(document.body, { attributeFilter: ['data-test-other'] }, () => {}))
  await settle()
  expect(seen).toHaveLength(1)
})

test('a page-wide subscription hears a change made inside a node removed in the same batch', async () => {
  const root = host()
  const inner = document.createElement('div')
  root.append(inner)
  await settle()
  const seen: string[] = []
  cleanups.push(subscribeMutations(document.body, { childList: true, subtree: true }, records => seen.push(...records.map(record => (record.target as Element).tagName))))
  inner.append(document.createElement('span'))
  root.remove()
  await settle()
  expect(seen).toContain('DIV')
  expect(seen).toContain('BODY')
})

test('a subscription hears nothing that changed before it was made', async () => {
  const root = host()
  const seen: MutationRecord[] = []
  cleanups.push(subscribeMutations(document.body, { childList: true, subtree: true }, () => {}))
  root.append(document.createElement('div'))
  cleanups.push(subscribeMutations(root, { childList: true }, records => seen.push(...records)))
  await settle()
  expect(seen).toHaveLength(0)
})

test('a size subscription hears the current size first, a second one on the same element too', async () => {
  const root = host()
  root.style.width = '100px'
  root.style.height = '10px'
  const first: number[] = []
  const second: number[] = []
  cleanups.push(observeSize(root, entries => first.push(entries[0].contentRect.width)))
  await nextFrame()
  cleanups.push(observeSize(root, entries => second.push(entries[0].contentRect.width)))
  await nextFrame()
  root.style.width = '140px'
  await nextFrame()
  expect(first[0]).toBe(100)
  expect(second[0]).toBe(100)
  expect(first.at(-1)).toBe(140)
  expect(second.at(-1)).toBe(140)
})

test('an afterHost subscription runs after a resize observer made before it', async () => {
  const root = host()
  root.style.height = '10px'
  const calls: string[] = []
  // The skin's early observer exists from install; the host makes its own at a column's mount.
  cleanups.push(observeSize(root, () => calls.push('early')))
  const hostObserver = new ResizeObserver(() => calls.push('host'))
  hostObserver.observe(root)
  cleanups.push(() => hostObserver.disconnect())
  cleanups.push(observeSize(root, () => calls.push('after host'), { afterHost: true }))
  await nextFrame()
  calls.length = 0
  root.style.height = '30px'
  await nextFrame()
  expect(calls).toEqual(['early', 'host', 'after host'])
})

test('a subscription over several elements hears one batch per frame, holding only its own elements', async () => {
  const a = host()
  const b = host()
  const other = host()
  for (const element of [a, b, other]) element.style.height = '10px'
  const batches: Element[][] = []
  cleanups.push(observeSize([a, b], entries => batches.push(entries.map(entry => entry.target))))
  cleanups.push(observeSize(other, () => {}))
  await nextFrame()
  batches.length = 0
  for (const element of [a, b, other]) element.style.height = '20px'
  await nextFrame()
  expect(batches).toEqual([[a, b]])
})

test('unsubscribing the last size subscription stops the reports', async () => {
  const root = host()
  root.style.height = '10px'
  const seen: number[] = []
  const stop = observeSize(root, entries => seen.push(entries[0].contentRect.height))
  await nextFrame()
  stop()
  root.style.height = '50px'
  await nextFrame()
  expect(seen).toEqual([10])
})

test('a match registry hands out the current matches in document order and follows the page', async () => {
  const root = host()
  const first = probed('i')
  const second = probed('b')
  root.append(second, first)
  const matches = observeMatches<HTMLElement>(`[${PROBE}]`)
  cleanups.push(() => matches.release())
  expect(matches.all()).toEqual([second, first])
  const third = probed('u')
  first.append(third)
  await settle()
  expect(matches.all()).toEqual([second, first, third])
  first.remove()
  expect(matches.all()).toEqual([second])
})

test('a match carried into the page with its own subtree in one batch is registered', async () => {
  const root = host()
  const matches = observeMatches<HTMLElement>(`[${PROBE}]`)
  cleanups.push(() => matches.release())
  const carrier = document.createElement('section')
  const inner = probed('i')
  const sibling = probed('b')
  // One batch, as a mount is: the carrier joins the page, then its own children land in it.
  root.append(carrier)
  carrier.append(inner, sibling)
  await settle()
  expect(matches.all()).toEqual([inner, sibling])
  // The carrier arrived after the node it holds; the node keeps its place.
  const later = document.createElement('div')
  const inside = probed('u')
  root.append(inside)
  later.append(inside)
  root.append(later)
  await settle()
  expect(matches.all()).toEqual([inner, sibling, inside])
})

test('a match registry keeps the same array until a match changes', async () => {
  const root = host()
  const only = probed('i')
  root.append(only)
  const matches = observeMatches<HTMLElement>(`[${PROBE}]`)
  cleanups.push(() => matches.release())
  expect(matches.all()).toBe(matches.all())
  const added = probed('b')
  root.append(added)
  await settle()
  expect(matches.all()).toEqual([only, added])
})

test('two readers of one selector share a registry, and the last release takes it down', async () => {
  const root = host()
  const first = observeMatches<HTMLElement>(`[${PROBE}]`)
  const second = observeMatches<HTMLElement>(`[${PROBE}]`)
  const added = probed('i')
  root.append(added)
  await settle()
  expect(first.all()).toEqual([added])
  expect(second.all()).toEqual([added])
  first.release()
  const later = probed('b')
  root.append(later)
  await settle()
  expect(second.all()).toEqual([added, later])
  second.release()
  // A reader taken after the last release resolves the document again.
  const third = observeMatches<HTMLElement>(`[${PROBE}]`)
  cleanups.push(() => third.release())
  expect(third.all()).toEqual([added, later])
})

test('a match added inside a quiet container is registered too', async () => {
  const root = host()
  const quiet = document.createElement('div')
  quiet.setAttribute(QUIET_ATTR, '')
  root.append(quiet)
  const matches = observeMatches<HTMLElement>(`[${PROBE}]`)
  cleanups.push(() => matches.release())
  const added = probed('i')
  quiet.append(added)
  await settle()
  expect(matches.all()).toEqual([added])
})

test('a registry listener hears the change in the batch that made it, before the next frame', async () => {
  const root = host()
  let heard = 0
  const matches = observeMatches<HTMLElement>(`[${PROBE}]`, () => { heard += 1 })
  cleanups.push(() => matches.release())
  root.append(probed('i'))
  // The observer's own callback is a microtask of the task that changed the page.
  await Promise.resolve()
  expect(heard).toBe(1)
})

test('a registry listener hears every change of the set and nothing after its release', async () => {
  const root = host()
  const heard: number[] = []
  const matches = observeMatches<HTMLElement>(`[${PROBE}]`, () => heard.push(matches.all().length))
  root.append(probed('i'))
  await settle()
  root.append(probed('b'))
  await settle()
  expect(heard).toEqual([1, 2])
  matches.release()
  root.append(probed('u'))
  await settle()
  expect(heard).toEqual([1, 2])
})
