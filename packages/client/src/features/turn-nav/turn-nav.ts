import { requestFrame } from '../../core/frame'
import { QUIET_ATTR } from '../../constants'
import { conversationSessionId, findConversationSession } from '../../core/host'
import { motionReduced } from '../../core/prefs'
import { createTurnNavHost } from './turn-nav-host'
import type { TurnItem } from './turn-nav-host'
import { CHAT_TURN_ATTRIBUTE, FOREGROUND_SELECTOR, PEER_SHEET_SELECTOR, TURN_RAIL_CURRENT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { buildElement, closestFrom } from '../../shared/dom'
import { POPOVER_CLOSE_DELAY, closeOtherPopovers, createHoverIntent, registerPopover, unregisterPopover } from '../../shared/popover'
import { easeScrollFor, holdReader, scrollPositionFor, writeScroll } from '../../shared/scroll-owner'
import type { HostContext } from '../../core/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './turn-nav.manifest'

/**
 * The conversation navigator (docs/decisions D34): the turn rail at
 * the conversation's right edge, drawn by the skin at the pitch of the list
 * it opens into.
 *
 * The host draws its own rail (ui-chat's TurnNavigator, read through
 * turn-nav-host.ts): one short mark per turn, ten pixels apart, following
 * the reading position, a mark's click jumping to its turn. The skin draws
 * its rail in the same seat, one mark per turn at the card's row pitch, and
 * keeps the host's rail laid out but unseen: the host's marks are what a
 * jump presses, and its current mark is the reading position the skin's
 * rail follows. On top of that rail:
 *
 *   list     the pointer reaching the rail opens a card over it, one row per
 *            turn with the prompt that opened it. Each row sits exactly
 *            where its mark was — the turn being read stays where its mark
 *            stood, under the hand stays the turn that was under it — and
 *            the card's wheel scrolls rail and rows together. A press jumps.
 *   keys     Alt+↑ / Alt+↓ jump to the previous or the next turn.
 *   landing  the turn a jump lands on shows a short line over its first row.
 *
 * The skin's rail sits in the host's own slot beside the host's rail and
 * takes its seat from the same rules the host's stylesheet places its rail
 * with (turn-nav.css), so placing it reads no layout. Layout is read when
 * the card opens, and when the reading position moved the current mark.
 *
 * @param ctx - client context.
 * @param ui - the shared handle table.
 * @returns teardown.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  /** On the host's rail while the skin's rail stands in for it: the stylesheet hides it, keeping its layout. */
  const TURN_NAV_REPLACED_ATTR = 'data-dsh-claude-turn-nav-replaced'
  /** On the skin's rail while the card is open over it: its marks step back. */
  const TURN_NAV_OPEN_ATTR = 'data-dsh-claude-turn-nav-open'
  /** On the first row of the turn a jump landed on, while its line shows. */
  const TURN_NAV_LANDED_ATTR = 'data-dsh-claude-turn-nav-landed'
  /** The card's name in the popover registry (D16). */
  const TURN_NAV_POPOVER = 'turnNav'
  /** One turn's height on the rail and in the card: the two have to match for a row to sit on its mark. */
  const TURN_NAV_PITCH = 24
  /**
   * The last stretch of a jump that is glided: about a third of a second on
   * the scroll curve. Neighbouring turns sit a screen or more apart, and
   * gliding the whole way kept the reader waiting most of a second.
   */
  const TURN_NAV_GLIDE_LEAD_PX = 480
  /** How long the landing line stays: its animation (turn-nav.css) plus a frame. */
  const LANDED_MS = 1500
  /** How long a jump to a turn outside the loaded window may take to bring its rows in. */
  const LANDING_WAIT_MS = 10000
  /**
   * A key pressed again within this window steps on from the turn the last
   * key went to: the reading position is still on its way there, and
   * reading it would send a held key back to the turn it just left.
   */
  const KEY_REPEAT_MS = 1200
  /** dsh-plugin-msg-nav's stylesheet, in the head while its browser half is live. */
  const MSG_NAV_STYLE_SELECTOR = PEER_SHEET_SELECTOR

  const host = createTurnNavHost(ctx)

  /** The skin's rail, the track its marks ride on, and the host rail it stands over. */
  let rail: HTMLElement | null = null
  let track: HTMLElement | null = null
  let hostRail: HTMLElement | null = null
  /** The turns the rail's marks show, mark for mark, and how far the track is scrolled. */
  let drawnItems: TurnItem[] | null = null
  let offset = 0
  /** The host's current mark last read, and the place it gave; -1 when there is none. */
  let currentMark: HTMLElement | null = null
  let current = -1
  /** The card, its scrolling list, and the turns its rows show (null when the rows must be rebuilt). */
  let card: HTMLElement | null = null
  let list: HTMLElement | null = null
  let rowItems: TurnItem[] | null = null
  let open = false
  /** Cancels the frame a coalesced refresh waits on. */
  let cancelRefreshFrame: (() => void) | null = null
  /** The turn the last key went to, and when. */
  let keyJump: { sessionId: string, turn: number, at: number } | null = null
  /** The turn whose first row should show the landing line once it is in the window. */
  let landing: { turn: number, since: number } | null = null
  let landedRow: Element | null = null
  let landedTimer: ReturnType<typeof setTimeout> | null = null
  /** Set by the teardown: a glide in flight gives way. */
  let stopped = false

  /* ---------- the rail ---------- */

  /** @returns the skin's rail, built the first time. */
  function ensureRail() {
    if (rail !== null) return rail
    const built = buildElement('div', 'dsh-claude-turn-rail')
    built.setAttribute('aria-hidden', 'true')
    // The marks change with the reading position; none of that is news to a pass.
    built.setAttribute(QUIET_ATTR, '')
    track = buildElement('div', 'dsh-claude-turn-rail-track')
    built.appendChild(track)
    built.addEventListener('pointerenter', openCard)
    rail = built
    return built
  }

  /** Stand the skin's rail beside the host's, in the host's slot, and hide the host's. */
  function mountRail(found: HTMLElement) {
    const mounted = ensureRail()
    if (hostRail !== found) {
      if (hostRail !== null) hostRail.removeAttribute(TURN_NAV_REPLACED_ATTR)
      hostRail = found
      found.setAttribute(TURN_NAV_REPLACED_ATTR, '')
      currentMark = null
      current = -1
    }
    // The host's rail sits in its slot.
    if (mounted.parentElement !== found.parentElement) found.parentElement!.appendChild(mounted)
  }

  /** Take the skin's rail away and give the host's back. */
  function unmountRail() {
    closeCard()
    if (hostRail !== null) hostRail.removeAttribute(TURN_NAV_REPLACED_ATTR)
    hostRail = null
    if (rail !== null && rail.parentElement !== null) rail.remove()
    drawnItems = null
    currentMark = null
    current = -1
  }

  /** One mark per turn; a turn outside the loaded window is drawn fainter, as the host draws it. */
  /** Runs only while the rail is mounted. */
  function drawMarks(items: TurnItem[]) {
    if (drawnItems === items) return
    drawnItems = items
    const marks = document.createDocumentFragment()
    for (let i = 0; i < items.length; i++) {
      const mark = buildElement('span', 'dsh-claude-turn-rail-mark')
      mark.style.top = `${i * TURN_NAV_PITCH}px`
      if (!items[i].loaded) mark.setAttribute('data-unloaded', '')
      marks.appendChild(mark)
    }
    track!.replaceChildren(marks)
    track!.style.height = `${items.length * TURN_NAV_PITCH}px`
    rail!.style.setProperty('--dsh-claude-turn-rail-height', `${items.length * TURN_NAV_PITCH}px`)
    current = -1
    currentMark = null
  }

  /**
   * Scroll the track, kept within its turns, and say which ends have more.
   * Runs only while the rail is mounted with its marks drawn.
   */
  function setOffset(value: number) {
    const height = rail!.clientHeight
    const most = Math.max(0, drawnItems!.length * TURN_NAV_PITCH - height)
    offset = Math.round(Math.min(Math.max(value, 0), most))
    track!.style.transform = `translateY(${-offset}px)`
    rail!.toggleAttribute('data-fade-top', offset > 0)
    rail!.toggleAttribute('data-fade-bottom', offset < most)
  }

  /** Bring the current mark into view, centred, when it is not well inside it. */
  function follow() {
    if (current < 0 || open || rail === null) return
    const height = rail.clientHeight
    const top = current * TURN_NAV_PITCH
    if (top >= offset + TURN_NAV_PITCH && top + 2 * TURN_NAV_PITCH <= offset + height) return
    setOffset(top - (height - TURN_NAV_PITCH) / 2)
  }

  /**
   * Read the reading position off the host's current mark and mark it on
   * the rail and the open card. The host's mark element and its place are
   * compared first, so a pass that finds them as they were reads no layout.
   */
  function markCurrent(found: HTMLElement, items: TurnItem[]) {
    const mark = found.querySelector<HTMLElement>(TURN_RAIL_CURRENT_SELECTOR)
    if (mark === currentMark && (mark === null || Number(mark.dataset.index) === current)) return
    currentMark = mark
    const next = host.currentIndex(found, items)
    if (next === current) return
    setCurrentRow(track!, current, next)
    if (open) setCurrentRow(list!, current, next)
    current = next
    follow()
  }

  function setCurrentRow(parent: Element, from: number, to: number) {
    const previous = from < 0 ? undefined : parent.children[from]
    if (previous !== undefined) previous.removeAttribute('data-current')
    const next = to < 0 ? undefined : parent.children[to]
    if (next !== undefined) next.setAttribute('data-current', '')
  }

  /** Re-read the reading position once per frame while the conversation scrolls. */
  function scheduleRefresh() {
    if (cancelRefreshFrame !== null) return
    cancelRefreshFrame = requestFrame({
      write() {
        cancelRefreshFrame = null
        if (hostRail === null || drawnItems === null) return
        markCurrent(hostRail, drawnItems)
        if (open) placeCard()
      },
    })
  }

  /* ---------- the card ---------- */

  /** The rail, while a host rail it stands beside is found (the card opens from it). */
  function mountedRail() {
    if (rail === null) throw new Error('dsh-claude-style: the turn rail is not built')
    return rail
  }

  /** The card, once ensureCard built it. */
  function builtCard() {
    if (card === null) throw new Error('dsh-claude-style: the turn card is not built')
    return card
  }

  function ensureCard() {
    if (card !== null) return
    const built = buildElement('div', 'dsh-claude-popover-card dsh-claude-turn-nav')
    built.setAttribute('data-open', 'false')
    // Rows are rebuilt while the card is open; none of that is news to a pass.
    built.setAttribute(QUIET_ATTR, '')
    const rows = buildElement('div', 'dsh-claude-turn-nav-list')
    built.appendChild(rows)
    built.addEventListener('mouseenter', () => { hoverIntent.cancel() })
    built.addEventListener('mouseleave', () => { hoverIntent.scheduleClose() })
    rows.addEventListener('click', onRowClick)
    rows.addEventListener('scroll', () => { if (open) setOffset(rows.scrollTop) }, { passive: true })
    card = built
    list = rows
  }

  /**
   * Build the rows when the turns changed. A turn without a prompt (one
   * opened by something other than a message) reads as the host's own
   * 「第 N 轮」, the words its rail preview gives it.
   */
  function renderRows(list: HTMLElement, items: TurnItem[], chat: (key: string, params: { turn: number }) => string) {
    if (rowItems === items) return
    rowItems = items
    const rows = document.createDocumentFragment()
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const row = buildElement('button', 'dsh-claude-turn-nav-row')
      row.type = 'button'
      row.dataset.index = String(i)
      row.setAttribute('aria-label', chat('chat.turnNavigation.jump', { turn: item.turn }))
      if (!item.loaded) row.setAttribute('data-unloaded', '')
      if (i === current) row.setAttribute('data-current', '')
      row.appendChild(buildElement('span', 'dsh-claude-turn-nav-text', item.prompt !== '' ? item.prompt : chat('chat.turnNavigation.turn', { turn: item.turn })))
      row.appendChild(buildElement('span', 'dsh-claude-turn-nav-dash'))
      rows.appendChild(row)
    }
    list.replaceChildren(rows)
  }

  /**
   * Lay the card over the rail row for mark: the list's box on the rail's
   * box and scrolled as far as the rail's track, each row's dash on its
   * mark — a mark is drawn against the rail's right edge, a row's dash
   * against the row's right padding inside the card's padding and border.
   *
   * The card hangs in the rail's own slot, inside the conversation pane:
   * a pointer on it is a pointer on the pane, so everything the pane
   * reveals on hover (the Chat / Trajectory tabs among them) stays up while
   * the card is read. The slot is the card's containing block, so the seat
   * is measured from the slot's box.
   */
  function placeCard() {
    // Only while the card is open: the rail is mounted in its slot and the card is built.
    const rail = mountedRail()
    const card = builtCard()
    const list = card.querySelector<HTMLElement>(':scope > .dsh-claude-turn-nav-list')!
    const slot = rail.parentElement!
    if (card.parentElement !== slot) slot.appendChild(card)
    const frame = slot.getBoundingClientRect()
    const box = rail.getBoundingClientRect()
    const cardStyle = getComputedStyle(card)
    const row = list.firstElementChild
    const rowInset = row === null ? 0 : parseFloat(getComputedStyle(row).paddingRight)
    // Unrounded: the rail sits on a half pixel whenever the band's height is odd.
    const right = `${frame.right - box.right - parseFloat(cardStyle.borderRightWidth) - parseFloat(cardStyle.paddingRight) - rowInset}px`
    const top = `${box.top - frame.top - parseFloat(cardStyle.borderTopWidth) - parseFloat(cardStyle.paddingTop)}px`
    const height = `${box.height}px`
    if (card.style.right !== right) card.style.right = right
    if (card.style.top !== top) card.style.top = top
    if (list.style.height !== height) list.style.height = height
    if (list.scrollTop !== offset) list.scrollTop = offset
  }

  function openCard() {
    hoverIntent.cancel()
    if (open || hostRail === null || drawnItems === null) return
    const chat = host.chatText()
    if (chat === null) return
    closeOtherPopovers(TURN_NAV_POPOVER)
    ensureCard()
    renderRows(list!, drawnItems, chat)
    open = true
    mountedRail().setAttribute(TURN_NAV_OPEN_ATTR, '')
    builtCard().setAttribute('data-open', 'true')
    placeCard()
  }

  function closeCard() {
    hoverIntent.cancel()
    if (!open) return
    open = false
    builtCard().setAttribute('data-open', 'false')
    if (rail !== null) {
      rail.removeAttribute(TURN_NAV_OPEN_ATTR)
      follow()
    }
  }

  /** Only the close is delayed: the grace that lets the pointer come back to the card. */
  const hoverIntent = createHoverIntent(openCard, closeCard, 0, POPOVER_CLOSE_DELAY)

  function onRowClick(event: MouseEvent) {
    const row = closestFrom(event.target, '.dsh-claude-turn-nav-row')
    if (row === null || rowItems === null) return
    const item = rowItems[Number(row.dataset.index)]
    if (item !== undefined) jumpTo(item.turn)
  }

  /* ---------- the jump and its landing ---------- */

  /**
   * Walk the conversation from where it was to where the host just put it,
   * through the scroll owner (shared/scroll-owner.ts, D41).
   *
   * The host lands a loaded turn inside the press itself, writing the
   * position in one frame; that write is taken back before the frame paints
   * and the distance glided. A turn outside the loaded window is landed later,
   * after its history arrives, and that landing stays the host's. The glide
   * gives way the moment anybody else moves the position — the reader's
   * wheel, the host correcting for a row that changed size.
   */
  function glideLanding(scroller: HTMLElement | null, before: number | null) {
    if (scroller === null || before === null || motionReduced()) return
    const landed = scroller.scrollTop
    if (Math.abs(landed - before) <= 1) return
    if (!writeScroll(scroller, before, 'jump')) return
    easeScrollFor(scroller, 'jump', () => landed, () => {
      if (stopped) return false
      const written = scrollPositionFor(scroller)
      return written === null || Math.abs(scroller.scrollTop - written) <= 1.5
    }, TURN_NAV_GLIDE_LEAD_PX)
  }

  /** Press the host's mark for one turn, glide to where it lands, and line the landed turn. */
  function jumpTo(turn: number) {
    host.jumpToTurn(turn, (scroller, before) => {
      // A jump is the reader choosing where to read: the follow stands down the
      // way it does after his own wheel, or the next burst of output drags him
      // back to the end. Landing at the end releases the hold again.
      if (scroller !== null) holdReader(scroller)
      glideLanding(scroller, before)
      landing = { turn, since: Date.now() }
      // A loaded turn has landed by now; one outside the window lands when
      // its rows arrive, which a pass sees.
      stampLanding()
      scheduleRefresh()
    })
  }

  /** Take the landing line off its row. */
  function clearLanded() {
    if (landedTimer !== null) {
      clearTimeout(landedTimer)
      landedTimer = null
    }
    if (landedRow !== null) {
      landedRow.removeAttribute(TURN_NAV_LANDED_ATTR)
      landedRow = null
    }
  }

  /** Put the landing line on the landed turn's first row, once that row is in the window. */
  function stampLanding() {
    if (landing === null) return
    if (Date.now() - landing.since > LANDING_WAIT_MS) {
      landing = null
      return
    }
    const session = findConversationSession()
    const row = session === null ? null : session.querySelector(`[${CHAT_TURN_ATTRIBUTE}="${landing.turn}"]:not([hidden]):not([hidden] *)`)
    if (row === null) return
    landing = null
    clearLanded()
    row.setAttribute(TURN_NAV_LANDED_ATTR, '')
    landedRow = row
    landedTimer = setTimeout(clearLanded, LANDED_MS)
  }

  /* ---------- the keys ---------- */

  /**
   * Whether the key went to a field holding a draft: the arrow moves the
   * caret there, and taking it would pull the view away from what is being
   * written. An empty field (the composer right after sending) is no draft.
   */
  function holdsDraft(target: EventTarget | null) {
    if (!(target instanceof Element)) return false
    if (target.tagName === 'SELECT') return true
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return target.value !== ''
    if (target instanceof HTMLElement && target.isContentEditable) return (target.textContent || '').trim() !== ''
    return false
  }

  /** Alt+↑ / Alt+↓: the previous or the next turn, from the one being read. */
  function onKey(event: KeyboardEvent) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return
    // dsh-plugin-msg-nav answers the same keys with its own jump; two jumps
    // from one key fight over the view, so the keys stay with it.
    if (document.head.querySelector(MSG_NAV_STYLE_SELECTOR) !== null) return
    if (holdsDraft(event.target) || document.querySelector(FOREGROUND_SELECTOR) !== null) return
    const found = host.findRail()
    const sessionId = conversationSessionId(findConversationSession())
    if (found === null || sessionId === null || !host.railShown(found)) return
    const items = host.turnItems(sessionId)
    const now = Date.now()
    const last = keyJump
    const from = last !== null && last.sessionId === sessionId && now - last.at < KEY_REPEAT_MS
      ? items.findIndex(item => item.turn === last.turn)
      : host.currentIndex(found, items)
    const to = event.key === 'ArrowDown' ? (from < 0 ? 0 : from + 1) : from - 1
    if (to < 0 || to >= items.length) return
    event.preventDefault()
    keyJump = { sessionId, turn: items[to].turn, at: now }
    jumpTo(items[to].turn)
  }

  registerPopover(TURN_NAV_POPOVER, closeCard)

  ui.turnNav = {
    sync() {
      const found = host.findRail()
      const sessionId = conversationSessionId(findConversationSession())
      const chat = host.chatText()
      if (found === null || sessionId === null || chat === null) {
        unmountRail()
      } else {
        const items = host.turnItems(sessionId)
        mountRail(found)
        const redrawn = drawnItems !== items
        drawMarks(items)
        if (redrawn) setOffset(offset)
        markCurrent(found, items)
        if (open && redrawn) {
          // A turn arrived under the open card: its rows, and its seat with the rail's new height.
          renderRows(list!, items, chat)
          scheduleRefresh()
        }
      }
      stampLanding()
    },
    owns(target: Node) {
      return (card !== null && card.contains(target)) || (rail !== null && rail.contains(target))
    },
    close() {
      closeCard()
    },
    onKey,
    /** The shell language changed: the rows' words are rebuilt the next time they show. */
    onCopyChange() {
      rowItems = null
    },
    /** A scroll or a resize: the reading position may have moved, and the card's seat with the rail. */
    reposition() {
      if (hostRail !== null) scheduleRefresh()
    },
  }

  return () => {
    stopped = true
    host.stop()
    if (cancelRefreshFrame !== null) cancelRefreshFrame()
    cancelRefreshFrame = null
    unmountRail()
    rail = null
    track = null
    clearLanded()
    landing = null
    if (card !== null) card.remove()
    card = null
    list = null
    rowItems = null
    unregisterPopover(TURN_NAV_POPOVER)
    delete ui.turnNav
  }
}
