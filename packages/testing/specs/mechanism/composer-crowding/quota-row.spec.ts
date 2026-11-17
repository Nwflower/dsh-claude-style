/**
 * @capability composer-crowding
 * @features composer, model
 * @risk A third-party quota moves the model onto another row despite available
 * room, or its contents paint over the model after the row shrinks.
 */
import { beforeAll, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { DARK_THEME_ATTRIBUTE, PHASE_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { pageCleanups } from '../../fixtures/page'
import { surfaceAttribute } from '../../fixtures/surface'
import { crowdingFixture, frames } from './fixture'

beforeAll(async () => { await page.viewport(1280, 1000) })
const cleanups = pageCleanups()

test.each([
  { direction: 'ltr', zoom: 1, dark: false },
  { direction: 'rtl', zoom: 1, dark: false },
  { direction: 'ltr', zoom: 1.5, dark: false },
  { direction: 'rtl', zoom: 1.5, dark: false },
  { direction: 'ltr', zoom: 1, dark: true },
  { direction: 'rtl', zoom: 1, dark: true },
  { direction: 'ltr', zoom: 1.5, dark: true },
  { direction: 'rtl', zoom: 1.5, dark: true },
])('$direction $zoom dark=$dark: quota and model share room and wrap safely', async ({ direction, zoom, dark }) => {
    const view = crowdingFixture({ width: 760 * zoom, direction, zoom })
    cleanups.push(view.dispose)
    document.body.toggleAttribute(DARK_THEME_ATTRIBUTE, dark)
    cleanups.push(() => document.body.removeAttribute(DARK_THEME_ATTRIBUTE))
    view.host.setAttribute(PHASE_ATTRIBUTE, 'active')
    // Third-party SlotOutlet content has its own nested text and no fixed width.
    const quota = document.createElement('div')
    quota.style.cssText = 'display:inline-flex;align-items:center'
    const trigger = document.createElement('button')
    trigger.textContent = '5小时 0% · 周 5%'
    trigger.style.cssText = 'white-space:nowrap;display:inline-flex;padding:4px 8px'
    quota.append(trigger)
    view.right.append(quota)
    view.responsive.sync([view.card], true)
    const originalParent = quota.parentElement

    for (const width of [760, 640, 600, 560, 520, 480, 760]) {
      view.resize(width * zoom)
      await frames()
      const row = view.row.getBoundingClientRect()
      const leading = view.tools.getBoundingClientRect()
      const trailing = view.trailing.getBoundingClientRect()
      if (width >= 640) {
        expect(Math.abs(leading.top + leading.height / 2 - trailing.top - trailing.height / 2)).toBeLessThan(1)
      } else if (width === 480) {
        expect(trailing.top).toBeGreaterThanOrEqual(leading.bottom)
      }
      const controls = [view.model, view.effort, view.usage, view.vision, trigger]
      for (const [index, node] of controls.entries()) {
        const box = node.getBoundingClientRect()
        expect(box.width).toBeGreaterThan(0)
        expect(box.left).toBeGreaterThanOrEqual(row.left - 0.5)
        expect(box.right).toBeLessThanOrEqual(row.right + 0.5)
        expect(box.top).toBeGreaterThanOrEqual(row.top - 0.5)
        expect(box.bottom).toBeLessThanOrEqual(row.bottom + 0.5)
        for (const other of controls.slice(index + 1)) {
          const next = other.getBoundingClientRect()
          expect(Math.min(box.right, next.right) - Math.max(box.left, next.left) > 0.5
            && Math.min(box.bottom, next.bottom) - Math.max(box.top, next.top) > 0.5).toBe(false)
        }
      }
      expect(trigger.scrollWidth).toBeLessThanOrEqual(trigger.clientWidth + 1)
      expect(quota.getBoundingClientRect().width).toBeGreaterThanOrEqual(trigger.getBoundingClientRect().width)
      expect(view.label.getBoundingClientRect().width).toBeGreaterThan(0)
      const model = view.model.getBoundingClientRect()
      for (const child of [view.label, view.release]) {
        const box = child.getBoundingClientRect()
        expect(box.left).toBeGreaterThanOrEqual(model.left - 0.5)
        expect(box.right).toBeLessThanOrEqual(model.right + 0.5)
      }
      expect(view.card.scrollWidth).toBeLessThanOrEqual(view.card.clientWidth + 1)
      expect(quota.parentElement).toBe(originalParent)
    }
    const marker = surfaceAttribute('composer.extension')
    expect(quota.hasAttribute(marker)).toBe(true)
    view.responsive.sync([view.card], false)
    expect(quota.hasAttribute(marker)).toBe(false)
})
