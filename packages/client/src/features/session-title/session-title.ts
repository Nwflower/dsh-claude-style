import { cacheFirstMatch, currentSessionId, hostRenameSession, hostSessions } from '@dsh-claude-style/engine/host'
import { inPageBox } from '../../shared/page-zoom'
import { copy } from './copy'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './session-title.manifest'

/**
 * Rename the current session through the header's last crumb. The field and tip
 * are page-space elements because the host clips the crumb's overflow; a refused
 * rename keeps the draft open and marks it invalid.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const CURRENT = '[data-dsh-claude-part~="header-title"] > [data-dsh-claude-part~="header-crumb"]:last-child'
  const WORDS = ':scope > span:last-of-type'
  const FIELD = 'dsh-claude-session-title'
  const TIP = 'dsh-claude-session-title-tip'
  /** Controls open their own target instead of the rename field. */
  const CONTROL = 'button, a, [role="button"], [role="menuitem"]'

  const seatOf = cacheFirstMatch<HTMLElement>(CURRENT)
  let field: HTMLInputElement | null = null
  let openedFor: string | null = null
  let tip: HTMLElement | null = null
  /** Guard against sending one draft from both Enter and blur. */
  let answering = false

  /** The session the header shows, and the title the list carries for it now. */
  function target() {
    const sessions = hostSessions(ctx)
    if (sessions === null) return null
    const sessionId = currentSessionId(ctx)
    if (sessionId === null) return null
    const summary = sessions.list.getSnapshot().byId[sessionId]
    if (summary === undefined) return null
    return { sessionId, title: summary.displayTitle }
  }

  /** Measure the crumb's text line, falling back to its box when it wraps no text. */
  function wordsBox(seat: HTMLElement) {
    const words = seat.querySelector<HTMLElement>(WORDS)
    if (words === null) return inPageBox(seat.getBoundingClientRect())
    const range = document.createRange()
    range.selectNodeContents(words)
    const ink = range.getBoundingClientRect()
    range.detach()
    return inPageBox(ink.width > 0 ? ink : words.getBoundingClientRect())
  }

  /** Take the tip away from the page. */
  function hideTip() {
    if (tip === null) return
    tip.remove()
    tip = null
  }

  /** Place the tip under the words, measuring again after each host re-render. */
  function showTip() {
    const seat = seatOf()
    if (seat === null) return
    const words = seat.querySelector<HTMLElement>(WORDS)
    if (words === null) return
    const box = inPageBox(words.getBoundingClientRect())
    if (tip === null) {
      tip = document.createElement('span')
      tip.className = TIP
      tip.textContent = copy('renameSession')
      document.body.append(tip)
    }
    tip.style.left = `${box.left}px`
    tip.style.top = `${box.bottom + 4}px`
  }

  /** Take the field away and hand the title back to the host's own words. */
  function close() {
    const input = field
    hideTip()
    if (input === null) return
    // Clear before removal so the resulting blur cannot write again.
    field = null
    openedFor = null
    answering = false
    input.remove()
  }

  /**
   * Write the draft through the host. Empty cancels; a refusal or throw keeps the
   * field open and invalid (D12).
   */
  function commit() {
    const input = field
    if (input === null || answering) return
    // Rename the session the field was opened on, not a later page switch.
    const sessionId = openedFor
    const title = input.value.trim()
    if (title === '' || sessionId === null) {
      close()
      return
    }
    const answer = hostRenameSession(ctx, sessionId, title)
    if (answer === null) {
      close()
      return
    }
    answering = true
    answer.then((result) => {
      answering = false
      if (result !== null && result !== undefined && result.ok === true) close()
      else input.setAttribute('aria-invalid', 'true')
    }, () => {
      answering = false
      input.setAttribute('aria-invalid', 'true')
    })
  }

  /** Stand the field over one crumb's words, seeded with the title the list holds. */
  function open(spot: HTMLElement) {
    const request = target()
    if (request === null || answering) return
    close()
    const input = document.createElement('input')
    input.type = 'text'
    input.className = FIELD
    input.value = request.title
    input.setAttribute('aria-label', copy('renameSession'))
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        commit()
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        close()
      }
    })
    input.addEventListener('blur', commit)
    document.body.append(input)
    // Fit the words' line, then add the field's own ring and padding.
    const ink = wordsBox(spot)
    const face = getComputedStyle(input)
    const startX = Number.parseFloat(face.paddingLeft) + Number.parseFloat(face.borderLeftWidth)
    const startY = Number.parseFloat(face.paddingTop) + Number.parseFloat(face.borderTopWidth)
    const left = ink.left - startX
    const top = ink.top - startY
    input.style.left = `${left}px`
    input.style.top = `${top}px`
    input.style.minWidth = `${ink.width + startX * 2}px`
    input.style.minHeight = `${ink.height + startY * 2}px`
    field = input
    openedFor = request.sessionId
    input.focus()
    input.select()
  }

  /** The crumb segment this press lands on, or null for a press on a control or outside the title. */
  function titlePress(event: MouseEvent) {
    const pressed = event.target
    if (!(pressed instanceof Element)) return null
    if (pressed.closest(CONTROL) !== null) return null
    return pressed.closest<HTMLElement>(CURRENT)
  }

  function press(event: MouseEvent) {
    const spot = titlePress(event)
    if (spot === null) return
    event.preventDefault()
    open(spot)
  }

  /** The words under the pointer: the tip follows them while the field is closed. */
  function pointerOver(event: PointerEvent) {
    const over = event.target
    if (!(over instanceof Element) || field !== null) return
    const seat = seatOf()
    if (seat === null || over.closest(CURRENT) !== seat || over.closest(CONTROL) !== null) {
      hideTip()
      return
    }
    showTip()
  }

  // Document listeners follow the host replacing its title row.
  document.addEventListener('click', press, true)
  document.addEventListener('pointerover', pointerOver, true)
  document.addEventListener('pointerout', hideTip, true)
  document.addEventListener('scroll', hideTip, true)
  hideTip()

  return () => {
    document.removeEventListener('click', press, true)
    document.removeEventListener('pointerover', pointerOver, true)
    document.removeEventListener('pointerout', hideTip, true)
    document.removeEventListener('scroll', hideTip, true)
    close()
  }
}
