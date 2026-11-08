import { WIDTH_HANDLE_SELECTOR } from '@dsh-claude-style/contracts/dom'

/**
 * The conversation column's width handle (width-handle.css).
 *
 * The host states the handle's bar on its own `::after` and reveals it the frame
 * the pointer enters the 10px hit strip, so a pointer crossing the transcript's
 * edge on its way anywhere else flashes a rule down the page (issue #270). The
 * bar is revealed here instead once the pointer has rested on the handle, and a
 * press reveals it at once: a reader who means to drag has stopped passing
 * through. The host's own `data-dragging` keeps it up for the drag.
 */

/** How long the pointer rests on the handle before the bar is revealed: a pointer passing over on its way to the transcript reveals nothing. */
const REST_MS = 220

/** The mark a handle carries while its bar is up. */
export const REST_ATTRIBUTE = 'data-dsh-claude-handle-rest'

export function install() {
  /** The handle the pointer is on, and the timer that would reveal its bar. */
  let rested: HTMLElement | null = null
  let timer = 0

  /** Take the mark off, and drop the rest that would have put it there. */
  function leave() {
    if (timer !== 0) {
      clearTimeout(timer)
      timer = 0
    }
    if (rested !== null) {
      rested.removeAttribute(REST_ATTRIBUTE)
      rested = null
    }
  }

  /** The handle under `event`, or null for a pointer that is not on one. */
  function handleOf(event: PointerEvent) {
    const target = event.target instanceof Element ? event.target.closest(WIDTH_HANDLE_SELECTOR) : null
    return target instanceof HTMLElement ? target : null
  }

  function onPointerOver(event: PointerEvent) {
    const handle = handleOf(event)
    // The event fires again as the pointer moves over the handle's own children,
    // so a handle already under it keeps the rest it has.
    if (handle === null || handle === rested) return
    leave()
    rested = handle
    timer = window.setTimeout(() => {
      timer = 0
      if (rested !== null) rested.setAttribute(REST_ATTRIBUTE, '')
    }, REST_MS)
  }

  function onPointerOut(event: PointerEvent) {
    const handle = handleOf(event)
    if (handle === null || handle !== rested) return
    // A move onto the handle's own child is not a move off the handle.
    const entering = event.relatedTarget instanceof Element ? event.relatedTarget : null
    if (entering !== null && handle.contains(entering)) return
    leave()
  }

  function onPointerDown(event: PointerEvent) {
    const handle = handleOf(event)
    if (handle === null) return
    leave()
    rested = handle
    handle.setAttribute(REST_ATTRIBUTE, '')
  }

  document.addEventListener('pointerover', onPointerOver, true)
  document.addEventListener('pointerout', onPointerOut, true)
  document.addEventListener('pointerdown', onPointerDown, true)

  return () => {
    document.removeEventListener('pointerover', onPointerOver, true)
    document.removeEventListener('pointerout', onPointerOut, true)
    document.removeEventListener('pointerdown', onPointerDown, true)
    leave()
  }
}
