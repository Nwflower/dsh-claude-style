import { SIDEBAR_SLOT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { closestFrom } from '@dsh-claude-style/engine/dom'

const ROW = `${SIDEBAR_SLOT_SELECTOR} [data-dsh-claude-part~="session-row"]`
const TRIGGER = ':scope > [data-dsh-claude-part~="row-actions"] button'
const EDITABLE = 'input, textarea, select, [role="textbox"], [contenteditable]:not([contenteditable="false"])'

/** Delegate to the host menu button, retaining its commands, popup placement and keyboard handling. */
export function installSessionContextMenu(root: Document | HTMLElement = document): () => void {
  let disposed = false
  function open(event: Event) {
    if (event.defaultPrevented || closestFrom(event.target, EDITABLE)) return
    const row = closestFrom<HTMLElement>(event.target, ROW)
    if (row === null || root.contains(row) === false) return
    const trigger = row.querySelector<HTMLButtonElement>(TRIGGER)
    if (trigger === null || trigger.disabled || trigger.getAttribute('aria-disabled') === 'true') return
    event.preventDefault()
    event.stopPropagation()
    trigger.focus({ preventScroll: true })
    if (row.matches('[data-dsh-claude-part~="row-menu-open"]')) return
    trigger.click()
    // A keyboard-opened row may reveal its trigger only after React commits menuOpen.
    queueMicrotask(() => { if (disposed === false && trigger.isConnected) trigger.focus({ preventScroll: true }) })
  }
  function keyboard(event: Event) {
    const key = event as KeyboardEvent
    if (key.ctrlKey || key.altKey || key.metaKey || key.repeat) return
    if (key.key === 'ContextMenu' || (key.key === 'F10' && key.shiftKey)) open(key)
  }
  root.addEventListener('contextmenu', open)
  root.addEventListener('keydown', keyboard)
  return () => {
    disposed = true
    root.removeEventListener('contextmenu', open)
    root.removeEventListener('keydown', keyboard)
  }
}
