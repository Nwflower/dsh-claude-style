import { FOOTER_ACTIONS_SELECTOR, SLOT_ANCHOR_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { createFooterMirror } from '@dsh-claude-style/client/pure'
import { attach } from './host-markup'

/**
 * The footer area with its action slot, and the account menu's body beside it,
 * wired to a footer mirror: the shape both footer-mirror specs drive.
 */
export function footerMirrorHarness() {
  const footArea = document.createElement('div')
  const actions = attach(footArea, FOOTER_ACTIONS_SELECTOR)
  const slot = attach(actions, SLOT_ANCHOR_SELECTOR)
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
  return { footArea, slot, popover, mirror }
}
