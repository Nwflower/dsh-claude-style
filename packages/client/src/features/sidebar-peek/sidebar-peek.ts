import { RIGHTBAR_COLLAPSED_ATTRIBUTE, SIDEBAR_BESIDE_RIGHTBAR_MIN_PX, SIDEBAR_COLLAPSED_ATTRIBUTE, SIDEBAR_DRAWER_ATTRIBUTE, WINDOWS_MENU_START_PROPERTY } from '@dsh-claude-style/contracts/dom'
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { findForeground, findSidebarRoot, findSidebarToggle, hostLayout } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import { MOTION_ATTR, MOTION_REDUCED, SIDEBAR_PEEK_ATTR, SIDEBAR_PEEK_CLOSING, SIDEBAR_PEEK_OPEN, SIDEBAR_PEEK_RAIL_PROPERTY, SIDEBAR_PEEK_WIDTH_PROPERTY } from '../../constants'
import { motionMs } from '../../shared/motion'
import { FRAME_SELECTOR } from '../../shared/page-scale-columns'

/**
 * The collapsed sidebar opened over the page while the pointer rests on its
 * toggle, the way Claude's app peeks it (D43).
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

/** How long the pointer rests on the toggle before the sidebar opens: a pointer passing over on its way to the caption row opens nothing. */
const OPEN_DELAY_MS = 120
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
    if (opened) finish()
  }

  function open() {
    openTimer = undefined
    const box = frames.all()[0] ?? null
    if (phase !== 'waiting' || box === null || !canOpen(box)) {
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
    if (box === null || !canOpen(box)) return
    phase = 'waiting'
    openTimer = window.setTimeout(open, OPEN_DELAY_MS)
  }

  function onPointerOut(event: PointerEvent) {
    // Off the window, or onto the Windows caption strip the shell keeps for itself.
    if (event.relatedTarget === null) {
      pointer = null
      judge(false)
    }
    if (phase !== 'waiting') return
    const toggle = findSidebarToggle()
    if (toggle !== null && event.relatedTarget instanceof Node && toggle.contains(event.relatedTarget)) return
    window.clearTimeout(openTimer)
    openTimer = undefined
    phase = 'idle'
  }

  function onPointerMove(event: PointerEvent) {
    pointer = { x: event.clientX, y: event.clientY }
    judge(event.buttons !== 0)
  }

  /** Before the host hears it: a click on the toggle while the sidebar stands over the page keeps it open. */
  function onClickCapture(event: MouseEvent) {
    const toggle = findSidebarToggle()
    if (toggle === null || !(event.target instanceof Node) || !toggle.contains(event.target)) return
    if (phase === 'waiting') {
      window.clearTimeout(openTimer)
      openTimer = undefined
      phase = 'idle'
      return
    }
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
