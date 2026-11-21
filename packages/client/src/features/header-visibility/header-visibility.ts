import {
  CONVERSATION_CONTENT_SELECTOR, CONVERSATION_HEADER_SELECTOR, CONVERSATION_HEADER_SLOT_SELECTOR,
} from '@dsh-claude-style/contracts/dom'
import { observeSize } from '@dsh-claude-style/engine/bus'
import { desktopBand } from '@dsh-claude-style/engine/desktop-band'
import { createStamp, setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { cacheFirstMatch, conversationHeaderMore, conversationHeaderTitle, conversationHeaderTools, findMainConversationFrame, findSidebarRoot } from '@dsh-claude-style/engine/host'
import { readPrefs } from '../../core/prefs'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './header-visibility.manifest'

interface PointerPosition {
  x: number
  y: number
}

const UTILITY_ATTR = 'data-dsh-header-utility-fade'
/** The skin's own details rail beside the conversation (features/session-panel). */
const DETAILS_RAIL_SELECTOR = '.dsh-claude-details'
const detailsRail = cacheFirstMatch<HTMLElement>(DETAILS_RAIL_SELECTOR)

/** Fade the first painted branches beside the menu. Opacity on a shared
 * ancestor would also hide the fixed menu, and host slots can be display: contents (D43). */
function utilityPaintTargets(utilities: HTMLElement | null, menu: HTMLElement | null): Element[] {
  if (utilities === null) return []
  if (menu === null) return [utilities]
  const targets: Element[] = []
  function collect(container: Element) {
    for (const child of container.children) {
      if (child === menu) continue
      if (child.contains(menu) || getComputedStyle(child).display === 'contents') collect(child)
      else targets.push(child)
    }
  }
  collect(utilities)
  return targets
}

/** The conversation owns its header seat even when its controls lift into the Windows caption (D43). */
export function install(_ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const stamp = createStamp<HTMLElement>('data-dsh-header-visibility')
  const menuStamp = createStamp<HTMLElement>('data-dsh-header-session-menu')
  const titleStamp = createStamp<HTMLElement>('data-dsh-header-session-title')
  const schedule = () => ui.schedule?.()
  let pointer: PointerPosition | null = null
  let reading: ReturnType<typeof readRegions> | null = null
  let watchedFrame: HTMLElement | null = null
  let stopSize: (() => void) | null = null
  let markedUtilities: Element[] = []

  function readRegions() {
    const frame = findMainConversationFrame()
    const slot = frame?.querySelector(`:scope > ${CONVERSATION_HEADER_SLOT_SELECTOR}`)
    const header = slot?.querySelector<HTMLElement>(CONVERSATION_HEADER_SELECTOR) ?? null
    if (frame === null || header === null) return null
    const content = frame.querySelector<HTMLElement>(`:scope > ${CONVERSATION_CONTENT_SELECTOR}`)
    const { utilities } = conversationHeaderTools(header)
    const menu = conversationHeaderMore(utilities)
    const title = menu === null ? null : conversationHeaderTitle(header)
    const utilityPaint = utilityPaintTargets(utilities, menu)
    const band = desktopBand()
    // The blank space between fixed controls belongs to the native caption,
    // outside the header's DOM box. Read its bounds in the shared read phase (D40).
    let caption = null
    if (band?.platform === 'win32') {
      const frameBox = frame.getBoundingClientRect()
      caption = { left: frameBox.left, right: Math.min(frameBox.right, window.innerWidth - band.controls.size), bottom: band.height }
    }
    return { header, content, caption, menu, title, utilityPaint, frameToWatch: caption === null ? null : frame,
      sidebar: findSidebarRoot(), rail: detailsRail() }
  }

  function measure() {
    reading = readRegions()
  }

  /** The toolbar stays up over the conversation, the sidebar and the details
   * rail: the caption carries the sidebar's own collapse control, so hovering
   * those columns keeps the header buttons reachable (D43). */
  function keepsToolbar(target: EventTarget | null) {
    if (!(target instanceof Node) || reading === null) return false
    return reading.header.contains(target) || reading.content?.contains(target) === true
      || reading.sidebar?.contains(target) === true || reading.rail?.contains(target) === true
  }

  function write(inside: boolean) {
    const caption = reading?.caption
    // The caption's blank space is a native drag region: the pointer belongs to
    // the conversation there even though no header control is under it (D43).
    const inCaption = caption != null && pointer !== null &&
      pointer.y >= 0 && pointer.y < caption.bottom && pointer.x >= caption.left && pointer.x < caption.right
    const shown = !readPrefs().hideToolbarOutsideConversation || inside || inCaption
    stamp.mark(reading?.header ?? null, shown ? 'shown' : 'hidden')
  }

  function markUtilities(next: Element[]) {
    for (const element of markedUtilities) {
      if (!next.includes(element)) element.removeAttribute(UTILITY_ATTR)
    }
    for (const element of next) setAttributeIfChanged(element, UTILITY_ATTR, '')
    markedUtilities = next
  }

  function sync() {
    menuStamp.mark(reading?.menu ?? null, reading?.title == null ? '' : 'beside-title')
    titleStamp.mark(reading?.title ?? null)
    markUtilities(reading?.utilityPaint ?? [])
    const frame = reading?.frameToWatch ?? null
    if (watchedFrame !== frame) {
      stopSize?.()
      watchedFrame = frame
      // Sidebar motion moves the edge of the caption's conversation region (D40).
      stopSize = frame === null ? null : observeSize(frame, schedule)
    }
    write(reading?.header.matches(':hover') === true || reading?.content?.matches(':hover') === true
      || reading?.sidebar?.matches(':hover') === true || reading?.rail?.matches(':hover') === true)
  }

  function onPointer(event: PointerEvent) {
    if (event.pointerType === 'touch') return
    pointer = { x: event.clientX, y: event.clientY }
    write(keepsToolbar(event.target))
  }

  function onPointerOut(event: PointerEvent) {
    if (event.relatedTarget !== null || event.pointerType === 'touch') return
    // A handoff into the caption's blank drag region arrives with no
    // relatedTarget while the pointer stays in the window. Keep the exit
    // position so the band check reads it as inside; leaving the window itself
    // is handled by pointerleave below.
    pointer = { x: event.clientX, y: event.clientY }
    write(false)
  }

  /** The pointer left the window. The caption's blank drag region is inside the
   * document, so a handoff into it raises no pointerleave; only a real exit does. */
  function onWindowLeave(event: PointerEvent) {
    if (event.pointerType === 'touch') return
    pointer = null
    write(false)
  }

  ui.headerVisibility = { measure, sync, skipOnContentOnly: true }
  const listeners = new AbortController()
  const options = { capture: true, passive: true, signal: listeners.signal }
  document.addEventListener('pointerover', onPointer, options)
  document.addEventListener('pointermove', onPointer, options)
  document.addEventListener('pointerout', onPointerOut, options)
  document.documentElement.addEventListener('pointerleave', onWindowLeave, options)
  const overlay = navigator.windowControlsOverlay
  overlay?.addEventListener('geometrychange', schedule, { signal: listeners.signal })
  return () => {
    listeners.abort()
    stopSize?.()
    markUtilities([])
    menuStamp.release()
    titleStamp.release()
    stamp.release()
    delete ui.headerVisibility
  }
}
