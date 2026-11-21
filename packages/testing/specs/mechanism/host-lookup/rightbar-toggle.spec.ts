/**
 * The right panel's collapse control belongs to the panel the page shows. A
 * Session the reader left keeps its panel mounted behind a hidden view, and
 * that panel keeps its own open mark, so reading the first match in document
 * order would press the control of the Session they left.
 *
 * @capability host-lookup
 * @features engine
 * @risk After a session switch the skin's header button closes the right panel of the previous conversation, and the details rail gives way by closing that panel.
 */
import { afterEach, expect, test } from 'vitest'
import { findRightbarToggle } from '@dsh-claude-style/engine/host'
import { RIGHTBAR_OPEN_ATTRIBUTE, RIGHTBAR_PANEL_SELECTOR, RIGHTBAR_TOGGLE_CONTROL_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { hostElement } from '../../fixtures/host-markup'

const cleanups: (() => void)[] = []
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
})

/** One Session's right column, held by the host like the retained view it draws. */
function view(hidden: boolean) {
  const layer = document.createElement('div')
  layer.hidden = hidden
  const panel = hostElement(RIGHTBAR_PANEL_SELECTOR)
  panel.setAttribute(RIGHTBAR_OPEN_ATTRIBUTE, '')
  const toggle = hostElement<HTMLButtonElement>(`button${RIGHTBAR_TOGGLE_CONTROL_SELECTOR}`)
  panel.append(toggle)
  layer.append(panel)
  document.body.append(layer)
  cleanups.push(() => layer.remove())
  return { layer, panel, toggle }
}

test('a hidden Session keeps its open panel mounted and owns no control on screen', () => {
  view(true)
  expect(findRightbarToggle()).toBeNull()
})

test('the control belongs to the panel inside the visible view', () => {
  view(true)
  const visible = view(false)
  expect(findRightbarToggle()).toBe(visible.toggle)
})

test('the last visible view wins once an earlier one is hidden', () => {
  const earlier = view(false)
  expect(findRightbarToggle()).toBe(earlier.toggle)
  earlier.layer.hidden = true
  const current = view(false)
  expect(findRightbarToggle()).toBe(current.toggle)
})
