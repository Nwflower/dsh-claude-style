import { COMPOSER_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeMatches } from '@dsh-claude-style/engine/bus'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { PAGE_UNDER_480_ATTR } from '../../constants'

/** The bottom occlusion in layout pixels, or zero for desktop and pinch zoom. */
export function composerViewportGap(reading: { layoutHeight: number, height: number, offsetTop: number, scale: number, narrow: boolean }) {
  if (!reading.narrow || reading.scale !== 1) return 0
  return Math.max(0, reading.layoutHeight - reading.height - reading.offsetTop)
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
