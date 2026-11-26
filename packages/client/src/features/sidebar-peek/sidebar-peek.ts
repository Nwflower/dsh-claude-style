import { RIGHTBAR_COLLAPSED_ATTRIBUTE, SIDEBAR_BESIDE_RIGHTBAR_MIN_PX, SIDEBAR_COLLAPSED_ATTRIBUTE, SIDEBAR_DRAWER_ATTRIBUTE, WINDOWS_MENU_START_PROPERTY } from '@dsh-claude-style/contracts/dom'
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { findForeground, findSidebarRoot, findSidebarToggle, hostLayout } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import { MOTION_ATTR, MOTION_REDUCED, POINTER_CLAIM_ATTR, SIDEBAR_PEEK_ATTR, SIDEBAR_PEEK_CLOSING, SIDEBAR_PEEK_OPEN, SIDEBAR_PEEK_RAIL_PROPERTY, SIDEBAR_PEEK_WIDTH_PROPERTY } from '../../constants'
import { motionMs } from '../../shared/motion'
import { FRAME_SELECTOR } from '../../shared/page-scale-columns'

/**
 * The collapsed sidebar opened over the page while the pointer rests on its
 * toggle or the window's left edge, the way Claude's app peeks it (D43). A skin
 * control standing in that edge strip, the conversation's turn rail among them,
 * keeps the pointer for itself: the strip opens nothing over it.
 *
 * The host draws the session list only while its own layout has the sidebar
 * open, so the peek opens it through the host's layout service and keeps the
 * page from making room: the column stands over the centre, and the centre
 * takes the open sidebar's track back, clear of the collapsed width it stood at
 * (sidebar-peek.css). Leaving the toggle
 * and the column, or picking a session, a new session or a panel in it, closes
 * it the same way; a click on the toggle while it is open keeps the sidebar open
 * as the click always has, and the page then makes room as usual.
 *
 * A narrow layout may already stand the collapsed column out of the frame's own
 * flow as a drawer, holding its own room and dimming the page behind a backdrop
 * of its own. That layout keeps the sidebar to itself: the peek's overlay and
 * its layer would stand under that backdrop and take the drawer down with them,
 * so the peek stands down there.
 */

/** How long the pointer rests on a trigger before the sidebar opens: a pointer passing over on its way elsewhere opens nothing. */
const OPEN_DELAY_MS = 120
/** The full-height strip at the frame's left edge that also opens the peek. */
const EDGE_PX = 32
/** A skin control inside the edge strip that keeps the pointer for itself. */
const CLAIM_SELECTOR = `[${POINTER_CLAIM_ATTR}]`
/** How long the pointer may stand outside the toggle and the column before the sidebar closes: the Windows caption strip between the two hands the pointer to the shell for a moment. */
const LEAVE_DELAY_MS = 300

/** A click on one of these in the open column leaves for another view, and the peek closes behind it; the row's own menu button stays inside. */
const NAVIGATION_SELECTOR = ':is([data-dsh-claude-part~="session-row"], [data-dsh-claude-part~="new-session"], [data-dsh-claude-part~="panel-row"])'
const ROW_ACTIONS_SELECTOR = '[data-dsh-claude-part~="row-actions"]'
const COLUMN_SELECTOR = ':scope > [data-dsh-claude-part~="sidebar-column"]'
const CENTER_SELECTOR = ':scope > [data-dsh-claude-part~="center-column"]'

type Phase = 'idle' | 'waiting' | 'open' | 'closing'

interface Point {
  x: number
  y: number
  /** The element under the pointer: one inside a skin control that claims the pointer keeps the edge strip shut. */
  target: EventTarget | null
}

function within(box: DOMRect, point: Point) {
  return point.x >= box.left && point.x < box.right && point.y >= box.top && point.y < box.bottom
}

/** A field the reader is typing in: a rename or the search box keeps the column open. */
function editing(column: Element) {
  const active = document.activeElement
  if (active === null || !column.contains(active)) return false
  return active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || (active instanceof HTMLElement && active.isContentEditable)
}

export function install(ctx: HostContext) {
  const frames = observeMatches<HTMLElement>(FRAME_SELECTOR)
  let phase: Phase = 'idle'
  /** The frame the peek is open on. */
  let frame: HTMLElement | null = null
  /** Whether the host has opened the sidebar since the peek asked it to. */
  let opened = false
  let offFrame: (() => void) | null = null
  /** The inline value the document element carried before the peek held the menu's start, or null while nothing is held. */
  let menuBefore: string | null = null
  let pointer: Point | null = null
  let openTimer: number | undefined
  let leaveTimer: number | undefined
  let closeTimer: number | undefined
  /** The frame on which the peek leaves the frame after the host's track has landed. */
  let settleFrame: number | undefined

  const collapsed = (box: HTMLElement) => box.hasAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE)
  const column = () => frame?.querySelector<HTMLElement>(COLUMN_SELECTOR) ?? null

  /**
   * Whether the frame's own flow still holds the collapsed column: a drawer
   * stands out of it. The host states the drawer in a mark of its own, so the
   * mark answers first; a host build that writes none is read by the column's
   * own placement, which costs a layout to read.
   */
  function inFlow(box: HTMLElement) {
    if (box.hasAttribute(SIDEBAR_DRAWER_ATTRIBUTE)) return false
    const col = box.querySelector<HTMLElement>(COLUMN_SELECTOR)
    if (col === null) return true
    const position = getComputedStyle(col).position
    return position !== 'absolute' && position !== 'fixed'
  }

  /** Whether opening the sidebar here leaves the page as it stands: collapsed, in the frame's flow, and with any right panel kept beside it. */
  function canOpen(box: HTMLElement) {
    if (!collapsed(box) || !inFlow(box)) return false
    return box.hasAttribute(RIGHTBAR_COLLAPSED_ATTRIBUTE) || box.getBoundingClientRect().width >= SIDEBAR_BESIDE_RIGHTBAR_MIN_PX
  }

  /**
   * The toggle keeps its original hover path; the edge adds a full-height strip
   * without putting a hit box over the page. The strip yields to a skin control
   * standing in it: the turn rail sits 12px in from the conversation's left
   * edge, inside the strip whenever the sidebar is collapsed, and a pointer
   * reaching for the rail would otherwise open the sidebar over it. The claim
   * is read only for a point already inside the strip.
   */
  function triggered(box: HTMLElement, point: Point) {
    const toggle = findSidebarToggle()
    if (toggle !== null && within(toggle.getBoundingClientRect(), point)) return true
    const bounds = box.getBoundingClientRect()
    if (point.x < bounds.left || point.x > bounds.left + EDGE_PX || point.y < bounds.top || point.y >= bounds.bottom) return false
    return !(point.target instanceof Element && point.target.closest(CLAIM_SELECTOR) !== null)
  }

  /**
   * A foreground surface owns its pointer; the collapsed sidebar must not open
   * beneath it. Every pointer move asks, so the attribute an open sidebar
   * answers with is read before any box, and a collapsed one reads the
   * trigger's boxes before the layout `canOpen` costs.
   */
  function eligible(box: HTMLElement, point: Point) {
    return collapsed(box) && triggered(box, point) && canOpen(box) && findForeground() === null
  }

  /** The width the slide travels: the one the host gives the open sidebar's own box. */
  function writeWidth() {
    if (frame === null) return
    const width = findSidebarRoot()?.style.getPropertyValue('width') ?? ''
    if (width !== '' && frame.style.getPropertyValue(SIDEBAR_PEEK_WIDTH_PROPERTY) !== width) frame.style.setProperty(SIDEBAR_PEEK_WIDTH_PROPERTY, width)
  }

  /**
   * The Windows caption row places its menu from a property the host declares
   * only while the frame is collapsed; held at that value, the menu stays where
   * it stood while the sidebar is open over the page.
   */
  function holdMenuStart() {
    const root = document.documentElement
    const value = getComputedStyle(root).getPropertyValue(WINDOWS_MENU_START_PROPERTY).trim()
    if (value === '') return
    menuBefore = root.style.getPropertyValue(WINDOWS_MENU_START_PROPERTY)
    root.style.setProperty(WINDOWS_MENU_START_PROPERTY, value)
  }

  function releaseMenuStart() {
    if (menuBefore === null) return
    const root = document.documentElement
    if (menuBefore === '') root.style.removeProperty(WINDOWS_MENU_START_PROPERTY)
    else root.style.setProperty(WINDOWS_MENU_START_PROPERTY, menuBefore)
    menuBefore = null
  }

  function clearTimers() {
    window.clearTimeout(openTimer)
    window.clearTimeout(leaveTimer)
    window.clearTimeout(closeTimer)
    openTimer = undefined
    leaveTimer = undefined
    closeTimer = undefined
    if (settleFrame !== undefined) {
      window.cancelAnimationFrame(settleFrame)
      settleFrame = undefined
    }
  }

  function cancelWaiting() {
    window.clearTimeout(openTimer)
    openTimer = undefined
    phase = 'idle'
  }

  /** Give the frame back to the host: its own columns, its own caption row. */
  function finish() {
    clearTimers()
    if (offFrame !== null) offFrame()
    offFrame = null
    if (frame !== null) {
      frame.removeAttribute(SIDEBAR_PEEK_ATTR)
      frame.style.removeProperty(SIDEBAR_PEEK_RAIL_PROPERTY)
      frame.style.removeProperty(SIDEBAR_PEEK_WIDTH_PROPERTY)
    }
    releaseMenuStart()
    frame = null
    opened = false
    phase = 'idle'
  }

  /**
   * Give the frame back one style pass after the host's collapse was read, not
   * on the mutation itself.
   *
   * The host eases its first track on a discrete open or close (`data-animating`
   * on the frame), and a commit that collapses it writes the new track and drops
   * the marker in the same pass. Taking the peek's `transition: none` off inside
   * the mutation callback would let that pass's style read start the ease from
   * the open track, and the centre would make room and slide back for a quarter
   * of a second under the finished peek. The peek stays for one painted frame so
   * the track lands at once, then the frame goes back with nothing left to ease.
   */
  function settleClose() {
    if (settleFrame !== undefined) return
    settleFrame = window.requestAnimationFrame(() => {
      settleFrame = window.requestAnimationFrame(() => {
        settleFrame = undefined
        if (frame !== null && collapsed(frame)) finish()
      })
    })
  }

  function onFrameChange() {
    if (frame === null) return
    if (!collapsed(frame)) {
      opened = true
      writeWidth()
      return
    }
    // The marker is back: the peek's own close, or the host closing the
    // sidebar itself (its shortcut, a width crossing its breakpoint). The first
    // records can still predate the host's own render of the open sidebar.
    if (opened) settleClose()
  }

  function open() {
    openTimer = undefined
    const box = frames.all()[0] ?? null
    if (phase !== 'waiting' || box === null || pointer === null || !eligible(box, pointer)) {
      phase = 'idle'
      return
    }
    // Where the centre starts while the column is collapsed, in the frame's own
    // pixels: zero beside the desktop's hidden column, the rail's width on the
    // web. The column's own box reads wider by the border it hangs past its track.
    const center = box.querySelector<HTMLElement>(CENTER_SELECTOR)
    if (center === null) {
      phase = 'idle'
      return
    }
    frame = box
    phase = 'open'
    holdMenuStart()
    box.style.setProperty(SIDEBAR_PEEK_RAIL_PROPERTY, `${center.offsetLeft}px`)
    box.setAttribute(SIDEBAR_PEEK_ATTR, SIDEBAR_PEEK_OPEN)
    offFrame = subscribeMutations(box, { attributes: true, attributeFilter: [SIDEBAR_COLLAPSED_ATTRIBUTE] }, onFrameChange)
    hostLayout(ctx).toggleSidebar()
  }

  function close() {
    if (phase !== 'open' || frame === null) return
    window.clearTimeout(leaveTimer)
    leaveTimer = undefined
    phase = 'closing'
    frame.setAttribute(SIDEBAR_PEEK_ATTR, SIDEBAR_PEEK_CLOSING)
    const wait = document.body.getAttribute(MOTION_ATTR) === MOTION_REDUCED ? 0 : motionMs('--dsh-claude-duration-exit')
    closeTimer = window.setTimeout(() => {
      closeTimer = undefined
      if (phase !== 'closing' || frame === null) return
      if (collapsed(frame)) finish()
      else hostLayout(ctx).toggleSidebar()
    }, wait)
  }

  /** Keep the sidebar open: the column goes back into the grid and the page makes room, as a click on the toggle always does. */
  function pin() {
    clearTimers()
    finish()
  }

  function inside() {
    if (pointer === null) return false
    const toggle = findSidebarToggle()
    if (toggle !== null && within(toggle.getBoundingClientRect(), pointer)) return true
    const box = column()
    return box !== null && within(box.getBoundingClientRect(), pointer)
  }

  /** A menu the column opened, a field being typed in or a drag in progress keeps it open wherever the pointer stands. */
  function held(pressed: boolean) {
    if (pressed || findForeground() !== null) return true
    const box = column()
    return box !== null && editing(box)
  }

  function judge(pressed: boolean) {
    if (phase !== 'open') return
    if (inside() || held(pressed)) {
      window.clearTimeout(leaveTimer)
      leaveTimer = undefined
      return
    }
    if (leaveTimer !== undefined) return
    leaveTimer = window.setTimeout(() => {
      leaveTimer = undefined
      if (!inside() && !held(false)) close()
    }, LEAVE_DELAY_MS)
  }

  function onPointerOver(event: PointerEvent) {
    if (phase !== 'idle') return
    const toggle = findSidebarToggle()
    if (toggle === null || !(event.target instanceof Node) || !toggle.contains(event.target)) return
    const box = frames.all()[0] ?? null
    if (box === null) return
    // The Windows caption strip can deliver this event without a following
    // pointermove, so the button keeps its own entry into the same wait.
    pointer = { x: event.clientX, y: event.clientY, target: event.target }
    if (!eligible(box, pointer)) return
    phase = 'waiting'
    openTimer = window.setTimeout(open, OPEN_DELAY_MS)
  }

  function onPointerOut(event: PointerEvent) {
    // Off the window, or onto the Windows caption strip the shell keeps for itself.
    if (event.relatedTarget === null) {
      pointer = null
      if (phase === 'waiting') cancelWaiting()
      judge(false)
      return
    }
    if (phase !== 'waiting') return
    // The element the pointer moves onto is the one it now stands over.
    pointer = { x: event.clientX, y: event.clientY, target: event.relatedTarget }
    const box = frames.all()[0] ?? null
    if (box === null || !eligible(box, pointer)) cancelWaiting()
  }

  function onPointerMove(event: PointerEvent) {
    pointer = { x: event.clientX, y: event.clientY, target: event.target }
    if (phase === 'idle' || phase === 'waiting') {
      const box = frames.all()[0] ?? null
      const ready = event.buttons === 0 && box !== null && eligible(box, pointer)
      if (phase === 'idle' && ready) {
        phase = 'waiting'
        openTimer = window.setTimeout(open, OPEN_DELAY_MS)
      } else if (phase === 'waiting' && !ready) {
        cancelWaiting()
      }
    }
    judge(event.buttons !== 0)
  }

  /** Before the host hears it: a click on the toggle while the sidebar stands over the page keeps it open. */
  function onClickCapture(event: MouseEvent) {
    if (phase === 'waiting') cancelWaiting()
    const toggle = findSidebarToggle()
    if (toggle === null || !(event.target instanceof Node) || !toggle.contains(event.target)) return
    if (phase !== 'open' && phase !== 'closing') return
    if (frame === null || collapsed(frame)) return
    event.stopPropagation()
    event.preventDefault()
    pin()
  }

  /** After the host has acted on it: a click that left for another view closes the peek. */
  function onClick(event: MouseEvent) {
    if (phase !== 'open' || !(event.target instanceof Element)) return
    const box = column()
    if (box === null || !box.contains(event.target)) return
    if (event.target.closest(NAVIGATION_SELECTOR) === null || event.target.closest(ROW_ACTIONS_SELECTOR) !== null) return
    close()
  }

  document.addEventListener('pointerover', onPointerOver, true)
  document.addEventListener('pointerout', onPointerOut, true)
  document.addEventListener('pointermove', onPointerMove, { capture: true, passive: true })
  document.addEventListener('click', onClickCapture, true)
  document.addEventListener('click', onClick)

  return () => {
    document.removeEventListener('pointerover', onPointerOver, true)
    document.removeEventListener('pointerout', onPointerOut, true)
    document.removeEventListener('pointermove', onPointerMove, { capture: true })
    document.removeEventListener('click', onClickCapture, true)
    document.removeEventListener('click', onClick)
    // The switch turned off while the sidebar stood over the page: it goes back
    // the way it came, so the page is left as the reader had it.
    if ((phase === 'open' || phase === 'closing') && frame !== null && !collapsed(frame)) hostLayout(ctx).toggleSidebar()
    finish()
    frames.release()
  }
}
