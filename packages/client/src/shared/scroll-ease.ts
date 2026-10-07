import { requestFrame } from '../core/frame'
/**
 * Walk a scroll container's position to where it is going instead of
 * writing it in one frame: the one scroll motion the skin draws.
 *
 * Its one reader is the scroll owner (shared/scroll-owner.ts, D41), which
 * decides whose request the spring carries on each container; the build
 * fails when anything else imports this module.
 *
 * The curve is a critically damped spring:
 *
 *     acceleration = ω² × gap − 2ω × velocity
 *
 * A spring is what a moving target needs: a target that grows mid-flight is
 * just a wider gap on the next step, with no restart and no stutter, and a
 * critically damped one arrives without overshoot.
 *
 * Three things keep the motion smooth at its two ends and in between:
 *
 *   start    the spring is integrated in one-millisecond steps. A whole frame
 *            is too coarse a step for it (ω × 16.7 ms is close to one half):
 *            stepped a frame at a time, the first frame alone carried the
 *            speed to its peak, and a 320px block left at 1800px/s from rest.
 *            Fine steps let the speed build continuously.
 *   middle   the acceleration and the speed are both capped: a long gap
 *            builds up over about a tenth of a second into one steady glide
 *            (a little brisker than the browser's own smooth scroll), and the
 *            spring takes the deceleration back once the gap is short.
 *   arrival  the position is kept as a fraction and the ease ends when it is
 *            within half a pixel and nearly still, so the last write is
 *            below a pixel. Ending at two pixels, as this once did, put a
 *            1.7px jump at the end of every glide — every streamed line came
 *            to rest with a tick.
 *
 * A gap longer than the ease's lead (SCROLL_EASE_LEAD_PX unless the caller
 * gives a shorter one) is first closed to that distance on the side the
 * position comes from, then glided: every destination, near or far, is
 * reached with the same last stretch, and nobody waits for a glide across a
 * dozen screens.
 *
 * The frame's own interval drives the integration, so a dropped frame covers
 * more ground rather than arriving late, and the loop exists only while
 * something is easing — the last arrival cancels it.
 */
/**
 * The spring's angular frequency, critical damping implied: 95% of a short
 * gap is covered in 4.74 / ω seconds, about 170ms. Compared on a replayed
 * stream with the twenty it replaced, the newest line spends a quarter to a
 * third less time hidden under the bottom edge, and with the fine steps the
 * largest change of speed between two frames is still lower than before.
 */
export const SCROLL_EASE_OMEGA = 28
/** The fastest the position moves, in pixels a second; past it the motion reads as a blur. */
export const SCROLL_EASE_MAX_SPEED_PX_S = 2400
/** The hardest the position speeds up or slows down, in pixels a second squared: full speed from rest takes a tenth of a second. */
export const SCROLL_EASE_MAX_ACCEL_PX_S2 = 24000
/**
 * The longest stretch that is glided. A gap past it is first closed to it
 * (see above); it is also the line the stream glide draws between a burst of
 * content and a replaced column.
 */
export const SCROLL_EASE_LEAD_PX = 1200
/** Within this of the destination, and slower than SCROLL_EASE_REST_PX_S, the position has arrived. */
export const SCROLL_EASE_DONE_PX = 0.5
export const SCROLL_EASE_REST_PX_S = 10
/** The integration step, in seconds. */
export const SCROLL_EASE_STEP_S = 0.001
/** A position more than this off the ease's own last write was moved by someone else, and is taken as it is. */
export const SCROLL_EASE_MOVED_PX = 1.5
/** The longest frame interval the curve counts; past it the page was hidden or held up. */
export const SCROLL_EASE_MAX_FRAME_MS = 64
/** One frame at 60 Hz, for the first frame of a run, which has no interval yet. */
export const SCROLL_EASE_NOMINAL_FRAME_MS = 16.7

/** One element's ease: where it is going, whether it is still wanted, and the motion it carries. */
export interface ScrollEase {
  destination: (element: Element) => number
  wanted: () => boolean
  lead: number
  velocity: number
  position: number | null
  lastWritten: number | null
}

/** The elements easing now, each with its destination, its test, and the motion it carries. */
export const scrollEasing = new Map<Element, ScrollEase>()
/** Whether the shared frame is requested; false when nothing is easing. */
export let scrollEaseFrameQueued = false
/** The previous frame's timestamp, for the interval. */
export let scrollEaseLastAt = 0

/** A scroll container's end: the position that shows its last pixel. */
export function scrollEnd(element: Element) {
  return element.scrollHeight - element.clientHeight
}

/**
 * Start (or keep) easing this element's position toward a destination.
 *
 * @param element - the scroll container.
 * @param destination - asked every frame: the position wanted now.
 * @param wanted - asked every frame; false ends this element's ease where it is.
 * @param lead - the longest stretch glided; a farther destination is first
 *     closed to it. A jump the reader asked for wants a short one: the glide
 *     only has to say which way the page went.
 */
export function easeScroll(element: Element, destination: (element: Element) => number, wanted: () => boolean, lead = SCROLL_EASE_LEAD_PX) {
  // A run already in flight keeps the motion it is carrying: the re-arm is
  // for re-reading the tests, and zeroing the speed would re-do the take-off
  // the spring exists to avoid.
  const active = scrollEasing.get(element)
  scrollEasing.set(element, {
    destination,
    wanted,
    lead,
    velocity: active === undefined ? 0 : active.velocity,
    position: active === undefined ? null : active.position,
    // Carried across a re-arm, like the velocity: it is a reading of where
    // this run has the position, and a fresh one would read as a move made
    // by someone else (see scrollEasePosition).
    lastWritten: active === undefined ? null : active.lastWritten,
  })
  if (scrollEaseFrameQueued) return
  scrollEaseLastAt = 0
  scrollEaseFrameQueued = true
  requestFrame({ write: stepScrollEase })
}

/** End this element's ease, leaving the position where it is. */
export function stopScrollEase(element: Element) {
  scrollEasing.delete(element)
}

/**
 * Whether this element is being eased right now.
 * @param element - the scroll container.
 */
export function isScrollEasing(element: Element) {
  return scrollEasing.has(element)
}

/**
 * The position the ease last wrote on this element, or null while it is not
 * easing on it.
 *
 * The scroll owner reads it to tell the host's pin apart from the spring's
 * own step inside one frame (takeBackHostPin): the host writes the end
 * outright the moment content grows, and the distance that write added has
 * to go back to the spring instead of painting.
 * @param element - the scroll container.
 */
export function scrollEasePosition(element: Element) {
  const ease = scrollEasing.get(element)
  return ease === undefined ? null : ease.lastWritten
}

/** Put the position down and say what was really written (the container may round it). */
export function writeScrollEase(element: Element, ease: ScrollEase, value: number) {
  ease.position = value
  element.scrollTop = value
  ease.lastWritten = element.scrollTop
  return ease.lastWritten
}

/**
 * One frame of every ease in flight.
 * @param now - this frame's timestamp.
 */
export function stepScrollEase(now: number) {
  scrollEaseFrameQueued = false
  const interval = scrollEaseLastAt === 0
    ? SCROLL_EASE_NOMINAL_FRAME_MS
    : Math.min(SCROLL_EASE_MAX_FRAME_MS, Math.max(0, now - scrollEaseLastAt))
  scrollEaseLastAt = now
  const seconds = interval / 1000
  for (const [element, ease] of scrollEasing) {
    // A container that left the document, or one the reader has taken over,
    // is done here: the loop never scrolls what nobody is following.
    if (!element.isConnected || !ease.wanted()) {
      scrollEasing.delete(element)
      continue
    }
    const floor = scrollEnd(element)
    const target = Math.max(0, Math.min(floor, ease.destination(element)))
    // The fraction the ease keeps, unless someone else moved the position
    // since its last write: then the position is taken where it is.
    let position = ease.position
    if (position === null || ease.lastWritten === null || Math.abs(element.scrollTop - ease.lastWritten) > SCROLL_EASE_MOVED_PX) {
      position = element.scrollTop
    }
    // A far destination: closed to the lead first, on the side the position comes from.
    if (Math.abs(target - position) > ease.lead) {
      position = target - Math.sign(target - position) * ease.lead
    }
    let velocity = ease.velocity
    for (let spent = 0; spent < seconds; spent += SCROLL_EASE_STEP_S) {
      const step = Math.min(SCROLL_EASE_STEP_S, seconds - spent)
      let acceleration = SCROLL_EASE_OMEGA * SCROLL_EASE_OMEGA * (target - position) - 2 * SCROLL_EASE_OMEGA * velocity
      acceleration = Math.max(-SCROLL_EASE_MAX_ACCEL_PX_S2, Math.min(SCROLL_EASE_MAX_ACCEL_PX_S2, acceleration))
      // Semi-implicit Euler: the velocity steps first and the position
      // follows it — the order that keeps a stiff spring stable.
      velocity = Math.max(-SCROLL_EASE_MAX_SPEED_PX_S, Math.min(SCROLL_EASE_MAX_SPEED_PX_S, velocity + acceleration * step))
      position += velocity * step
    }
    position = Math.max(0, Math.min(floor, position))
    if (Math.abs(target - position) <= SCROLL_EASE_DONE_PX && Math.abs(velocity) <= SCROLL_EASE_REST_PX_S) {
      writeScrollEase(element, ease, target)
      scrollEasing.delete(element)
      continue
    }
    ease.velocity = velocity
    const written = writeScrollEase(element, ease, position)
    // The container's real end can sit a few pixels inside the arithmetic
    // one — a child's clipped overflow, a scrollbar's rounding — and the
    // write is then clamped: a position the container will not take has
    // arrived as far as it can, and the loop must not keep waking for it.
    if (Math.abs(written - position) > SCROLL_EASE_MOVED_PX) scrollEasing.delete(element)
  }
  if (scrollEasing.size === 0) return
  scrollEaseFrameQueued = true
  requestFrame({ write: stepScrollEase })
}
