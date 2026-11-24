/**
 * The highlight of a segmented control, placed from the control it is given:
 * a control met for the first time is placed by its size observer's first
 * report, a pass's reading places it in that pass without reading the page
 * again, and a press that moves the chosen item before the next pass still
 * lands the highlight under the item the reader pressed. The highlight is
 * measured as the shipped stylesheet draws it.
 *
 * @capability segmented-control
 * @features shared
 * @risk After a press on a segmented control, the highlight stays under the choice the reader just left, so the control shows one choice while another is in force.
 */
import { afterEach, expect, test, vi } from 'vitest'
import { SLIDING_PILL_SHEET, createSlidingPill } from '@dsh-claude-style/client/pure'
import { surfaceAttribute } from '../../fixtures/surface'

const ROOT = surfaceAttribute('skin.root')
const cleanups: (() => void)[] = []
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
})

/** A control of two choices, the first one checked, under the shipped sheet. */
function control() {
  const sheet = document.createElement('style')
  sheet.textContent = SLIDING_PILL_SHEET
  const bar = document.createElement('div')
  bar.setAttribute('role', 'radiogroup')
  bar.style.cssText = 'position:relative;display:flex;gap:4px;width:200px;height:20px'
  for (const width of [40, 80]) {
    const item = document.createElement('button')
    item.setAttribute('role', 'radio')
    item.style.cssText = `width:${width}px;height:20px;padding:0;border:0`
    item.setAttribute('aria-checked', String(width === 40))
    bar.append(item)
  }
  document.head.append(sheet)
  document.body.setAttribute(ROOT, '')
  document.body.append(bar)
  cleanups.push(() => { bar.remove(); sheet.remove(); document.body.removeAttribute(ROOT) })
  return bar
}

/** The box the highlight paints: placed at the control's padding edge and moved by its transform. */
function highlightBox(bar: HTMLElement) {
  const style = getComputedStyle(bar, '::before')
  const matrix = new DOMMatrixReadOnly(style.transform === 'none' ? undefined : style.transform)
  const box = bar.getBoundingClientRect()
  const left = box.left + bar.clientLeft + matrix.m41
  return { left: Math.round(left * 100) / 100, width: Math.round(parseFloat(style.width) * 100) / 100 }
}

/** The checked item's box, in the same terms. */
function checkedBox(bar: HTMLElement) {
  const item = bar.querySelector('[aria-checked="true"]')!.getBoundingClientRect()
  return { left: Math.round(item.left * 100) / 100, width: Math.round(item.width * 100) / 100 }
}

/** Meet the control and wait for its size observer's first report to place the highlight under the checked item. */
async function firstPlaced(pill: ReturnType<typeof createSlidingPill>, bar: HTMLElement) {
  pill.sync(bar)
  await expect.poll(() => highlightBox(bar)).toEqual(checkedBox(bar))
}

test('a pass\'s reading places the highlight in that pass, without reading the page again', async () => {
  const bar = control()
  const pill = createSlidingPill('[aria-checked="true"]')
  cleanups.push(() => pill.release())
  await firstPlaced(pill, bar)
  // cost: D40 — the write phase places from the read phase's reading, with no layout read of its own.
  const read = vi.spyOn(bar, 'getBoundingClientRect')
  pill.measure(bar)
  expect(read).toHaveBeenCalledTimes(1)
  pill.sync(bar)
  expect(read).toHaveBeenCalledTimes(1)
  read.mockRestore()
  expect(highlightBox(bar)).toEqual(checkedBox(bar))
})

test('a press that moves the chosen item before the next pass lands the highlight under the item pressed', async () => {
  const bar = control()
  const pill = createSlidingPill('[aria-checked="true"]')
  cleanups.push(() => pill.release())
  await firstPlaced(pill, bar)
  // The press moves the chosen item and the control is placed from its own
  // render, before the next pass's read phase: the reading standing is the one
  // taken while the first item was still the chosen one.
  const [first, second] = bar.children
  first!.setAttribute('aria-checked', 'false')
  second!.setAttribute('aria-checked', 'true')
  pill.sync(bar)
  expect(highlightBox(bar)).toEqual(checkedBox(bar))
})

test('null control targets reset cleanly without throwing', async () => {
  const bar = control()
  const pill = createSlidingPill('[aria-checked="true"]')
  cleanups.push(() => pill.release())
  expect(() => pill.measure(null)).not.toThrow()
  expect(() => pill.sync(null)).not.toThrow()
  await firstPlaced(pill, bar)
  expect(() => pill.sync(null)).not.toThrow()
  expect(() => pill.sync(null)).not.toThrow()
})
