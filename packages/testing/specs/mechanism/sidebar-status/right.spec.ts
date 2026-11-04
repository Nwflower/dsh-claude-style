/**
 * @capability sidebar-status
 * @features sidebar-status
 * @risk Repositioning native status loses controls or accessible labels, covers the session menu, or moves third-party leading content away from its own layout.
 */
import { afterEach, beforeEach, expect, test } from 'vitest'
import { RightSessionStatus, SIDEBAR_BASE_SHEET, SIDEBAR_STATUS_SHEET } from '@dsh-claude-style/client/pure'
import { SESSION_PHASE_ATTRIBUTE, SESSION_STATUS_OUTLET_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { hostElement } from '../../fixtures/host-markup'
import { surfaceAttribute } from '../../fixtures/surface'

const PART = surfaceAttribute('skin.part')
const ENABLED = surfaceAttribute('skin.root')
const STATUS = surfaceAttribute('sidebar-status.row')
const SVG_NS = 'http://www.w3.org/2000/svg'
const teardown: (() => void)[] = []
let previousRoot: string | null

beforeEach(() => {
  previousRoot = document.body.getAttribute(ENABLED)
  document.body.setAttribute(ENABLED, '')
  for (const css of [SIDEBAR_BASE_SHEET, SIDEBAR_STATUS_SHEET]) {
    const element = document.createElement('style')
    element.append(document.createTextNode(css))
    document.head.appendChild(element)
    teardown.push(() => element.remove())
  }
})

afterEach(() => {
  while (teardown.length > 0) teardown.pop()?.()
  if (previousRoot === null) document.body.removeAttribute(ENABLED)
  else document.body.setAttribute(ENABLED, previousRoot)
})

/** Native StateDot and its outlet retain their original seat and event targets. */
function mount(state: string | null = 'ongoing', direction: 'ltr' | 'rtl' = 'ltr') {
  const container = document.createElement('div')
  container.setAttribute(PART, 'session-row')
  container.dir = direction
  container.style.cssText = 'display:flex;align-items:center;box-sizing:border-box;width:320px'
  const seat = document.createElement('div')
  seat.setAttribute(PART, 'row-slot')
  const outlet = hostElement(SESSION_STATUS_OUTLET_SELECTOR)
  outlet.style.display = 'contents'
  seat.append(outlet)
  const title = document.createElement('span')
  title.setAttribute(PART, 'row-title')
  title.style.flex = '1'
  title.style.minWidth = '0'
  title.textContent = 'Native session title'
  const actions = document.createElement('div')
  actions.setAttribute(PART, 'row-actions')
  actions.style.display = 'flex'
  const menu = document.createElement('button')
  menu.type = 'button'
  menu.setAttribute('aria-label', 'Native session menu')
  menu.textContent = '⋯'
  menu.style.cssText = 'width:24px;height:24px;padding:0'
  actions.append(menu)
  container.append(seat, title, actions)
  document.body.appendChild(container)
  const right = new RightSessionStatus(container)
  const dot = state === null ? null : nativeDot(state)
  if (dot) seat.prepend(dot)
  teardown.push(() => { right.dispose(); container.remove() })
  return { row: container, seat, outlet, title, actions, menu, right, dot }
}

function nativeDot(state: string): Element {
  const dot = state === 'ongoing' ? document.createElementNS(SVG_NS, 'svg') : document.createElement('span')
  dot.setAttribute(SESSION_PHASE_ATTRIBUTE, state)
  dot.setAttribute('role', 'status')
  dot.setAttribute('aria-label', `Native ${state}`)
  if (dot instanceof SVGElement) {
    dot.setAttribute('width', '10')
    dot.setAttribute('height', '10')
    const label = document.createElementNS(SVG_NS, 'title')
    label.textContent = `Native ${state} explanation`
    dot.append(label)
  } else {
    dot.style.cssText = 'display:inline-flex;width:10px;height:10px'
    const label = document.createElement('span')
    label.textContent = `Native ${state} explanation`
    label.style.cssText = 'position:absolute;clip-path:inset(50%)'
    dot.append(label)
  }
  return dot
}

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
  view.right.sync()
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
    view.right.sync()
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
  view.right.sync()
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
    view.right.sync()
    const watch = new MutationObserver(() => {})
    watch.observe(view.row, { attributes: true, childList: true, subtree: true })
    view.right.sync()
    view.right.sync()
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
  view.right.sync()
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
  view.right.sync()
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
  view.right.sync()
  expect(view.row.getAttribute(STATUS)).toBe('idle')
  const next = nativeDot('error')
  view.seat.prepend(next)
  view.right.sync()
  expect(view.row.getAttribute(STATUS)).toBe('active')
  next.setAttribute(SESSION_PHASE_ATTRIBUTE, 'idle')
  view.right.sync()
  expect(view.row.getAttribute(STATUS)).toBe('idle')
  expect(getComputedStyle(view.seat).visibility).toBe('hidden')
  next.remove()
  view.right.sync()
  expect(view.row.getAttribute(STATUS)).toBe('idle')
  const replacement = nativeDot('done')
  view.seat.prepend(replacement)
  view.right.sync()
  expect(view.row.getAttribute(STATUS)).toBe('active')
  expect(getComputedStyle(view.seat).visibility).toBe('visible')
  expect(replacement.parentElement).toBe(view.seat)
})

test('a populated third-party outlet keeps a mixed native seat leading', () => {
  const view = mount('warning')
  const extension = document.createElement('button')
  extension.textContent = 'Extension action'
  view.outlet.append(extension)
  const leadingCenter = center(view.dot as Element)
  const nativeNodes = [...view.seat.childNodes]
  view.right.sync()
  expect(view.row.getAttribute(STATUS)).toBe('foreign')
  expect(center(view.dot as Element)).toEqual(leadingCenter)
  nativeNodes.forEach((node, index) => expect(view.seat.childNodes[index]).toBe(node))
  expect(extension.parentElement).toBe(view.outlet)
  expect(getComputedStyle(view.seat).position).toBe('static')
})
