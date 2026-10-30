/**
 * A fixed-position footer overlay can mount after the scheduler's read phase.
 * The following sync must recognise the new node while gathering its trigger
 * into the account menu.
 *
 * @capability footer-mirror
 * @features account
 * @risk A panel mounted between measurement and sync is collapsed as an ordinary footer entry, so the account-menu trigger opens a dialog with no box.
 */
import { afterEach, expect, test } from 'vitest'
import { FOOTER_ACTIONS_SELECTOR, SLOT_ANCHOR_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { createFooterMirror } from '@dsh-claude-style/client/pure'
import { attach } from '../../fixtures/host-markup'
import { surfaceAttribute } from '../../fixtures/surface'

const FOOTER_OVERLAY = surfaceAttribute('account.footer-overlay')
const FOOTER_ENTRY = surfaceAttribute('account.footer-entry')
const FOOTER_HIDDEN = surfaceAttribute('account.footer-hidden')
const ACTION_INDEX = surfaceAttribute('account.action-index')

afterEach(() => {
  document.body.replaceChildren()
})

test('a fixed panel mounted after measurement stays an overlay while its trigger enters the account menu', () => {
  const footArea = document.createElement('div')
  const actions = attach(footArea, FOOTER_ACTIONS_SELECTOR)
  const slot = attach(actions, SLOT_ANCHOR_SELECTOR)
  const trigger = document.createElement('div')
  const button = document.createElement('button')
  button.setAttribute('aria-label', 'Remote workspace')
  button.textContent = 'Remote'
  trigger.append(button)
  slot.append(trigger)

  const popover = document.createElement('div')
  const anchor = document.createElement('div')
  popover.append(anchor)
  document.body.append(footArea, popover)
  const mirror = createFooterMirror({
    body: () => popover,
    anchor: () => anchor,
    isOpen: () => false,
    close: () => {},
  })

  mirror.measure(footArea)
  const backdrop = document.createElement('div')
  backdrop.setAttribute('role', 'presentation')
  backdrop.style.cssText = 'position:fixed;inset:0;display:grid'
  const panel = document.createElement('section')
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-label', 'Remote workspace')
  backdrop.append(panel)
  trigger.after(backdrop)
  mirror.sync(footArea)

  expect(backdrop.hasAttribute(FOOTER_OVERLAY)).toBe(true)
  expect(backdrop.hasAttribute(FOOTER_ENTRY)).toBe(false)
  expect(backdrop.hasAttribute(FOOTER_HIDDEN)).toBe(false)
  expect(popover.querySelector(`[${ACTION_INDEX}]`)?.textContent).toContain('Remote workspace')
  mirror.clear(footArea)
})
