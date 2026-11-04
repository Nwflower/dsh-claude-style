import { SIDEBAR_RUNNING_TITLE_ATTR, SIDEBAR_STATUS_ATTR } from '../../constants'
import { observeSize } from '@dsh-claude-style/engine/bus'
import { SESSION_PHASE_ATTRIBUTE, SESSION_STATUS_OUTLET_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { setAttributeIfChanged } from '@dsh-claude-style/engine/dom'

/** Keep the host's primary status, screen-reader labels and event targets in place. */
export class RightSessionStatus {
  private title: HTMLElement | null = null
  private stopTitleSize: (() => void) | null = null
  private measured: { state: 'active' | 'idle' | 'foreign'; title: HTMLElement | null; applicable: boolean } | null = null

  constructor(readonly row: HTMLElement, private readonly changed?: () => void) {}

  measure() {
    const slot = this.row.querySelector(':scope > [data-dsh-claude-part~="row-slot"]')
    let state: 'active' | 'idle' | 'foreign' = 'idle'
    let running = false
    if (slot) {
      const dot = slot.querySelector(`:scope > [${SESSION_PHASE_ATTRIBUTE}]`)
      running = dot?.getAttribute(SESSION_PHASE_ATTRIBUTE) === 'ongoing'
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
    const candidate = state === 'active' && running ? this.row.querySelector(':scope > [data-dsh-claude-part~="row-title"]') : null
    const title = candidate instanceof HTMLElement ? candidate : null
    this.measured = { state, title, applicable: title !== null && this.titleApplicable(title) }
  }

  sync() {
    if (this.measured === null) return
    const { state, title, applicable } = this.measured
    setAttributeIfChanged(this.row, SIDEBAR_STATUS_ATTR, state)
    if (title !== this.title) {
      this.stopTitleSize?.()
      this.title = title
      this.stopTitleSize = title && this.changed ? observeSize(title, this.changed) : null
    }
    if (applicable) setAttributeIfChanged(this.row, SIDEBAR_RUNNING_TITLE_ATTR, '')
    else this.row.removeAttribute(SIDEBAR_RUNNING_TITLE_ATTR)
  }

  /** Only the host's visible plain title is painted; editors and foreign rich content keep the native marker. */
  private titleApplicable(title: HTMLElement) {
    if (!title.isConnected || title.children.length > 0 || !title.textContent?.trim() || title.isContentEditable) return false
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(title.tagName)) return false
    for (let node: HTMLElement | null = title; node; node = node.parentElement) {
      if (node.hidden || node.getAttribute('aria-hidden') === 'true') return false
      if (node === this.row) break
    }
    const style = getComputedStyle(title)
    const box = title.getBoundingClientRect()
    return style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0 && box.width > 0 && box.height > 0
  }

  dispose() {
    this.stopTitleSize?.()
    this.stopTitleSize = null
    this.title = null
    this.measured = null
    this.row.removeAttribute(SIDEBAR_RUNNING_TITLE_ATTR)
    this.row.removeAttribute(SIDEBAR_STATUS_ATTR)
  }
}
