/**
 * A part name resolved to the host's class names selects the elements the part
 * tables name, and weighs one class (D101): inside its region and nowhere else,
 * outside a skipped subtree, a root name on the anchor's own children alone.
 * The marking pass reads the same tables element by element and reports the
 * class names it meets, so on one tree the two answers have to be the same set
 * for every part; a class name first met on a later element joins in the task
 * that reads it.
 *
 * @capability part-marking
 * @features engine
 * @risk A rule written for one host element paints a neighbour with the same class name in another region, or stops painting the element it was written for; a component the page shows for the first time keeps the host's own look.
 */
import { expect, test } from 'vitest'
import { installParts } from '@dsh-claude-style/engine/parts'
import { adoptPartClasses, finishSheet, onPartClasses, partSelector } from '@dsh-claude-style/engine/part-classes'
import type { PartClassVocabulary } from '@dsh-claude-style/engine/part-classes'
import { partNames, partRegions } from '@dsh-claude-style/engine/parts-table'
import { SIDEBAR_SLOT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { hostElement } from '../../fixtures/host-markup'
import { pageCleanups } from '../../fixtures/page'
import { partRegion } from '../../fixtures/part-region'
import { PART_ATTR, TEST_PARTS } from '../../fixtures/vocabulary'

const cleanups = pageCleanups()
const settle = () => new Promise(resolve => setTimeout(resolve, 0))
const ABSENT = 'test-absent'
/** The part a feature stamps by hand in this spec's vocabulary. */
const STAMPED = 'row'
const STAMP_ATTR = 'data-test-stamped-part'
const VOCABULARY: PartClassVocabulary = { ...TEST_PARTS, absent: ABSENT, stamp: STAMP_ATTR, stamped: [STAMPED] }
const sidebar = partRegion(SIDEBAR_SLOT_SELECTOR, TEST_PARTS)
/** The selector a sheet or a feature writes for one part. */
const written = (part: string) => `[${PART_ATTR}~="${part}"]`
/** The elements one part selects once resolved. */
const selected = (part: string) => [...document.querySelectorAll(partSelector(written(part)))]

/** One element carrying a local name under a hash, the way one host module names it. */
function box(local: string, hash: string, ...children: Node[]) {
  const element = document.createElement('div')
  element.className = `_${local}_${hash}`
  element.append(...children)
  return element
}

/** Hand the vocabulary over and start the marking pass, which reports the class names it meets. */
function followPage() {
  adoptPartClasses(VOCABULARY)
  cleanups.push(installParts(TEST_PARTS))
}

/**
 * Every region of the tables on one page: each of its names on the anchor's own
 * children and deeper, again inside the subtree the region skips, and every name
 * of every region once more outside all of them. Two hashes stand for two host
 * modules naming the same thing.
 */
function mountEveryRegion() {
  const page = document.createElement('div')
  const regions = partRegions(TEST_PARTS)
  const everyLocal = new Set(regions.flatMap(region => [...Object.keys(region.parts), ...Object.keys(region.rootParts ?? {})]))
  for (const local of everyLocal) page.append(box(local, 'ab'))
  for (const region of regions) {
    if (region.within === 'body') continue
    const locals = [...Object.keys(region.parts), ...Object.keys(region.rootParts ?? {})]
    for (const anchor of region.within.split(',').map(selector => hostElement(selector.trim()))) {
      const deeper = document.createElement('div')
      for (const local of locals) {
        anchor.append(box(local, 'ab'))
        deeper.append(box(local, 'cd'))
      }
      anchor.append(deeper)
      if (region.skip !== undefined) {
        const skipped = hostElement(region.skip)
        skipped.className = `_${locals[0]}_ab`
        for (const local of locals) skipped.append(box(local, 'cd', box(local, 'ab')))
        anchor.append(skipped)
      }
      page.append(anchor)
    }
  }
  document.body.append(page)
  return page
}

test('every part selects on one tree the elements the marking pass names', () => {
  mountEveryRegion()
  followPage()
  let total = 0
  for (const part of partNames(TEST_PARTS)) {
    const marked = [...document.querySelectorAll(written(part))]
    const resolved = selected(part)
    expect(resolved, part).toEqual(marked)
    total += resolved.length
  }
  // The tree names every part somewhere, so an empty answer on both sides would prove nothing.
  expect(total).toBeGreaterThan(partNames(TEST_PARTS).length)
})

test('a finished rule weighs one class, whatever region condition it carries', () => {
  const anchor = hostElement(SIDEBAR_SLOT_SELECTOR)
  const title = sidebar.box('title')
  title.classList.add('probe')
  anchor.append(title)
  document.body.append(anchor)
  followPage()
  const finished = finishSheet({ text: ['', '{order:1}'], rules: [[['', [sidebar.part('title'), 1] as const, '']]] })
  const sheet = document.createElement('style')
  document.head.append(sheet)
  cleanups.push(() => sheet.remove())
  // At equal weight the later rule wins, in either order.
  sheet.textContent = `${finished}.probe{order:2}`
  expect(getComputedStyle(title).order).toBe('2')
  sheet.textContent = `.probe{order:2}${finished}`
  expect(getComputedStyle(title).order).toBe('1')
})

test('a part the page shows no class for matches nothing, and its rule keeps its place', () => {
  followPage()
  expect(selected(sidebar.part('title'))).toHaveLength(0)
  const template = { text: ['a{order:1}', '{order:2}b{order:3}'], rules: [[['', [sidebar.part('title'), 1] as const, '']]] }
  expect(finishSheet(template)).toBe(`a{order:1}.${ABSENT}{order:2}b{order:3}`)
})

test('a class name first met on a later element joins its part in the task that reads it, and is announced once', async () => {
  const anchor = hostElement(SIDEBAR_SLOT_SELECTOR)
  const early = box('title', 'ab')
  anchor.append(early)
  document.body.append(anchor)
  followPage()
  let announced = 0
  cleanups.push(onPartClasses(() => { announced += 1 }))
  expect(selected(sidebar.part('title'))).toEqual([early])
  const late = box('title', 'zz')
  const again = box('title', 'ab')
  anchor.append(late, again)
  await settle()
  expect(announced).toBe(1)
  expect(selected(sidebar.part('title'))).toEqual([early, late, again])
  // A name the page has shown before is no news.
  anchor.append(box('title', 'zz'))
  await settle()
  expect(announced).toBe(1)
})

test('a class name that opens with a digit is written into the selector escaped', () => {
  const anchor = hostElement(SIDEBAR_SLOT_SELECTOR)
  const title = document.createElement('div')
  title.className = `7x_${'title'}`
  anchor.append(title)
  document.body.append(anchor)
  followPage()
  expect(selected(sidebar.part('title'))).toEqual([title])
})

test('a part a feature stamps by hand is read from the stamp, and the marking pass\'s own attribute from nowhere', () => {
  const stamped = document.createElement('div')
  stamped.setAttribute(STAMP_ATTR, STAMPED)
  const marked = document.createElement('div')
  marked.setAttribute(PART_ATTR, STAMPED)
  const other = document.createElement('div')
  other.setAttribute(STAMP_ATTR, sidebar.part('title'))
  document.body.append(stamped, marked, other)
  adoptPartClasses(VOCABULARY)
  expect(selected(STAMPED)).toEqual([stamped])
  expect(selected(sidebar.part('title'))).toHaveLength(0)
  expect(finishSheet({ text: ['', '{order:1}'], rules: [[['', [STAMPED, 1] as const, '']]] })).not.toContain(PART_ATTR)
})
