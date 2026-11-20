/**
 * A footer entry that opens a menu keeps its place in the sidebar: the hiding
 * pass and the mirror read one eligibility answer, so an entry the account
 * popover refuses to gather is never hidden out of the sidebar as well.
 *
 * @capability footer-mirror
 * @features account
 * @risk A plugin whose footer entry is a menu trigger (the fnos config menu) is hidden in the sidebar and skipped by the mirror, so its entry point disappears from both places and the reader cannot open its menu (issue #417).
 */
import { afterEach, expect, test } from 'vitest'
import { MENU_TRIGGER_SELECTOR, SIGN_OUT_GLYPH_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { surfaceAttribute, surfaceSelector } from '../../fixtures/surface'
import { footerMirrorHarness } from '../../fixtures/footer-mirror'
import { hostElement } from '../../fixtures/host-markup'

const FOOTER_MENU = surfaceAttribute('account.footer-menu')
const FOOTER_ENTRY = surfaceAttribute('account.footer-entry')
const FOOTER_HIDDEN = surfaceAttribute('account.footer-hidden')
const ACTION_INDEX = surfaceAttribute('account.action-index')
const EMBED = surfaceSelector('account.embed')

afterEach(() => {
  document.body.replaceChildren()
})

/** A menu trigger as the plugin renders it: a button carrying the menu anchor. */
function menuTrigger() {
  const button = hostElement<HTMLButtonElement>(`button${MENU_TRIGGER_SELECTOR}`)
  button.setAttribute('aria-label', 'Config menu')
  button.textContent = 'Config'
  return button
}

test('a menu trigger that is the entry root keeps its place and gathers no row', () => {
  const { footArea, slot, popover, mirror } = footerMirrorHarness()
  const trigger = menuTrigger()
  slot.append(trigger)

  mirror.measure(footArea)
  mirror.sync(footArea)

  expect(trigger.hasAttribute(FOOTER_MENU)).toBe(true)
  expect(trigger.hasAttribute(FOOTER_ENTRY)).toBe(false)
  expect(trigger.hasAttribute(FOOTER_HIDDEN)).toBe(false)
  expect(popover.querySelector(`[${ACTION_INDEX}], ${EMBED}`)).toBeNull()

  mirror.clear(footArea)
  expect(trigger.hasAttribute(FOOTER_MENU)).toBe(false)
})

test('a menu trigger inside an entry wrapper keeps the whole entry in place', () => {
  const { footArea, slot, popover, mirror } = footerMirrorHarness()
  const wrapper = document.createElement('div')
  wrapper.append(menuTrigger())
  slot.append(wrapper)

  mirror.measure(footArea)
  mirror.sync(footArea)

  expect(wrapper.hasAttribute(FOOTER_MENU)).toBe(true)
  expect(wrapper.hasAttribute(FOOTER_ENTRY)).toBe(false)
  expect(wrapper.hasAttribute(FOOTER_HIDDEN)).toBe(false)
  expect(wrapper.querySelector(`[${FOOTER_HIDDEN}]`)).toBeNull()
  expect(popover.querySelector(`[${ACTION_INDEX}], ${EMBED}`)).toBeNull()

  mirror.clear(footArea)
  expect(wrapper.hasAttribute(FOOTER_MENU)).toBe(false)
})

test('an entry carrying the host sign-out glyph keeps its place and gathers no row', () => {
  const { footArea, slot, popover, mirror } = footerMirrorHarness()
  const wrapper = document.createElement('div')
  wrapper.append(hostElement(SIGN_OUT_GLYPH_SELECTOR))
  slot.append(wrapper)

  mirror.measure(footArea)
  mirror.sync(footArea)

  expect(wrapper.hasAttribute(FOOTER_MENU)).toBe(true)
  expect(wrapper.hasAttribute(FOOTER_HIDDEN)).toBe(false)
  expect(popover.querySelector(`[${ACTION_INDEX}], ${EMBED}`)).toBeNull()

  mirror.clear(footArea)
  expect(wrapper.hasAttribute(FOOTER_MENU)).toBe(false)
})

test('a plain action entry beside a menu trigger is still gathered into the popover', () => {
  const { footArea, slot, popover, mirror } = footerMirrorHarness()
  const trigger = menuTrigger()
  const plain = document.createElement('button')
  plain.setAttribute('aria-label', 'Whaleness mobile')
  plain.textContent = 'Mobile'
  slot.append(trigger, plain)

  mirror.measure(footArea)
  mirror.sync(footArea)

  expect(trigger.hasAttribute(FOOTER_MENU)).toBe(true)
  expect(plain.hasAttribute(FOOTER_ENTRY)).toBe(true)
  expect(plain.hasAttribute(FOOTER_HIDDEN)).toBe(true)
  const row = popover.querySelector(`[${ACTION_INDEX}]`)
  expect(row?.textContent).toContain('Whaleness mobile')

  mirror.clear(footArea)
})

test('a trigger that grew into an already collapsed entry paints whole again', () => {
  const { footArea, slot, mirror } = footerMirrorHarness()
  const wrapper = document.createElement('div')
  const label = document.createElement('span')
  label.textContent = 'Config'
  wrapper.append(label)
  slot.append(wrapper)

  // First pass: a plain entry, collapsed and hidden in place.
  mirror.measure(footArea)
  mirror.sync(footArea)
  expect(wrapper.hasAttribute(FOOTER_HIDDEN)).toBe(true)

  // The plugin re-renders its control into a menu trigger; the next pass must
  // take the hidden mark off the entry and its branches, not leave it collapsed.
  const button = menuTrigger()
  wrapper.replaceChildren(button)
  mirror.measure(footArea)
  mirror.sync(footArea)

  expect(wrapper.hasAttribute(FOOTER_MENU)).toBe(true)
  expect(wrapper.hasAttribute(FOOTER_HIDDEN)).toBe(false)
  expect(wrapper.querySelector(`[${FOOTER_HIDDEN}]`)).toBeNull()

  mirror.clear(footArea)
})
