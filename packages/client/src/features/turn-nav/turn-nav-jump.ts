import { CHAT_TURN_ATTRIBUTE, PEER_SHEET_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { conversationSessionId, findConversationSession, findForeground } from '@dsh-claude-style/engine/host'
import { easeScrollFor, holdReader, scrollPositionFor, writeScroll } from '@dsh-claude-style/engine/scroll-owner'
import { motionReduced } from '../../core/prefs'
import { motionMs } from '../../shared/motion'
import type { createTurnNavHost } from '../../shared/turn-nav-host'

/** On the first row of the turn a jump landed on, while its line shows. */
const TURN_NAV_LANDED_ATTR = 'data-dsh-claude-turn-nav-landed'
/**
 * The last stretch of a jump that is glided: about a third of a second on
 * the scroll curve. Neighbouring turns sit a screen or more apart, and
 * gliding the whole way kept the reader waiting most of a second.
 */
const TURN_NAV_GLIDE_LEAD_PX = 480
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

export interface TurnNavJumpDeps {
  host: ReturnType<typeof createTurnNavHost>
  scheduleRefresh(): void
}

/**
 * Turn jump execution, smooth glide landing, landing-line highlight, and
 * Alt+↑ / Alt+↓ keyboard stepping for the conversation navigator.
 */
export function createTurnNavJump({ host, scheduleRefresh }: TurnNavJumpDeps) {
  /** How long the landing line stays: its animation (turn-nav.css) at its own period (D9). */
  const LANDED_MS = motionMs('--dsh-claude-period-landed')
  /** The turn the last key went to, and when. */
  let keyJump: { sessionId: string, turn: number, at: number } | null = null
  /** The turn whose first row should show the landing line once it is in the window. */
  let landing: { turn: number, since: number } | null = null
  let landedRow: Element | null = null
  let landedTimer: ReturnType<typeof setTimeout> | null = null
  /** Set by teardown: a glide in flight gives way. */
  let stopped = false

  /**
   * Walk the conversation from where it was to where the host just put it,
   * through the scroll owner (packages/engine/src/scroll-owner.ts, D40).
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

  /** Alt+↑ / Alt+↓: the previous or the next turn, from the one being read. */
  function onKey(event: KeyboardEvent) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return
    // dsh-plugin-msg-nav answers the same keys with its own jump; two jumps
    // from one key fight over the view, so the keys stay with it.
    if (document.head.querySelector(MSG_NAV_STYLE_SELECTOR) !== null) return
    if (holdsDraft(event.target) || findForeground() !== null) return
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

  function stop() {
    stopped = true
    clearLanded()
    landing = null
    keyJump = null
  }

  return { jumpTo, stampLanding, onKey, stop }
}
