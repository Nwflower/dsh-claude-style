import { afterEach, beforeEach } from 'vitest'
import { RightSessionStatus, SIDEBAR_BASE_SHEET, SIDEBAR_STATUS_SHEET } from '@dsh-claude-style/client/pure'
import { DARK_THEME_ATTRIBUTE, SESSION_PHASE_ATTRIBUTE, SESSION_STATUS_OUTLET_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { hostElement } from '../../fixtures/host-markup'
import { literalThemeSheet } from '../../fixtures/theme-tokens'
import { surfaceAttribute } from '../../fixtures/surface'

export const PART = surfaceAttribute('skin.part')
export const ENABLED = surfaceAttribute('skin.root')
export const STATUS = surfaceAttribute('sidebar-status.row')
const SVG_NS = 'http://www.w3.org/2000/svg'
const teardown: (() => void)[] = []

beforeEach(() => {
  bodyAttribute(ENABLED, '')
  const tokens = literalThemeSheet(`body[${ENABLED}]`, DARK_THEME_ATTRIBUTE)
    + `body[${ENABLED}]{--dsw-alias-label-primary:rgb(22,22,22);}`
  for (const css of [tokens, SIDEBAR_BASE_SHEET, SIDEBAR_STATUS_SHEET]) {
    const element = document.createElement('style')
    element.append(document.createTextNode(css))
    document.head.appendChild(element)
    teardown.push(() => element.remove())
  }
})

afterEach(() => {
  while (teardown.length > 0) teardown.pop()?.()
})

/** Native StateDot and its outlet retain their original seat and event targets. */
export function mount(state: string | null = 'ongoing', direction: 'ltr' | 'rtl' = 'ltr', changed?: () => void) {
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
  const right = new RightSessionStatus(container, changed)
  const dot = state === null ? null : nativeDot(state)
  if (dot) seat.prepend(dot)
  teardown.push(() => { right.dispose(); container.remove() })
  const sync = () => { right.measure(); right.sync() }
  return { row: container, seat, outlet, title, actions, menu, right, dot, sync }
}

export function nativeDot(state: string): Element {
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

export function bodyAttribute(name: string, value: string | null) {
  const before = document.body.getAttribute(name)
  if (value === null) document.body.removeAttribute(name)
  else document.body.setAttribute(name, value)
  teardown.push(() => {
    if (before === null) document.body.removeAttribute(name)
    else document.body.setAttribute(name, before)
  })
}

export function removeAfterTest(element: Element) {
  teardown.push(() => element.remove())
}

/** Every style rule of a shipped sheet, with the media conditions wrapping it. */
export function sheetRules(css: string): { rule: CSSStyleRule, media: string[] }[] {
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(css)
  const rules: { rule: CSSStyleRule, media: string[] }[] = []
  const visit = (entries: CSSRuleList, media: string[] = []) => {
    for (const rule of entries) {
      if (rule instanceof CSSStyleRule) rules.push({ rule, media })
      else if (rule instanceof CSSMediaRule) visit(rule.cssRules, [...media, rule.conditionText])
      else if (rule instanceof CSSSupportsRule) visit(rule.cssRules, media)
    }
  }
  visit(sheet.cssRules)
  return rules
}

export function painted(element: Element): boolean {
  const style = getComputedStyle(element)
  const box = element.getBoundingClientRect()
  return style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0 && box.width > 0 && box.height > 0
}
