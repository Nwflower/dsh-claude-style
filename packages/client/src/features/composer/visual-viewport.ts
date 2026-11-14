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
/** A seat already within this many pixels of the visible bottom is left where it is. */
const SEAT_SETTLED_TOLERANCE = 2
/** Frames one trigger may spend correcting the seat before it accepts the result. */
const MAX_CORRECTION_PASSES = 6

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

/**
 * The `bottom` offset that puts the composer seat's lower edge on the visible
 * viewport's lower edge. The host's scroll container does not always end at the
 * layout viewport's bottom (an iOS home-screen app lets it end higher or lower
 * while the keyboard is open), so the offset is measured from where the seat
 * stands now: `appliedOffset` is the offset it already carries, and the seat's
 * lower edge moves by exactly that much. The occlusion caps the result.
 */
export function composerSeatOffset(reading: { occlusion: number, seatBottom: number, appliedOffset: number, viewportBottom: number }) {
  if (reading.occlusion <= 0) return 0
  const wanted = Math.round(reading.appliedOffset + reading.seatBottom - reading.viewportBottom)
  if (Math.abs(wanted - reading.appliedOffset) < SEAT_SETTLED_TOLERANCE) return reading.appliedOffset
  return Math.min(reading.occlusion, Math.max(0, wanted))
}

/** Follow the visible viewport while a mobile keyboard opens, moves or closes. */
export function createComposerViewportFollow() {
  const seats = observeMatches<HTMLElement>(COMPOSER_SELECTOR, () => trigger())
  let cancel: (() => void) | null = null
  let stopped = false
  let gap = 0
  let offset = 0
  let passes = 0

  function trigger() {
    passes = 0
    schedule()
  }

  function schedule() {
    if (stopped || cancel !== null) return
    const before = offset
    cancel = requestFrame({
      read() {
        const viewport = window.visualViewport
        const height = viewport?.height ?? window.innerHeight
        const offsetTop = viewport?.offsetTop ?? 0
        gap = composerViewportGap({
          layoutHeight: window.innerHeight,
          height,
          offsetTop,
          scale: viewport?.scale ?? 1,
          narrow: document.body.hasAttribute(PAGE_UNDER_480_ATTR),
          previousGap: gap,
        })
        const seat = seats.all().find(candidate => candidate.getClientRects().length > 0)
        offset = seat === undefined
          ? 0
          : composerSeatOffset({ occlusion: gap, seatBottom: seat.getBoundingClientRect().bottom, appliedOffset: offset, viewportBottom: offsetTop + height })
      },
      write() {
        cancel = null
        for (const seat of seats.all()) {
          if (offset > 0) seat.style.bottom = `${offset}px`
          else seat.style.removeProperty('bottom')
        }
        // The seat's new position is read on the next frame; stop once it holds or the budget is spent.
        if (offset !== before && passes < MAX_CORRECTION_PASSES) {
          passes += 1
          schedule()
        }
      },
    })
  }

  const viewport = window.visualViewport
  viewport?.addEventListener('resize', trigger)
  viewport?.addEventListener('scroll', trigger)
  window.addEventListener('resize', trigger)
  trigger()

  return () => {
    stopped = true
    if (cancel !== null) cancel()
    cancel = null
    viewport?.removeEventListener('resize', trigger)
    viewport?.removeEventListener('scroll', trigger)
    window.removeEventListener('resize', trigger)
    for (const seat of seats.all()) seat.style.removeProperty('bottom')
    seats.release()
  }
}
