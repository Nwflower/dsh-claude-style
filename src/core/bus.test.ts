import { afterEach, expect, test } from 'vitest'
import { QUIET_ATTR } from '../constants'
import { observeSize, subscribeMutations } from './bus'

const settle = () => new Promise(resolve => setTimeout(resolve, 0))
const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

const cleanups: (() => void)[] = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  document.body.replaceChildren()
})

function host() {
  const root = document.createElement('div')
  document.body.appendChild(root)
  return root
}

test('each subscription receives exactly the records its own options select', async () => {
  const root = host()
  const child = document.createElement('span')
  root.appendChild(child)
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
  child.appendChild(text)
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
  root.appendChild(child)
  const seen: Node[] = []
  cleanups.push(subscribeMutations(root, { childList: true, subtree: true }, () => {}))
  cleanups.push(subscribeMutations(root, { childList: true }, records => seen.push(...records.map(record => record.target))))
  child.appendChild(document.createElement('i'))
  root.appendChild(document.createElement('b'))
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
  root.appendChild(document.createElement('div'))
  await settle()
  expect(calls).toEqual(['first', 'third'])
})

test('skipQuiet leaves the skin\'s quiet writes out', async () => {
  const root = host()
  const quiet = document.createElement('div')
  quiet.setAttribute(QUIET_ATTR, '')
  const seen: MutationRecord[] = []
  cleanups.push(subscribeMutations(root, { childList: true, subtree: true, skipQuiet: true }, records => seen.push(...records)))
  root.appendChild(quiet)
  quiet.appendChild(document.createElement('span'))
  await settle()
  expect(seen).toHaveLength(0)
  root.appendChild(document.createElement('p'))
  await settle()
  expect(seen).toHaveLength(1)
})

test('records gathered before a subscription change still reach their subscribers', async () => {
  const root = host()
  const seen: MutationRecord[] = []
  cleanups.push(subscribeMutations(root, { childList: true }, records => seen.push(...records)))
  root.appendChild(document.createElement('div'))
  // A second subscription re-attaches the observer before the first batch is delivered.
  cleanups.push(subscribeMutations(document.body, { attributeFilter: ['data-x'] }, () => {}))
  await settle()
  expect(seen).toHaveLength(1)
})

test('a page-wide subscription hears a change made inside a node removed in the same batch', async () => {
  const root = host()
  const inner = document.createElement('div')
  root.appendChild(inner)
  await settle()
  const seen: string[] = []
  cleanups.push(subscribeMutations(document.body, { childList: true, subtree: true }, records => seen.push(...records.map(record => (record.target as Element).tagName))))
  inner.appendChild(document.createElement('span'))
  root.remove()
  await settle()
  expect(seen).toContain('DIV')
  expect(seen).toContain('BODY')
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
