import * as React from 'react'
import { CONVERSATION_SCROLL_SELECTOR, CONVERSATION_SESSION_ATTRIBUTE, CONVERSATION_SESSION_SELECTOR, FLOW_KIND_ATTRIBUTE, SIDEBAR_CHAT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeMarker, observeSize, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { cacheFirstMatch } from '@dsh-claude-style/engine/host'
import { conversationScroller } from '@dsh-claude-style/engine/chat-dom'
import { PART_ATTR } from '../../constants'
import { SESSION_PANEL_ATTR } from '../../constants'
import { copy } from './copy'
import { setRailOpen, setRailToggle } from './session-panel-state'
import { PanelBody } from './session-panel-body'

const h = React.createElement

/** The seats the rail reads the page's own marks from; they are the skin's parts, not host selectors. */
const CENTER = `[${PART_ATTR}~="center-column"]`
const PRESET = `[${PART_ATTR}~="header-label"]`

/** The rail's width, and the window and column widths that open and retreat it (D94). */
const RAIL_WIDTH = 300
/**
 * The rail needs a wide window and a conversation column that keeps a usable
 * chat beside it: the window alone would open it over a chat squeezed by the
 * host's own right column, and the column alone leaves a small window's chat
 * with no room for the rail.
 */
const OPEN_WINDOW = 1360
const OPEN_COLUMN = 860
const CLOSE_WINDOW = 1180
const CLOSE_COLUMN = 760

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

/** The preset's own words, as the header's label carries them (D94). */
function usePresetLabel() {
  const [label, setLabel] = React.useState('')
  React.useEffect(() => {
    const presets = observeMarker<HTMLElement>(PRESET)
    const read = () => setLabel((presets.all()[0]?.textContent ?? '').trim())
    const stop = subscribeMutations(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [PART_ATTR] }, read)
    read()
    return () => {
      stop()
      presets.release()
    }
  }, [])
  return label
}

/**
 * Whether the details rail stands open, and where (D94).
 *
 * It opens itself when the conversation's column is wide enough and steps back
 * when the frame narrows; a reader who closes it keeps it closed for that
 * session. The box follows the column: the rail is fixed, and its right edge is
 * the column's own right edge, so an opened host sidebar moves it along.
 */
function useRailReading(session: string | null) {
  const [open, setOpen] = React.useState(false)
  const [box, setBox] = React.useState<RailBox | null>(null)
  /** The reader's own choice for this session: auto follows the width, open and closed stand. */
  const choice = React.useRef<{ session: string | null, mode: 'auto' | 'open' | 'closed' }>({ session: null, mode: 'auto' })
  React.useEffect(() => {
    let stopSize: (() => void) | null = null
    let center: HTMLElement | null = null
    const measure = () => {
      const rect = center === null ? null : center.getBoundingClientRect()
      // The rail may stand without the column part (an older host): it then
      // takes the window's right edge, and only the window rule decides.
      setBox({
        top: rect === null ? 0 : Math.round(rect.top),
        height: rect === null ? window.innerHeight : Math.round(rect.height),
        right: rect === null ? 0 : Math.round(window.innerWidth - rect.right),
      })
      if (choice.current.session !== session) choice.current = { session, mode: 'auto' }
      if (choice.current.mode !== 'auto') {
        setOpen(choice.current.mode === 'open')
        return
      }
      const windowWide = window.innerWidth >= OPEN_WINDOW
      const columnWide = rect === null || rect.width >= OPEN_COLUMN
      const windowNarrow = window.innerWidth < CLOSE_WINDOW
      const columnNarrow = rect !== null && rect.width < CLOSE_COLUMN
      setOpen(current => (current ? !windowNarrow && !columnNarrow : windowWide && columnWide))
    }
    const columns = observeMarker<HTMLElement>(CENTER)
    const bind = () => {
      const next = columns.all()[0] ?? null
      if (next === center) {
        measure()
        return
      }
      if (stopSize !== null) stopSize()
      stopSize = null
      center = next
      if (center !== null) {
        stopSize = observeSize(center, measure)
        measure()
      } else {
        setBox(null)
        setOpen(false)
      }
    }
    // The parts walk marks the column after the first frame, so its arrival is
    // an attribute change, not a child-list one.
    const stopParts = subscribeMutations(document.body, { subtree: true, attributes: true, attributeFilter: ['data-dsh-claude-part'] }, bind)
    bind()
    // The column's own size observer reports once on attach, which covers a
    // shell that laid out after this feature's first render; no timer wakes a
    // page that has settled.
    window.addEventListener('resize', bind)
    return () => {
      stopParts()
      columns.release()
      window.removeEventListener('resize', bind)
      if (stopSize !== null) stopSize()
    }
  }, [session])
  const close = React.useCallback(() => {
    choice.current = { session, mode: 'closed' }
    setOpen(false)
  }, [session])
  // The header's control flips the same choice the reader's own close makes.
  React.useEffect(() => {
    const flip = () => {
      if (open) close()
      else {
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
  return { open, box, close }
}

/** The conversation's details rail: the session overview the reader keeps beside the chat (D94). */
export function SessionPanelRail() {
  const { id: session, live } = useConversationSession()
  const preset = usePresetLabel()
  const { open, box, close } = useRailReading(session)
  // The page mark squeezes the conversation; it goes with the rail itself, so a
  // hidden rail (a new session, a plugin page) leaves no strip of empty space.
  const shown = session !== null && live && open && box !== null
  React.useEffect(() => {
    if (shown) document.body.setAttribute(SESSION_PANEL_ATTR, '')
    else document.body.removeAttribute(SESSION_PANEL_ATTR)
    return () => document.body.removeAttribute(SESSION_PANEL_ATTR)
  }, [shown])
  if (!shown) return null
  return h('aside', {
    className: 'dsh-claude-details',
    'aria-label': copy('detailsTitle'),
    style: { top: `${box.top}px`, height: `${box.height}px`, right: `${box.right}px`, width: `${RAIL_WIDTH}px` },
  },
  h('div', { className: 'dsh-claude-details-head' },
    h('span', { className: 'dsh-claude-details-title' }, copy('detailsTitle')),
    preset === '' ? null : h('span', { className: 'dsh-claude-details-preset', title: preset }, preset),
    h('button', {
      type: 'button',
      className: 'dsh-claude-details-close',
      'aria-label': copy('detailsClose'),
      title: copy('detailsClose'),
      onClick: close,
    }, '×')),
  h(PanelBody, { key: session, sessionId: session }))
}
