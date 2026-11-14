/**
 * @capability composer-crowding
 * @features composer, model, effort
 * @risk A nonempty model button can show only its release tag while plugin
 * slot contents squeeze its actual name to zero; nested groups can overflow.
 */
import { beforeAll, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { setSwappingText } from '@dsh-claude-style/client/pure'
import { pageCleanups } from '../../fixtures/page'
import { surfaceAttribute, surfaceSelector } from '../../fixtures/surface'
import { crowdingFixture, frames, LAYOUT, TOOLBAR, type CrowdedComposer } from './fixture'

beforeAll(async () => { await page.viewport(1280, 1000) })

const cleanups = pageCleanups()
function mount(options: Parameters<typeof crowdingFixture>[0]) {
  const view = crowdingFixture(options); cleanups.push(view.dispose); return view
}

/** Browser evidence only: intersect all clipping ancestors and the actual hit plate. */
function visibleBox(element: HTMLElement, plate: HTMLElement = element) {
  const rect = element.getBoundingClientRect(); const boundary = plate.getBoundingClientRect()
  let left = Math.max(rect.left, boundary.left); let right = Math.min(rect.right, boundary.right)
  let top = Math.max(rect.top, boundary.top); let bottom = Math.min(rect.bottom, boundary.bottom)
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    const style = getComputedStyle(node)
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return { width: 0, height: 0 }
    const box = node.getBoundingClientRect()
    if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX)) { left = Math.max(left, box.left); right = Math.min(right, box.right) }
    if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowY)) { top = Math.max(top, box.top); bottom = Math.min(bottom, box.bottom) }
  }
  return { width: Math.max(0, right - left), height: Math.max(0, bottom - top) }
}

function intrinsic(node: HTMLElement, text: string, zoom: number) {
  const probe = document.createElement('span')
  probe.style.cssText = `position:fixed;left:-10000px;white-space:pre;visibility:hidden;font:${getComputedStyle(node).font}`
  probe.textContent = text; document.body.append(probe)
  const width = probe.getBoundingClientRect().width * zoom; probe.remove(); return width
}

function usable(node: HTMLElement, view: CrowdedComposer) {
  const box = node.getBoundingClientRect(); const card = view.card.getBoundingClientRect()
  expect(box.width).toBeGreaterThan(0); expect(box.height).toBeGreaterThan(0)
  expect(box.left).toBeGreaterThanOrEqual(card.left - 0.5); expect(box.right).toBeLessThanOrEqual(card.right + 0.5)
  expect(box.top).toBeGreaterThanOrEqual(card.top - 0.5); expect(box.bottom).toBeLessThanOrEqual(card.bottom + 0.5)
  expect(node.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2))).toBe(true)
}

function core(view: CrowdedComposer, name = 'DeepSeek-V4.1-Flash') {
  const threshold = Math.min(intrinsic(view.label, '0000000000', view.zoom), intrinsic(view.label, name, view.zoom))
  expect(visibleBox(view.label, view.model).width).toBeGreaterThanOrEqual(threshold - 0.5)
  expect(visibleBox(view.label, view.model).height).toBeGreaterThan(0)
  expect(view.label.textContent).toContain(name)
  expect(visibleBox(view.effort).width).toBeGreaterThanOrEqual(intrinsic(view.effort, 'High', view.zoom) - 0.5)
  expect(view.effort.scrollWidth).toBeLessThanOrEqual(view.effort.clientWidth + 1)
  expect(view.effort.textContent).toBe('High')
  const nodes: HTMLElement[] = [view.model, view.effort, view.usage, view.permission, view.commands, view.extension, view.voice, view.vision, view.primary]
  for (const extra of [view.pressure, view.foreign]) if (extra.checkVisibility()) nodes.push(extra)
  for (const node of nodes) usable(node, view)
  for (const [index, node] of nodes.entries()) {
    const a = node.getBoundingClientRect()
    for (const other of nodes.slice(index + 1)) {
      const b = other.getBoundingClientRect()
      expect(Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5).toBe(false)
    }
  }
  expect(view.card.scrollWidth).toBeLessThanOrEqual(view.card.clientWidth + 1)
  for (const [node, parent] of view.parents) expect(node.parentElement).toBe(parent)
  expect(view.nativeTrigger.checkVisibility()).toBe(false)
  expect(view.hiddenFile.checkVisibility()).toBe(false)
}

function geometry(view: CrowdedComposer) {
  const origin = view.card.getBoundingClientRect()
  return [view.row, view.model, view.effort, view.usage, view.primary].map(node => {
    const box = node.getBoundingClientRect(); return [box.left - origin.left, box.top - origin.top, box.width, box.height]
  })
}
function sameGeometry(left: number[][], right: number[][]) {
  left.forEach((box, index) => box.forEach((value, axis) => expect(right[index][axis]).toBeCloseTo(value, 1)))
}

for (const variant of ['hero', 'inline']) {
  for (const direction of ['ltr', 'rtl']) {
    for (const zoom of [1, 1.25, 1.5]) {
      test(`${variant} ${direction} ${zoom}: actual slot children survive 100/160/240px pressure and restore`, async () => {
        const view = mount({ width: 700, zoom, direction, variant }); await frames()
        expect(getComputedStyle(view.modelSlot).display).toBe('contents')
        expect(view.modelSlot.getBoundingClientRect().width).toBe(0)
        expect(view.right.getBoundingClientRect().width).toBe(0)
        expect(view.controls.contains(view.modelSlot)).toBe(true)
        const snapshots = new Map<number, number[][]>()
        for (const pressure of [0, 100, 160, 240, 0, 240, 0]) {
          view.setPressure(pressure); await frames(); core(view)
          if (pressure > 0) {
            expect(view.pressure.getBoundingClientRect().width).toBeCloseTo(pressure * zoom, 1)
            usable(view.pressure, view)
          }
          const previous = snapshots.get(pressure)
          if (previous) sameGeometry(previous, geometry(view))
          else snapshots.set(pressure, geometry(view))
        }
      })
    }
  }
}

for (const variant of ['hero', 'inline']) {
  test(`${variant} 480px/150% RTL retains the actual label, High and original handlers`, async () => {
    const view = mount({ width: 480, zoom: 1.5, direction: 'rtl', variant }); view.setPressure(240); await frames(); core(view)
    const control = surfaceAttribute('composer.control')
    const primary = view.primary; const parent = primary.parentElement
    const send = primary.getAttribute(control); expect(send).toBe('send')
    const sameAction = (action: string | null) => {
      expect(view.trailing.querySelector(`[${control}]`)).toBe(primary)
      expect(primary.parentElement).toBe(parent); expect(primary.getAttribute(control)).toBe(action)
    }
    sameAction(send)
    expect(view.model.querySelector(surfaceSelector('model.release-tag'))).toBe(view.release)
    expect(view.release.checkVisibility()).toBe(true)
    expect(view.activity.hasAttribute(surfaceAttribute('skin.holds'))).toBe(false)
    view.model.click(); view.primary.click(); expect(view.clicks()).toEqual({ model: 1, primary: 1 })
    view.primary.disabled = true; view.primary.click(); expect(view.clicks().primary).toBe(1); sameAction(send)
    view.primary.disabled = false; view.setAction('stop')
    view.primary.click(); expect(view.clicks().primary).toBe(2); sameAction('stop')
    view.setActivity(true); await frames()
    expect(view.activity.getAttribute(surfaceAttribute('skin.holds'))).toMatch(/\S/)
    expect(view.model.checkVisibility()).toBe(false); usable(view.activityButton, view); sameAction('stop')
    view.setActivity(false); await frames(); core(view); sameAction('stop')
    expect(view.activity.hasAttribute(surfaceAttribute('skin.holds'))).toBe(false)
    expect(view.activityButton.checkVisibility()).toBe(false)
    view.responsive.sync([view.card], false); await frames()
    expect(view.card.hasAttribute(LAYOUT)).toBe(false); expect(view.row.hasAttribute(TOOLBAR)).toBe(false); sameAction('stop')
    view.responsive.sync([view.card], true); await frames(); core(view); sameAction('stop')
    expect(view.model.querySelector(surfaceSelector('model.release-tag'))).toBe(view.release)
    expect(view.release.checkVisibility()).toBe(true)
    view.responsive.dispose(); sameAction('stop')
    expect(view.card.hasAttribute(LAYOUT)).toBe(false); expect(view.row.hasAttribute(TOOLBAR)).toBe(false)
  })
}

test('wide default and long/short name round trips do not retain a wrapped height or change identity', async () => {
  const view = mount({ width: 1200 }); await frames(); core(view)
  const release = view.release; const parent = release.parentElement
  const sameRelease = () => {
    expect(view.model.querySelector(surfaceSelector('model.release-tag'))).toBe(release)
    expect(release.parentElement).toBe(parent); expect(release.checkVisibility()).toBe(true)
    expect(visibleBox(release, view.model).width).toBeGreaterThan(0)
  }
  sameRelease()
  expect(view.row.offsetHeight).toBe(28)
  const initial = geometry(view)
  const short = 'mini'; const long = 'Unusually-long-provider-model-identifier-with-release-suffix'
  for (const name of [short, long, short, 'DeepSeek-V4.1-Flash']) {
    setSwappingText(view.label, name); await frames(30); core(view, name); sameRelease()
    expect(view.row.offsetHeight).toBe(28)
  }
  sameGeometry(initial, geometry(view))
  view.resize(480); view.setPressure(240); await frames(); core(view)
  view.setPressure(0); view.resize(1200); await frames(); core(view); sameGeometry(initial, geometry(view)); sameRelease()
})

test('a foreign effective root remains in its original contents anchor through pressure changes', async () => {
  const view = mount({ width: 1000, foreign: true }); await frames()
  const original = view.foreignRoot.parentElement
  for (const pressure of [0, 240, 0]) {
    view.setPressure(pressure); await frames(); core(view); usable(view.foreign, view)
    expect(view.foreignRoot.parentElement).toBe(original)
    expect(view.foreignRoot.getBoundingClientRect().width).toBeGreaterThan(0)
    expect(view.modelSlot.getBoundingClientRect().width).toBe(0)
  }
})
