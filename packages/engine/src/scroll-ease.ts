import { requestFrame } from './frame'
/**
 * The one scroll motion the skin draws: a critically damped spring, so a target that grows mid-flight is only a wider gap and the arrival has no overshoot. Only the scroll owner imports this module (packages/engine/src/scroll-owner.ts, D40); the build refuses any other importer.
 */
/** The spring's angular frequency, critical damping implied: 95% of a short gap is covered in about 170ms. */
const SCROLL_EASE_OMEGA = 28
/** The fastest the position moves, in pixels a second; past it the motion reads as a blur. */
const SCROLL_EASE_MAX_SPEED_PX_S = 2400
/** The hardest the position speeds up or slows down, in pixels a second squared: full speed from rest takes a tenth of a second. */
const SCROLL_EASE_MAX_ACCEL_PX_S2 = 24000
/** The longest stretch that is glided: a farther destination is first closed to it, so every arrival takes the same last stretch. The stream slide (features/chat-follow/chat-follow.ts) carries no more than this from a burst. */
export const SCROLL_EASE_LEAD_PX = 1200
/** Within this of the destination, and slower than SCROLL_EASE_REST_PX_S, the position has arrived. */
const SCROLL_EASE_DONE_PX = 0.5
const SCROLL_EASE_REST_PX_S = 10
/** The integration step, in seconds: a whole frame is too coarse for this spring (ω × 16.7 ms is close to one half), so the speed builds continuously. */
const SCROLL_EASE_STEP_S = 0.001
/** A position more than this off the ease's own last write was moved by someone else, and is taken as it is. */
const SCROLL_EASE_MOVED_PX = 1.5
/** The longest frame interval the curve counts; past it the page was hidden or held up. */
const SCROLL_EASE_MAX_FRAME_MS = 64
/** One frame at 60 Hz, for the first frame of a run, which has no interval yet. */
const SCROLL_EASE_NOMINAL_FRAME_MS = 16.7

/** One element's ease: where it is going, whether it is still wanted, and the motion it carries. */
export interface ScrollEase {
  destination: (element: Element, end: number) => number
  wanted: () => boolean
  lead: number
  velocity: number
  position: number | null
  lastWritten: number | null
}

/** The elements easing now, each with its destination, its test, and the motion it carries. */
const scrollEasing = new Map<Element, ScrollEase>()
/** Whether the shared frame is requested; false when nothing is easing. */
let scrollEaseFrameQueued = false
/** The previous frame's timestamp, for the interval. */
let scrollEaseLastAt = 0

/** Carry a position and its speed toward a target through `seconds` of the spring, in SCROLL_EASE_STEP_S steps with both caps applied. */
export function stepSpring(position: number, velocity: number, target: number, seconds: number) {
  for (let spent = 0; spent < seconds; spent += SCROLL_EASE_STEP_S) {
    const step = Math.min(SCROLL_EASE_STEP_S, seconds - spent)
    let acceleration = SCROLL_EASE_OMEGA * SCROLL_EASE_OMEGA * (target - position) - 2 * SCROLL_EASE_OMEGA * velocity
    acceleration = Math.max(-SCROLL_EASE_MAX_ACCEL_PX_S2, Math.min(SCROLL_EASE_MAX_ACCEL_PX_S2, acceleration))
    // Semi-implicit Euler: the velocity steps first and the position
    // follows it — the order that keeps a stiff spring stable.
    velocity = Math.max(-SCROLL_EASE_MAX_SPEED_PX_S, Math.min(SCROLL_EASE_MAX_SPEED_PX_S, velocity + acceleration * step))
    position += velocity * step
  }
  return { position, velocity }
}

/** Whether a position has arrived: within half a pixel of the target and nearly still. */
export function springArrived(position: number, velocity: number, target: number) {
  return Math.abs(target - position) <= SCROLL_EASE_DONE_PX && Math.abs(velocity) <= SCROLL_EASE_REST_PX_S
}

/** A scroll container's end: the position that shows its last pixel. */
export function scrollEnd(element: Element) {
  return element.scrollHeight - element.clientHeight
}

/**
 * Start, or keep, easing this element's position toward a destination.
 * @param element - the scroll container.
 * @param destination - asked every frame with the end already read; the end itself needs no second reading, which would force a layout pass (D9).
 * @param wanted - asked every frame; false ends this element's ease where it is.
 * @param lead - the longest stretch glided; a reader's own jump wants a short one, whose glide only says which way the page went.
 */
export function easeScroll(element: Element, destination: (element: Element, end: number) => number, wanted: () => boolean, lead = SCROLL_EASE_LEAD_PX) {
  // A re-arm while a run is in flight keeps its speed: zeroing it would re-do
  // the take-off the spring exists to avoid.
  const active = scrollEasing.get(element)
  scrollEasing.set(element, {
    destination,
    wanted,
    lead,
    velocity: active === undefined ? 0 : active.velocity,
    position: active === undefined ? null : active.position,
    // Carried across a re-arm like the velocity: a fresh reading would look
    // like someone else's move (scrollEasePosition).
    lastWritten: active === undefined ? null : active.lastWritten,
  })
  if (scrollEaseFrameQueued) return
  scrollEaseLastAt = 0
  scrollEaseFrameQueued = true
  requestFrame({ scroll: stepScrollEase })
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
 * The position the ease last wrote on this element, or null while it is not easing on it. The scroll owner hands it on, so a jump reads where its own walk has the position without a layout reading of its own.
 * @param element - the scroll container.
 */
export function scrollEasePosition(element: Element) {
  const ease = scrollEasing.get(element)
  return ease === undefined ? null : ease.lastWritten
}

/** Put the position down and say what was really written (the container may round it). */
function writeScrollEase(element: Element, ease: ScrollEase, value: number) {
  ease.position = value
  element.scrollTop = value
  ease.lastWritten = element.scrollTop
  return ease.lastWritten
}

/**
 * One frame of every ease in flight.
 * @param now - this frame's timestamp.
 */
function stepScrollEase(now: number) {
  scrollEaseFrameQueued = false
  const interval = scrollEaseLastAt === 0
    ? SCROLL_EASE_NOMINAL_FRAME_MS
    : Math.min(SCROLL_EASE_MAX_FRAME_MS, Math.max(0, now - scrollEaseLastAt))
  scrollEaseLastAt = now
  const seconds = interval / 1000
  for (const [element, ease] of scrollEasing) {
    // One container's callback throwing must not freeze the others' motion
    // (D12): the failing element is dropped here and the frame carries the rest.
    try {
      // A container that left the document, or one the reader has taken over,
      // is done here: the loop never scrolls what nobody is following.
      if (!element.isConnected || !ease.wanted()) {
        scrollEasing.delete(element)
        continue
      }
      const floor = scrollEnd(element)
      const target = Math.max(0, Math.min(floor, ease.destination(element, floor)))
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
      const motion = stepSpring(position, ease.velocity, target, seconds)
      const velocity = motion.velocity
      position = Math.max(0, Math.min(floor, motion.position))
      if (springArrived(position, velocity, target)) {
        writeScrollEase(element, ease, target)
        scrollEasing.delete(element)
        continue
      }
      ease.velocity = velocity
      const written = writeScrollEase(element, ease, position)
      // A container can clamp the write a few pixels short of the arithmetic
      // end (clipped overflow, scrollbar rounding): it has arrived as far as it
      // can, and the loop must not keep waking for it.
      if (Math.abs(written - position) > SCROLL_EASE_MOVED_PX) scrollEasing.delete(element)
    } catch (error) {
      scrollEasing.delete(element)
      reportError(error)
    }
  }
  if (scrollEasing.size === 0) return
  scrollEaseFrameQueued = true
  requestFrame({ scroll: stepScrollEase })
}
