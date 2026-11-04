import { SIDEBAR_STATUS_ATTR } from '../../constants'
import { SESSION_PHASE_ATTRIBUTE, SESSION_STATUS_OUTLET_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { setAttributeIfChanged } from '@dsh-claude-style/engine/dom'

/** Keep the host's primary status, screen-reader labels and event targets in place. */
export class RightSessionStatus {
  constructor(readonly row: HTMLElement) {}

  sync() {
    const slot = this.row.querySelector(':scope > [data-dsh-claude-part~="row-slot"]')
    let state: 'active' | 'idle' | 'foreign' = 'idle'
    if (slot) {
      const dot = slot.querySelector(`:scope > [${SESSION_PHASE_ATTRIBUTE}]`)
      const outlet = [...slot.children].find(child => child.matches(SESSION_STATUS_OUTLET_SELECTOR))
      if (outlet && outlet.childNodes.length > 0) state = 'foreign'
      else if (dot && dot.getAttribute(SESSION_PHASE_ATTRIBUTE) === 'idle') state = 'idle'
      else if (dot) state = 'active'
      else {
        // An empty native outlet occupies no content; another plugin's leading decoration stays leading.
        for (const node of slot.childNodes) {
          if (node instanceof Element && node.matches(SESSION_STATUS_OUTLET_SELECTOR) && node.childNodes.length === 0) continue
          if (node instanceof Text && node.textContent?.trim().length === 0) continue
          state = 'foreign'
          break
        }
      }
    }
    setAttributeIfChanged(this.row, SIDEBAR_STATUS_ATTR, state)
  }

  dispose() { this.row.removeAttribute(SIDEBAR_STATUS_ATTR) }
}
