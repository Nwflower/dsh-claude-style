import {
  CONVERSATION_CONTENT_SELECTOR, CONVERSATION_HEADER_SELECTOR, CONVERSATION_HEADER_SLOT_SELECTOR,
  MENU_TRIGGER_SELECTOR, RIGHTBAR_COLUMN_SELECTOR, RIGHTBAR_HANDLE_SELECTOR,
} from '@dsh-claude-style/contracts/dom'
import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { createStamp, setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { cacheFirstMatch, conversationHeaderMore, conversationHeaderTitle, conversationHeaderTools, findMainConversationFrame } from '@dsh-claude-style/engine/host'
import { readPrefs } from '../../core/prefs'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './header-visibility.manifest'

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

/** The conversation and right panel keep the header toolbar up, including when
 * its controls lift into the Windows caption (D43). */
export function install(_ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const stamp = createStamp<HTMLElement>('data-dsh-header-visibility')
  const menuStamp = createStamp<HTMLElement>('data-dsh-header-session-menu')
  const titleStamp = createStamp<HTMLElement>('data-dsh-header-session-title')
  const rightbar = cacheFirstMatch<HTMLElement>(RIGHTBAR_COLUMN_SELECTOR)
  const rightbarHandle = cacheFirstMatch<HTMLElement>(RIGHTBAR_HANDLE_SELECTOR)
  const schedule = () => ui.schedule?.()
  let reading: ReturnType<typeof readRegions> | null = null
  let watchedHeader: HTMLElement | null = null
  let stopMenuWatch: (() => void) | null = null
  let menuOpen = false
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
    return {
      header, content, menu, title, utilityPaint,
      rightbar: rightbar(),
      rightbarHandle: rightbarHandle(),
    }
  }

  function measure() {
    reading = readRegions()
  }

  /** The toolbar stays up over the conversation (including the host's session
   * panel inside it), its header controls, and the right panel with its resize
   * handle; the sidebar, bottom panel, blank caption drag strip and outside
   * the window fade it out (D43). */
  function keepsToolbar(target: EventTarget | null) {
    if (!(target instanceof Node) || reading === null) return false
    return reading.header.contains(target) || reading.content?.contains(target) === true
      || reading.rightbar?.contains(target) === true || reading.rightbarHandle?.contains(target) === true
  }

  /** Refresh the cached open state of header menus so pointer moves avoid DOM queries (D43). */
  function refreshMenuOpen(header: HTMLElement | null) {
    menuOpen = header?.querySelector(`${MENU_TRIGGER_SELECTOR}[aria-expanded="true"]`) != null
  }

  function hovered() {
    return reading?.header.matches(':hover') === true || reading?.content?.matches(':hover') === true
      || reading?.rightbar?.matches(':hover') === true || reading?.rightbarHandle?.matches(':hover') === true
  }

  function write(inside: boolean) {
    const shown = !readPrefs().hideToolbarOutsideConversation || inside || menuOpen
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
    const header = reading?.header ?? null
    if (watchedHeader !== header) {
      stopMenuWatch?.()
      watchedHeader = header
      stopMenuWatch = header === null
        ? null
        : subscribeMutations(
          header,
          { subtree: true, childList: true, attributeFilter: ['aria-expanded'] },
          () => {
            const wasOpen = menuOpen
            refreshMenuOpen(watchedHeader)
            if (menuOpen !== wasOpen) write(hovered())
            schedule()
          },
        )
    }
    refreshMenuOpen(header)
    write(hovered())
  }

  function onPointer(event: PointerEvent) {
    if (event.pointerType === 'touch') return
    if (!readPrefs().hideToolbarOutsideConversation || menuOpen) {
      write(true)
      return
    }
    write(keepsToolbar(event.target))
  }

  function onPointerOut(event: PointerEvent) {
    if (event.relatedTarget !== null || event.pointerType === 'touch') return
    write(false)
  }

  function onWindowLeave(event: PointerEvent) {
    if (event.pointerType === 'touch' || event.target !== document.documentElement) return
    write(false)
  }

  ui.headerVisibility = { measure, sync, skipOnContentOnly: true }
  const listeners = new AbortController()
  const captureOptions = { capture: true, passive: true, signal: listeners.signal }
  document.addEventListener('pointerover', onPointer, captureOptions)
  document.addEventListener('pointermove', onPointer, captureOptions)
  document.addEventListener('pointerout', onPointerOut, captureOptions)
  document.documentElement.addEventListener('pointerleave', onWindowLeave, { passive: true, signal: listeners.signal })
  return () => {
    listeners.abort()
    stopMenuWatch?.()
    markUtilities([])
    menuStamp.release()
    titleStamp.release()
    stamp.release()
    delete ui.headerVisibility
  }
}
