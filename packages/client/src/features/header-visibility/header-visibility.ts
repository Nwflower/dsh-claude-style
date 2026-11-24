import {
  CONVERSATION_CONTENT_SELECTOR, CONVERSATION_HEADER_SELECTOR, CONVERSATION_HEADER_SLOT_SELECTOR,
  MENU_TRIGGER_SELECTOR, SIDEBAR_HANDLE_SELECTOR,
} from '@dsh-claude-style/contracts/dom'
import { observeSize, subscribeMutations } from '@dsh-claude-style/engine/bus'
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
  const sidebarHandle = cacheFirstMatch<HTMLElement>(SIDEBAR_HANDLE_SELECTOR)
  const schedule = () => ui.schedule?.()
  let pointer: PointerPosition | null = null
  let reading: ReturnType<typeof readRegions> | null = null
  let watchedFrame: HTMLElement | null = null
  let stopSize: (() => void) | null = null
  let watchedHeader: HTMLElement | null = null
  let stopMenuWatch: (() => void) | null = null
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
    // The Windows caption spans the window up to the native caption buttons: it
    // seats the lifted tabs and tools even above an open right panel, and under
    // page zoom or fractional DPI the frame's top can sit past the overlay rect (D40, D43).
    let caption = null
    if (band?.platform === 'win32') {
      const frameBox = frame.getBoundingClientRect()
      const bottom = frameBox.height > 0 && frameBox.top <= band.height * 2
        ? Math.max(band.height, Math.ceil(frameBox.top))
        : band.height
      caption = { left: 0, right: Math.max(0, window.innerWidth - band.controls.size), bottom }
    }
    return {
      header, content, caption, menu, title, utilityPaint,
      frameToWatch: caption === null ? null : frame,
      sidebar: findSidebarRoot(),
      sidebarHandle: sidebarHandle(),
    }
  }

  function measure() {
    reading = readRegions()
  }

  /** The toolbar stays up over the conversation, whose content holds the host's
   * session panel, and over the sidebar and its resize handle: the caption
   * carries the sidebar's own collapse control, so hovering those columns keeps
   * the header buttons reachable (D43). */
  function keepsToolbar(target: EventTarget | null) {
    if (!(target instanceof Node) || reading === null) return false
    return reading.header.contains(target) || reading.content?.contains(target) === true
      || reading.sidebar?.contains(target) === true || reading.sidebarHandle?.contains(target) === true
  }

  /** Keep the toolbar up while any menu opened from the header stands on screen (D43). */
  function headerMenuOpen() {
    return reading?.header.querySelector(`${MENU_TRIGGER_SELECTOR}[aria-expanded="true"]`) != null
  }

  function write(inside: boolean) {
    const caption = reading?.caption
    // The caption's blank space is a native drag region: the pointer belongs to
    // the toolbar there even though no header control is under it (D43).
    const inCaption = caption != null && pointer !== null &&
      pointer.y >= 0 && pointer.y < caption.bottom && pointer.x >= caption.left && pointer.x < caption.right
    const shown = !readPrefs().hideToolbarOutsideConversation || inside || inCaption || headerMenuOpen()
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
      stopSize = frame === null ? null : observeSize(frame, schedule)
    }
    const header = reading?.header ?? null
    if (watchedHeader !== header) {
      stopMenuWatch?.()
      watchedHeader = header
      stopMenuWatch = header === null ? null : subscribeMutations(header, { subtree: true, attributeFilter: ['aria-expanded'] }, schedule)
    }
    write(reading?.header.matches(':hover') === true || reading?.content?.matches(':hover') === true
      || reading?.sidebar?.matches(':hover') === true || reading?.sidebarHandle?.matches(':hover') === true)
  }

  function onPointer(event: PointerEvent) {
    if (event.pointerType === 'touch') return
    pointer = { x: event.clientX, y: event.clientY }
    write(keepsToolbar(event.target))
  }

  function onPointerOut(event: PointerEvent) {
    if (event.relatedTarget !== null || event.pointerType === 'touch') return
    // A handoff into the caption's blank drag region arrives with no
    // relatedTarget while the pointer stays in the window.
    pointer = { x: event.clientX, y: event.clientY }
    write(false)
  }

  /** On Windows, entering `-webkit-app-region: drag` switches hit-testing to
   * HTCAPTION and sends WM_MOUSELEAVE, which dispatches pointerleave on the
   * document element while the cursor remains inside the caption strip (D43). */
  function onWindowLeave(event: PointerEvent) {
    if (event.pointerType === 'touch' || event.target !== document.documentElement) return
    const next = { x: event.clientX, y: event.clientY }
    const caption = reading?.caption
    const inDragBand = caption != null &&
      next.y > 0 && next.y < caption.bottom && next.x > caption.left && next.x < caption.right
    pointer = inDragBand ? next : null
    write(false)
  }

  ui.headerVisibility = {
    measure,
    sync,
    measureReposition: measure,
    reposition(reason) {
      if (reason === 'viewport') sync()
    },
    skipOnContentOnly: true,
  }
  const listeners = new AbortController()
  const captureOptions = { capture: true, passive: true, signal: listeners.signal }
  document.addEventListener('pointerover', onPointer, captureOptions)
  document.addEventListener('pointermove', onPointer, captureOptions)
  document.addEventListener('pointerout', onPointerOut, captureOptions)
  document.documentElement.addEventListener('pointerleave', onWindowLeave, { passive: true, signal: listeners.signal })
  const overlay = navigator.windowControlsOverlay
  overlay?.addEventListener('geometrychange', schedule, { signal: listeners.signal })
  return () => {
    listeners.abort()
    stopSize?.()
    stopMenuWatch?.()
    markUtilities([])
    menuStamp.release()
    titleStamp.release()
    stamp.release()
    delete ui.headerVisibility
  }
}
