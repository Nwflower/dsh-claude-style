/**
 * Replaceable panel layout subscriptions and restoration before paint (D12, D40, D81).
 * @capability page-scale
 * @features bottom-panel-fit, rightbar-fit
 * @risk A removed panel remains held, a disabled feature rewrites styles from its queued microtask, or repeated zoom divides a width twice.
 */
import { afterEach, expect, test } from 'vitest'
import { observeLayoutElements } from '@dsh-claude-style/engine/layout-elements'
import { heldWrites, installBottomPanelFit, installRightbarFit } from '@dsh-claude-style/client/pure'
import { BOTTOM_PANEL_SELECTOR, COMPOSER_SELECTOR, RIGHTBAR_COLUMN_SELECTOR, RIGHTBAR_PANEL_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { hostElement } from '../../fixtures/host-markup'
import { surfaceAttribute } from '../../fixtures/surface'
import { frames } from '../../fixtures/frames'

const zoom = surfaceAttribute('skin.page-zoom')
const stops: (() => void)[] = []
afterEach(() => {
  for (const stop of stops.splice(0)) stop()
  document.body.replaceChildren()
  document.body.removeAttribute(zoom)
  document.body.style.removeProperty('zoom')
})
const settle = async () => { await frames(2) }

test('a queued layout microtask cannot run after stop', async () => {
  let syncs = 0
  const stop = observeLayoutElements({
    selectors: [RIGHTBAR_PANEL_SELECTOR], bodyAttributes: [zoom],
    sync() { syncs += 1 }, release() {},
  })
  stop()
  await settle()
  expect(syncs).toBe(0)
})

test('replacement releases the old seat and stops hearing its style', async () => {
  const old = hostElement(RIGHTBAR_PANEL_SELECTOR)
  document.body.append(old)
  const released: HTMLElement[] = []
  let syncs = 0
  stops.push(observeLayoutElements({
    selectors: [RIGHTBAR_PANEL_SELECTOR], bodyAttributes: [zoom],
    sync() { syncs += 1 }, release: element => { released.push(element) },
  }))
  await settle()
  const next = hostElement(RIGHTBAR_PANEL_SELECTOR)
  old.replaceWith(next)
  await settle()
  expect(released).toEqual([old])
  const before = syncs
  old.style.width = '900px'
  await settle()
  expect(syncs).toBe(before)
  next.style.width = '500px'
  await settle()
  expect(syncs).toBeGreaterThan(before)
})

test('selective restoration drops only its seat and preserves later host declarations', () => {
  const first = document.createElement('div')
  const next = document.createElement('div')
  const writes = heldWrites()
  writes.write(first, 'width', '400px', '320px')
  writes.write(next, 'width', '600px', '480px')
  writes.restore(first)
  expect(first.style.width).toBe('400px')
  expect(next.style.width).toBe('480px')
  first.style.width = '450px'
  next.style.width = '700px'
  writes.restore()
  expect(first.style.width).toBe('450px')
  expect(next.style.width).toBe('700px')
})

test('a fitted value returning to its host value removes the previous rewrite', () => {
  const panel = document.createElement('div')
  const writes = heldWrites()
  writes.write(panel, 'width', '500px', '400px')
  writes.write(panel, 'width', '500px', '500px')
  expect(panel.style.width).toBe('500px')
  panel.style.width = '600px'
  writes.restore()
  expect(panel.style.width).toBe('600px')
})

test('right panel replacement restores detached widths and repeated installation keeps host pixels', async () => {
  document.body.setAttribute(zoom, '1.25')
  const old = hostElement(RIGHTBAR_PANEL_SELECTOR)
  old.style.width = '500px'
  document.body.append(old)
  const stop = installRightbarFit()
  await settle()
  expect(old.style.width).toBe('400px')
  const next = hostElement(RIGHTBAR_PANEL_SELECTOR)
  next.style.width = '600px'
  old.replaceWith(next)
  await settle()
  expect(old.style.width).toBe('500px')
  expect(next.style.width).toBe('480px')
  stop()
  stops.push(installRightbarFit())
  await settle()
  expect(next.style.width).toBe('480px')
  document.body.setAttribute(zoom, '1')
  await settle()
  expect(next.style.width).toBe('600px')
})

test('a scaled bottom panel meets the side columns and composer, then restores its host edges', async () => {
  document.body.setAttribute(zoom, '1.25')
  document.body.style.zoom = '1.25'
  const left = document.createElement('div')
  left.setAttribute(surfaceAttribute('skin.part'), 'sidebar-column')
  left.style.cssText = 'position:fixed;left:0;top:0;width:120px;height:100px'
  const right = hostElement(RIGHTBAR_COLUMN_SELECTOR)
  right.style.cssText = 'position:fixed;right:0;top:0;width:160px;height:100px'
  const composer = hostElement(COMPOSER_SELECTOR)
  composer.style.cssText = 'position:fixed;left:120px;top:100px;width:200px;height:80px'
  const panel = hostElement(BOTTOM_PANEL_SELECTOR)
  panel.style.cssText = 'position:fixed;left:20px;top:30px;width:200px;height:100px;bottom:0'
  document.body.append(left, right, composer, panel)
  const original = panel.style.cssText
  const stop = installBottomPanelFit()
  await settle()
  const box = panel.getBoundingClientRect()
  expect(Math.round(box.left)).toBe(Math.round(left.getBoundingClientRect().right))
  expect(Math.round(box.right)).toBe(Math.round(right.getBoundingClientRect().left))
  expect(Math.round(box.top)).toBe(Math.round(composer.getBoundingClientRect().bottom))
  expect(Math.round(box.bottom)).toBe(window.innerHeight)
  stop()
  expect(panel.style.cssText).toBe(original)
})
