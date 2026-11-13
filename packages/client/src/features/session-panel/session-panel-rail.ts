import * as React from 'react'
import { BOTTOM_PANEL_SELECTOR, CONVERSATION_HEADER_SELECTOR, CONVERSATION_SCROLL_SELECTOR, CONVERSATION_SESSION_ATTRIBUTE, CONVERSATION_SESSION_SELECTOR, FLOW_KIND_ATTRIBUTE, RIGHTBAR_COLLAPSED_ATTRIBUTE, RIGHTBAR_COLUMN_SELECTOR, SIDEBAR_CHAT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeMarker, observeMatches, observeSize, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { cacheFirstMatch, findRightbarToggle } from '@dsh-claude-style/engine/host'
import { conversationScroller } from '@dsh-claude-style/engine/chat-dom'
import { PART_ATTR } from '../../constants'
import { SESSION_PANEL_ATTR } from '../../constants'
import { FRAME_SELECTOR } from '../../shared/page-scale-columns'
import { copy } from './copy'
import { setRailOpen, setRailToggle } from './session-panel-state'
import { PanelBody } from './session-panel-body'
import type { PanelPreset } from './session-panel-body'

const h = React.createElement

/** The seats the rail reads the page's own marks from; they are the skin's parts, not host selectors. */
const CENTER = `[${PART_ATTR}~="center-column"]`
const PRESET = `[${PART_ATTR}~="header-label"]`

/** The window and column widths that open and retreat the rail (D94).
 *
 * The rail needs a wide window and a conversation column that keeps a usable
 * chat beside it: the window alone would open it over a chat squeezed by the
 * host's own right column, and the column alone leaves a small window's chat
 * with no room for the rail.
 */
const OPEN_WINDOW = 1360
const OPEN_COLUMN = 860
const CLOSE_WINDOW = 1180
const CLOSE_COLUMN = 760

/**
 * The reader's own closing of the rail, kept in this browser: a rail put away
 * by hand stays away in every session and across a restart, until the header's
 * control is pressed again (D94).
 */
const CLOSED_STORAGE = 'dsh-claude-style.sessionPanelClosed'

function storedClosed() {
  return localStorage.getItem(CLOSED_STORAGE) === '1'
}

function storeClosed(closed: boolean) {
  if (closed) localStorage.setItem(CLOSED_STORAGE, '1')
  else localStorage.removeItem(CLOSED_STORAGE)
}

/** One box in the page's pixels, as a fixed rail is placed from it. */
interface RailBox {
  top: number
  height: number
  right: number
}

/** The session the conversation shows, followed across a switch and the hero page. */
function useConversationSession() {
  const [reading, setReading] = React.useState<{ id: string | null, live: boolean }>({ id: null, live: false })
  const setSession = (id: string | null) => setReading(previous => (previous.id === id ? previous : { id, live: previous.live }))
  React.useEffect(() => {
    // The element the attribute lands on may exist before the attribute: a
    // cached first match reads it again whenever the page's structure changes.
    const sessionNode = cacheFirstMatch<HTMLElement>(CONVERSATION_SESSION_SELECTOR)
    // The rail belongs to the conversation the reader is looking at: not a new
    // session without a turn yet, not a plugin page's hidden conversation, and
    // not a subagent's own column (D94).
    const live = () => {
      const node = sessionNode()
      if (node === null || node === undefined || !node.isConnected) return false
      if (node.closest(SIDEBAR_CHAT_SELECTOR) !== null) return false
      const scroller = node.closest(CONVERSATION_SCROLL_SELECTOR) ?? conversationScroller()
      if (!(scroller instanceof HTMLElement) || !scroller.checkVisibility()) return false
      return scroller.querySelector(`[${FLOW_KIND_ATTRIBUTE}]`) !== null
    }
    const read = () => {
      const node = sessionNode()
      const id = node?.getAttribute(CONVERSATION_SESSION_ATTRIBUTE) ?? null
      setReading(previous => ({ id, live: live() }))
    }
    const stop = subscribeMutations(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-phase', CONVERSATION_SESSION_ATTRIBUTE, FLOW_KIND_ATTRIBUTE],
    }, read)
    read()
    return stop
  }, [])
  return reading
}

/** The preset's own words and its description, as the header's label carries them (D94). */
function usePresetLabel() {
  const [preset, setPreset] = React.useState<PanelPreset>({ label: '', hint: '' })
  React.useEffect(() => {
    const presets = observeMarker<HTMLElement>(PRESET)
    const read = () => {
      const node = presets.all()[0]
      const label = (node?.textContent ?? '').trim()
      const hint = (node?.getAttribute('title') ?? '').trim()
      setPreset(previous => (previous.label === label && previous.hint === hint ? previous : { label, hint }))
    }
    const stop = subscribeMutations(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [PART_ATTR, 'title'] }, read)
    read()
    return () => {
      stop()
      presets.release()
    }
  }, [])
  return preset
}

/**
 * Whether the details rail stands open, and where (D94).
 *
 * It opens itself when the conversation's column is wide enough and steps back
 * when the frame narrows. A reader who closes it keeps it closed everywhere:
 * each session starts from that stored choice. A reader who presses it open
 * clears the choice, holds it open for that session whatever the width, and
 * leaves the next session to the width again.
 *
 * The box is written onto the node as it is measured rather than carried through
 * a render: the host animates its own columns, and the rail's edge has to travel
 * with the chat's edge frame by frame instead of a frame behind it. Its top edge
 * is the conversation header's bottom one, so the header's controls stand above
 * the rail and the rail runs the height of the chat alone. The side the
 * host's own right column holds is read from the frame's mark, which the host
 * writes as that column starts to move, so the rail arrives and leaves on the
 * frame the handover begins rather than after it has finished.
 */
function useRailReading(session: string | null) {
  const [open, setOpen] = React.useState(false)
  /** The rail's own node, mounted a frame before the first measurement reaches it. */
  const node = React.useRef<HTMLElement | null>(null)
  /** The rail's place in the page's pixels, as the last measurement read it. */
  const box = React.useRef<RailBox | null>(null)
  const place = React.useCallback(() => {
    const target = node.current
    const next = box.current
    if (target === null || next === null) return
    target.style.top = `${next.top}px`
    target.style.height = `${next.height}px`
    target.style.right = `${next.right}px`
  }, [])
  /** The rail hands its node over here; its place is on it before the first paint. */
  const attach = React.useCallback((next: HTMLElement | null) => {
    node.current = next
    place()
  }, [place])
  /** The reader's own choice as this session holds it: auto follows the width, open and closed stand. */
  const choice = React.useRef<{ session: string | null, mode: 'auto' | 'open' | 'closed' }>({ session: null, mode: 'auto' })
  /** Whether the host's own right column holds this side now, as the last measurement read it. */
  const held = React.useRef(false)
  /** The same question asked of the page at the moment it matters: a press may come before the last measurement did. */
  const holdsSide = React.useRef<() => boolean>(() => false)
  React.useEffect(() => {
    let stopSize: (() => void) | null = null
    let stopHostSize: (() => void) | null = null
    let stopHeadSize: (() => void) | null = null
    let center: HTMLElement | null = null
    let host: HTMLElement | null = null
    let head: HTMLElement | null = null
    let panel: HTMLElement | null = null
    const frame = cacheFirstMatch<HTMLElement>(FRAME_SELECTOR)
    /** Whether the host's own right column holds this side now. */
    const hostHolds = () => {
      const shell = frame()
      // The frame states the owner of that side as the handover starts, before
      // its columns have moved: that statement is the intent, and the width the
      // animation still shows is only how far the move has got (D94).
      if (shell !== null && shell !== undefined) return !shell.hasAttribute(RIGHTBAR_COLLAPSED_ATTRIBUTE)
      // A shell the part walk has not marked: the column's own width is all there is to read.
      return host !== null && host.isConnected && host.getBoundingClientRect().width > 0
    }
    holdsSide.current = hostHolds
    const measure = () => {
      const rect = center === null ? null : center.getBoundingClientRect()
      // The rail starts under the conversation header: the header keeps the
      // column's whole width so its controls stand above the rail, and the column
      // beside it belongs to the chat alone (D94). A header the part walk has not
      // marked yet, one the band has lifted into the caption row, or one an older
      // host draws without a box leaves the column's own top as the start.
      const headRect = head === null ? null : head.getBoundingClientRect()
      let top = rect === null ? 0 : Math.round(rect.top)
      if (rect !== null && headRect !== null && headRect.height > 0) {
        top = Math.min(Math.max(Math.round(headRect.bottom), top), Math.round(rect.bottom))
      }
      // The rail may stand without the column part (an older host): it then
      // takes the window's right edge, and only the window rule decides.
      // The bottom panel `dsh-better-sidebar` floats over the conversation's
      // lower edge, wider than the column the rail squeezes: the rail stops at
      // the panel's top rather than standing over it, so both stay readable
      // (D94).
      const panelTop = panel === null || panel.getClientRects().length === 0
        ? null
        : Math.round(panel.getBoundingClientRect().top)
      const columnBottom = rect === null ? window.innerHeight : Math.round(rect.bottom)
      const floor = panelTop === null ? columnBottom : Math.min(columnBottom, panelTop)
      box.current = {
        top,
        height: Math.max(0, floor - top),
        right: rect === null ? 0 : Math.round(window.innerWidth - rect.right),
      }
      place()
      if (choice.current.session !== session) choice.current = { session, mode: storedClosed() ? 'closed' : 'auto' }
      // The host's own right column stands on this same side, so it comes
      // first: while it holds the side the rail keeps away, automatic and
      // pressed alike, and the reader's choice stands again once that column
      // gives the side up (D94).
      held.current = hostHolds()
      if (choice.current.mode !== 'auto') {
        setOpen(choice.current.mode === 'open' && !held.current)
        return
      }
      const windowWide = window.innerWidth >= OPEN_WINDOW
      const columnWide = rect === null || rect.width >= OPEN_COLUMN
      const windowNarrow = window.innerWidth < CLOSE_WINDOW
      const columnNarrow = rect !== null && rect.width < CLOSE_COLUMN
      setOpen(current => !held.current && (current ? !windowNarrow && !columnNarrow : windowWide && columnWide))
    }
    const columns = observeMarker<HTMLElement>(CENTER)
    const hostColumns = observeMarker<HTMLElement>(RIGHTBAR_COLUMN_SELECTOR)
    let stopPanelSize: (() => void) | null = null
    const bind = () => {
      const next = columns.all()[0] ?? null
      const nextHost = hostColumns.all()[0] ?? null
      const nextHead = next === null ? null : next.querySelector<HTMLElement>(CONVERSATION_HEADER_SELECTOR)
      const nextPanel = bottomPanels.all()[0] ?? null
      // The host rebuilds both columns while a turn streams: each new node is
      // watched afresh, and either one's width change places the rail again.
      if (next !== center || nextHost !== host || nextHead !== head || nextPanel !== panel) {
        if (stopSize !== null) stopSize()
        if (stopHostSize !== null) stopHostSize()
        if (stopHeadSize !== null) stopHeadSize()
        if (stopPanelSize !== null) stopPanelSize()
        stopSize = null
        stopHostSize = null
        stopHeadSize = null
        stopPanelSize = null
        center = next
        host = nextHost
        head = nextHead
        panel = nextPanel
        if (center !== null) stopSize = observeSize(center, measure)
        if (host !== null) stopHostSize = observeSize(host, measure)
        // The header's own height is where the rail starts: a second line of view
        // tabs or a title row that wraps takes the rail's top edge with it.
        if (head !== null) stopHeadSize = observeSize(head, measure)
        if (panel !== null) stopPanelSize = observeSize(panel, measure)
      }
      if (center === null) {
        box.current = null
        setOpen(false)
        return
      }
      measure()
    }
    // The parts walk marks the column after the first frame, so its arrival is
    // an attribute change, not a child-list one; so is the frame's statement of
    // which side it gives the host's own right column. The bottom panel mounts
    // inside the frame, where the body's own child list does not reach: its kept
    // matches are what bring the rail's floor back and take it up again.
    const bottomPanels = observeMatches<HTMLElement>(BOTTOM_PANEL_SELECTOR, bind)
    const stopParts = subscribeMutations(document.body, { subtree: true, attributes: true, attributeFilter: [PART_ATTR, RIGHTBAR_COLLAPSED_ATTRIBUTE] }, bind)
    bind()
    // The columns' own size observers report once on attach, which covers a
    // shell that laid out after this feature's first render; no timer wakes a
    // page that has settled.
    window.addEventListener('resize', bind)
    return () => {
      stopParts()
      bottomPanels.release()
      columns.release()
      hostColumns.release()
      window.removeEventListener('resize', bind)
      if (stopSize !== null) stopSize()
      if (stopHostSize !== null) stopHostSize()
      if (stopHeadSize !== null) stopHeadSize()
      if (stopPanelSize !== null) stopPanelSize()
    }
  }, [session, place])
  const close = React.useCallback(() => {
    storeClosed(true)
    choice.current = { session, mode: 'closed' }
    setOpen(false)
  }, [session])
  // The header's control records the reader's explicit choice.
  React.useEffect(() => {
    const flip = () => {
      // The host's own right column standing on this side is the one thing a
      // press always answers, whatever the rail's own state still says: the
      // column is what the reader sees, and a press asks for the rail's side, so
      // the column gives it up and the rail comes in as that column's own
      // animation starts (D94). The page is asked again here, since a press can
      // arrive before any measurement of that column did.
      held.current = holdsSide.current()
      if (held.current) {
        storeClosed(false)
        choice.current = { session, mode: 'open' }
        findRightbarToggle()?.click()
        setOpen(true)
        return
      }
      if (open) close()
      else {
        storeClosed(false)
        choice.current = { session, mode: 'open' }
        setOpen(true)
      }
    }
    setRailToggle(flip)
    return () => { setRailToggle(null) }
  }, [open, session, close])
  React.useEffect(() => {
    setRailOpen(open)
  }, [open])
  return { open, attach, node }
}

/** The stretch the rail's own width transition takes, as the stylesheet resolved it. */
function widthTransitionMs(node: HTMLElement) {
  const duration = getComputedStyle(node).transitionDuration.split(',')[0]?.trim() ?? '0s'
  const ms = duration.endsWith('ms') ? Number.parseFloat(duration) : Number.parseFloat(duration) * 1000
  return Number.isFinite(ms) ? ms : 0
}

/** The conversation's details rail: the session overview the reader keeps beside the chat (D94). */
export function SessionPanelRail() {
  const { id: session, live } = useConversationSession()
  const preset = usePresetLabel()
  const { open, attach, node } = useRailReading(session)
  // The body keeps the words of the session it was showing while the rail gives
  // its width back.
  const bodySession = React.useRef<string | null>(null)
  if (session !== null) bodySession.current = session
  // The page mark gives the rail its width out of the conversation's body, under
  // the header. It states what the rail is about to do, so it goes on and comes
  // off in the same commit as the rail's own width: both transitions start on one
  // frame, and the chat's edge and the rail's edge travel as one (D94).
  const wanted = session !== null && live && open
  React.useLayoutEffect(() => {
    if (wanted) document.body.setAttribute(SESSION_PANEL_ATTR, '')
    else document.body.removeAttribute(SESSION_PANEL_ATTR)
    return () => document.body.removeAttribute(SESSION_PANEL_ATTR)
  }, [wanted])
  // The node outlives the decision by its own exit: the rail stays mounted while
  // it gives the width back, and a press that calls it in again turns the
  // transition around where it stands instead of restarting from nothing (D94).
  // The decision mounts it directly, and the exit is read off the decision rather
  // than stored, so the rail's own width turns in the commit that sets the mark.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    if (wanted) setMounted(true)
  }, [wanted])
  const closing = !wanted && mounted
  React.useEffect(() => {
    if (!closing) return undefined
    const target = node.current
    const done = () => setMounted(false)
    // A reader who asked for no motion has no transition to wait for, and the
    // node goes at once.
    const exitMs = target === null ? 0 : widthTransitionMs(target)
    if (target === null || exitMs <= 0) {
      done()
      return undefined
    }
    const onEnd = (event: TransitionEvent) => {
      if (event.target === target && event.propertyName === 'width') done()
    }
    target.addEventListener('transitionend', onEnd)
    const timer = window.setTimeout(done, exitMs + 50)
    return () => {
      target.removeEventListener('transitionend', onEnd)
      window.clearTimeout(timer)
    }
  }, [closing, node])
  if (!wanted && !mounted) return null
  return h('aside', {
    className: closing ? 'dsh-claude-details is-leaving' : 'dsh-claude-details',
    ref: attach,
    'aria-label': copy('detailsTitle'),
    'aria-hidden': closing ? true : undefined,
  },
  h('div', { className: 'dsh-claude-details-body' },
    h(PanelBody, { key: bodySession.current, sessionId: bodySession.current, preset, active: wanted })))
}
