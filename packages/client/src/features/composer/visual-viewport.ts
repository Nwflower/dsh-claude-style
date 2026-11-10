import { COMPOSER_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeMatches } from '@dsh-claude-style/engine/bus'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { PAGE_UNDER_480_ATTR } from '../../constants'

/** Smallest bottom occlusion taken for a soft keyboard; the browser's own toolbar collapsing stays below it. */
const KEYBOARD_ENTER_GAP = 120
/** Once the composer follows a keyboard it keeps following until the occlusion drops below this. */
const KEYBOARD_EXIT_GAP = 40
/** Browsers report an unzoomed page as 0.99999 or 1.0000001; only a real zoom leaves this band. */
const UNZOOMED_SCALE_TOLERANCE = 0.02

/**
 * The bottom occlusion in layout pixels, or zero for desktop and pinch zoom.
 * `previousGap` is the value this function returned last: entering needs the
 * larger threshold, leaving the smaller one, so the composer neither flickers
 * while the keyboard animates nor follows a toolbar that moved by a few pixels.
 */
export function composerViewportGap(reading: { layoutHeight: number, height: number, offsetTop: number, scale: number, narrow: boolean, previousGap: number }) {
  if (!reading.narrow || Math.abs(reading.scale - 1) > UNZOOMED_SCALE_TOLERANCE) return 0
  const occluded = Math.max(0, reading.layoutHeight - reading.height - reading.offsetTop)
  return occluded >= (reading.previousGap > 0 ? KEYBOARD_EXIT_GAP : KEYBOARD_ENTER_GAP) ? occluded : 0
}

/** Follow the visible viewport while a mobile keyboard opens, moves or closes. */
export function createComposerViewportFollow() {
  const seats = observeMatches<HTMLElement>(COMPOSER_SELECTOR, () => schedule())
  let cancel: (() => void) | null = null
  let stopped = false
  let gap = 0

  function schedule() {
    if (stopped || cancel !== null) return
    cancel = requestFrame({
      read() {
        const viewport = window.visualViewport
        gap = composerViewportGap({
          layoutHeight: window.innerHeight,
          height: viewport?.height ?? window.innerHeight,
          offsetTop: viewport?.offsetTop ?? 0,
          scale: viewport?.scale ?? 1,
          narrow: document.body.hasAttribute(PAGE_UNDER_480_ATTR),
          previousGap: gap,
        })
      },
      write() {
        cancel = null
        for (const seat of seats.all()) {
          if (gap > 0) seat.style.bottom = `${gap}px`
          else seat.style.removeProperty('bottom')
        }
      },
    })
  }

  const viewport = window.visualViewport
  viewport?.addEventListener('resize', schedule)
  viewport?.addEventListener('scroll', schedule)
  window.addEventListener('resize', schedule)
  schedule()

  return () => {
    stopped = true
    if (cancel !== null) cancel()
    cancel = null
    viewport?.removeEventListener('resize', schedule)
    viewport?.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    for (const seat of seats.all()) seat.style.removeProperty('bottom')
    seats.release()
  }
}
