/**
 * @capability sidebar-status
 * @features sidebar-status
 * @risk Repositioning native status loses controls or accessible labels, covers the session menu, or moves third-party leading content away from its own layout.
 */
import { expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { SESSION_PHASE_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { mount, nativeDot, PART } from './fixture'
import { surfaceAttribute } from '../../fixtures/surface'

const STATUS = surfaceAttribute('sidebar-status.row')

function center(element: Element) {
  const rect = element.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function avoidsMenu(indicator: Element, menu: Element, direction: 'ltr' | 'rtl'): void {
  const light = indicator.getBoundingClientRect()
  const control = menu.getBoundingClientRect()
  if (direction === 'ltr') expect(control.right).toBeLessThanOrEqual(light.left)
  else expect(control.left).toBeGreaterThanOrEqual(light.right)
}

test.each(['ongoing', 'warning', 'done', 'error'])('%s native status moves visually to the end with identity, listener and aria intact', state => {
  const view = mount(state)
  const dot = view.dot as Element
  const labels = dot.textContent
  const originalNodes = [...view.seat.childNodes]
  const originalStyle = dot.getAttribute('style')
  let clicks = 0
  dot.addEventListener('click', () => { clicks += 1 })
  view.sync()
  expect(view.row.getAttribute(STATUS)).toBe('active')
  originalNodes.forEach((node, index) => expect(view.seat.childNodes[index]).toBe(node))
  expect(dot.parentElement).toBe(view.seat)
  expect(dot.getAttribute('aria-label')).toBe(`Native ${state}`)
  expect(dot.textContent).toBe(labels)
  expect(dot.getAttribute('style')).toBe(originalStyle)
  dot.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(clicks).toBe(1)
  expect(getComputedStyle(view.seat).position).toBe('absolute')
  expect(center(dot).x).toBeGreaterThan(center(view.row).x)
  avoidsMenu(dot, view.menu, 'ltr')
})

test('idle state, an empty seat and an empty native outlet paint no hollow indicator', () => {
  for (const state of [null, 'idle']) for (const emptyOutlet of [true, false]) {
    const view = mount(state)
    if (emptyOutlet === false) view.outlet.remove()
    view.sync()
    expect(view.row.getAttribute(STATUS)).toBe('idle')
    expect(getComputedStyle(view.seat).visibility).toBe('hidden')
    expect(getComputedStyle(view.seat, '::after').content).toBe('none')
    if (emptyOutlet) expect(getComputedStyle(view.outlet, '::after').content).toBe('none')
  }
})

test('foreign leading content keeps its layout and nested state labels do not claim native ownership', () => {
  const view = mount(null)
  const foreign = document.createElement('button')
  foreign.textContent = 'Third-party leading action'
  foreign.append(nativeDot('warning'))
  view.outlet.append(foreign)
  const before = foreign.getBoundingClientRect().left
  let clicks = 0
  foreign.addEventListener('click', () => { clicks += 1 })
  view.sync()
  expect(view.row.getAttribute(STATUS)).toBe('foreign')
  expect(getComputedStyle(view.seat).position).toBe('static')
  expect(foreign.getBoundingClientRect().left).toBe(before)
  expect(foreign.parentElement).toBe(view.outlet)
  foreign.click()
  expect(clicks).toBe(1)
})

test('repeated sync observes active, idle and foreign state without additional DOM mutations', () => {
  for (const state of ['ongoing', 'idle', null]) {
    const view = mount(state)
    if (state === null) view.outlet.append(document.createElement('button'))
    view.sync()
    const watch = new MutationObserver(() => {})
    watch.observe(view.row, { attributes: true, childList: true, subtree: true })
    view.sync()
    view.sync()
    expect(watch.takeRecords()).toEqual([])
    watch.disconnect()
  }
})

test('dispose removes only its own ownership marker and preserves native content and listeners', () => {
  const view = mount('warning')
  const attributes = [...view.row.attributes].map(attribute => [attribute.name, attribute.value])
  const nodes = [...view.row.childNodes]
  const dot = view.dot as Element
  let clicks = 0
  dot.addEventListener('click', () => { clicks += 1 })
  view.sync()
  view.right.dispose()
  view.right.dispose()
  expect(view.row.getAttribute(STATUS)).toBeNull()
  expect([...view.row.attributes].map(attribute => [attribute.name, attribute.value])).toEqual(attributes)
  nodes.forEach((node, index) => expect(view.row.childNodes[index]).toBe(node))
  expect(dot.parentElement).toBe(view.seat)
  expect(dot.getAttribute(SESSION_PHASE_ATTRIBUTE)).toBe('warning')
  expect(dot.textContent).toBe('Native warning explanation')
  dot.dispatchEvent(new MouseEvent('click'))
  expect(clicks).toBe(1)
  expect(getComputedStyle(view.seat).position).toBe('static')
})

test.each(['ltr', 'rtl'] as const)('%s native status occupies trailing padding outside the native menu', direction => {
  const view = mount('ongoing', direction)
  view.sync()
  const dot = view.dot as Element
  const dotBox = dot.getBoundingClientRect()
  const rowBox = view.row.getBoundingClientRect()
  if (direction === 'ltr') {
    expect(center(dot).x).toBeGreaterThan(center(view.row).x)
    expect(rowBox.right - dotBox.left).toBeLessThanOrEqual(Number.parseFloat(getComputedStyle(view.row).paddingInlineEnd))
  } else {
    expect(center(dot).x).toBeLessThan(center(view.row).x)
    expect(dotBox.right - rowBox.left).toBeLessThanOrEqual(Number.parseFloat(getComputedStyle(view.row).paddingInlineEnd))
  }
  expect(dotBox.width).toBeGreaterThan(0)
  expect(dotBox.left).toBeGreaterThanOrEqual(rowBox.left)
  expect(dotBox.right).toBeLessThanOrEqual(rowBox.right)
  expect(center(dot).y).toBeCloseTo(center(view.row).y)
  avoidsMenu(dot, view.menu, direction)
})

test('host replacement, removal and attribute changes are read from the current native seat', () => {
  const view = mount(null)
  view.sync()
  expect(view.row.getAttribute(STATUS)).toBe('idle')
  const next = nativeDot('error')
  view.seat.prepend(next)
  view.sync()
  expect(view.row.getAttribute(STATUS)).toBe('active')
  next.setAttribute(SESSION_PHASE_ATTRIBUTE, 'idle')
  view.sync()
  expect(view.row.getAttribute(STATUS)).toBe('idle')
  expect(getComputedStyle(view.seat).visibility).toBe('hidden')
  next.remove()
  view.sync()
  expect(view.row.getAttribute(STATUS)).toBe('idle')
  const replacement = nativeDot('done')
  view.seat.prepend(replacement)
  view.sync()
  expect(view.row.getAttribute(STATUS)).toBe('active')
  expect(getComputedStyle(view.seat).visibility).toBe('visible')
  expect(replacement.parentElement).toBe(view.seat)
})

test.each(['ltr', 'rtl'] as const)('%s hover and open menus hide the status seat and release its trailing padding', async direction => {
  const view = mount('ongoing', direction)
  view.sync()
  expect(getComputedStyle(view.seat).visibility).toBe('visible')
  expect(getComputedStyle(view.row).paddingInlineEnd).toBe('26px')
  try {
    await userEvent.hover(view.row)
    expect(getComputedStyle(view.seat).visibility).toBe('hidden')
    expect(getComputedStyle(view.row).paddingInlineEnd).toBe('6px')
    await userEvent.unhover(view.row)
    expect(getComputedStyle(view.seat).visibility).toBe('visible')
    view.row.setAttribute(PART, 'session-row row-menu-open')
    expect(getComputedStyle(view.seat).visibility).toBe('hidden')
    expect(getComputedStyle(view.row).paddingInlineEnd).toBe('6px')
    view.row.setAttribute(PART, 'session-row')
    expect(getComputedStyle(view.seat).visibility).toBe('visible')
    expect(getComputedStyle(view.row).paddingInlineEnd).toBe('26px')
    expect(view.dot?.parentElement).toBe(view.seat)
  } finally {
    await userEvent.unhover(document.body)
  }
})

test('a populated third-party outlet keeps a mixed native seat leading', () => {
  const view = mount('warning')
  const extension = document.createElement('button')
  extension.textContent = 'Extension action'
  view.outlet.append(extension)
  const leadingCenter = center(view.dot as Element)
  const nativeNodes = [...view.seat.childNodes]
  view.sync()
  expect(view.row.getAttribute(STATUS)).toBe('foreign')
  expect(center(view.dot as Element)).toEqual(leadingCenter)
  nativeNodes.forEach((node, index) => expect(view.seat.childNodes[index]).toBe(node))
  expect(extension.parentElement).toBe(view.outlet)
  expect(getComputedStyle(view.seat).position).toBe('static')
})
