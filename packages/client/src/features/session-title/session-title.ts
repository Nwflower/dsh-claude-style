import { cacheFirstMatch, currentSessionId, hostRenameSession, hostSessions } from '@dsh-claude-style/engine/host'
import { inPageBox } from '../../shared/page-zoom'
import { copy } from './copy'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './session-title.manifest'

/**
 * The header's session title is the session's own name. The pointer over it
 * shows the plate the stylesheet paints on the words (session-title.css) and a
 * tip under them naming the press; a press opens a field over the words, and
 * Enter writes the new name through the host's own rename (`session.rename`,
 * packages/engine/src/host.ts), which the session list and this header follow.
 *
 * The last crumb segment is the session the header shows; the segments beside
 * it open their own sessions and are buttons, whose press is left alone, and so
 * is every press outside the title. A header whose session the list does not
 * carry has no name to seed, so its press falls through to the page.
 *
 * The field and the tip stand in the page's own space (shared/page-zoom.ts)
 * over a box measured once: the title they cover does not move while the reader
 * types, and both take that box with them when the page is scaled. The tip is
 * the skin's own element rather than a pseudo-element of the title, because the
 * host clips the crumb row's overflow for its ellipsis. A host that refuses the
 * title keeps the field open and rings it, so the draft is not lost.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  /** The title's own seat: the last crumb segment, whose words are the session's name. */
  const CURRENT = '[data-dsh-claude-part~="header-title"] > [data-dsh-claude-part~="header-crumb"]:last-child'
  /** The words inside that segment: the host's current crumb's own box. */
  const WORDS = ':scope > span:last-of-type'
  /** The field's own mark, read by its rule in this feature's stylesheet. */
  const FIELD = 'dsh-claude-session-title'
  /** The tip's own mark, read by its rule in the same stylesheet. */
  const TIP = 'dsh-claude-session-title-tip'
  /** A press inside one of these opens something else: the parent crumbs, a menu the host mounts in the title. */
  const CONTROL = 'button, a, [role="button"], [role="menuitem"]'

  /** The title's seat, cached until the header's own tree changes (D40). */
  const seatOf = cacheFirstMatch<HTMLElement>(CURRENT)
  /** The field while it stands. */
  let field: HTMLInputElement | null = null
  /** The session the open field writes to. */
  let openedFor: string | null = null
  /** The tip while it shows. */
  let tip: HTMLElement | null = null
  /** Whether the host is still answering the last write: blur and Enter must not send the same draft twice. */
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

  /**
   * The words' own line, in the page's pixels: the text the crumb draws, without
   * the padding the host puts round it. A host that renders the name as an
   * element wrapping no text of its own still answers, with that element's box.
   */
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

  /**
   * Stand the tip under the words, over the box they carry now. Its own box is
   * read after the element is in the page, and the words' box is measured on
   * every move of the pointer into them: the host re-renders the row, and the
   * title's width follows the words the reader has just renamed.
   */
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
    // Cleared first: taking a focused field out fires its blur, and that blur
    // must not write the draft a second time.
    field = null
    openedFor = null
    answering = false
    input.remove()
  }

  /**
   * Write the draft through the host's rename. An empty draft cancels: the host
   * normalizes what it accepts, and a title cleared to nothing is a rename no
   * reader meant. A refusal — answered or thrown — keeps the draft open with the
   * field ringed, which is the one place this failure can stop (D12).
   */
  function commit() {
    const input = field
    // The host already has the last draft: a blur that follows the press of
    // Enter must not send the same words again.
    if (input === null || answering) return
    // The session the field was opened on, not the one the page shows now: a
    // switch behind the open field must not move the new name to another row.
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
    // The words' own text, not the segment's box: the host pads that box, and the
    // field draws the same words again, so it takes the words' line and grows on
    // both sides by its own ring and padding, which the sheet sets.
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

  // Listeners on the document: the header is the host's, and it mounts, replaces
  // and re-renders its title row without telling the skin.
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
