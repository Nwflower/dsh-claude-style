import { setAttributeIfChanged } from '@dsh-claude-style/engine/dom'

/**
 * The colour ramp a reading takes, after dsh-chat-ux's design: a reading
 * is placed between two stops and the browser mixes the colour between them in
 * OKLCH, so one reading of a session is one colour out of a continuous band
 * rather than one of a few buckets. The values themselves live in the
 * stylesheet (features/composer/inline-bar.css); this module only says which
 * segment a reading fell in and where inside it.
 */

/** The mark naming which ramp an element follows, and the segment within it. */
export const RAMP_ATTRIBUTE = 'data-dsh-claude-ramp'
export const RAMP_SPAN_ATTRIBUTE = 'data-dsh-claude-ramp-span'
/** Where inside that segment the reading sits, as a percentage. */
export const RAMP_POSITION_VAR = '--dsh-claude-ramp-position'
/** Below the first stop: both ends of the reading are the same colour. */
export const RAMP_SPAN_LOW = 'low'
/** From the last stop on: the same, at the other end. */
export const RAMP_SPAN_HIGH = 'high'

/** The cache-hit stops: red below 90%, dark green from 99% on. */
export const CACHE_HIT_STOPS = [90, 92, 94, 96, 98, 99]

/** Which band of colours an element takes: the cache share, or the occupancy. */
export type RampKind = 'cache' | 'context'

/** Where one reading fell: its segment, and how far into it. */
export interface RampPosition {
  span: string
  mix: string
}

/**
 * Place one reading on its stops.
 *
 * @param value - the reading the reader sees, as a number.
 * @param stops - the stops on that reading's axis, ascending.
 * @returns the segment (its index, or `low` / `high`) and the position inside
 *   it as a percentage with one decimal.
 */
export function rampPosition(value: number, stops: readonly number[]): RampPosition {
  const floor = stops[0]
  const top = stops[stops.length - 1]
  if (value < floor) return { span: RAMP_SPAN_LOW, mix: '0%' }
  if (value >= top) return { span: RAMP_SPAN_HIGH, mix: '0%' }
  let segment = 0
  for (let index = 1; index < stops.length - 1; index++) {
    if (value >= stops[index]) segment = index
  }
  const from = stops[segment]
  const to = stops[segment + 1]
  return { span: String(segment), mix: `${Math.round((value - from) / (to - from) * 1000) / 10}%` }
}

/**
 * Put one reading's ramp on an element, or take it off when there is none to
 * place (the element then keeps the colour it inherits). Every write is
 * decided against the value the element carries: this runs on each projection
 * frame while a turn streams, and a redundant write would invalidate the
 * element's styles for nothing.
 *
 * @param element - the reading's own element, or the meter whose ring it paints.
 * @param kind - which ramp's colours apply.
 * @param position - where the reading fell, or null when it could not be read.
 * @returns whether the element's ramp changed, so a caller that read colours
 *   from it before this write knows they are stale.
 */
export function writeRamp(element: HTMLElement, kind: RampKind, position: RampPosition | null) {
  const before = rampState(element)
  if (position === null) {
    // A removal writes whatever the element carried: this runs on every
    // projection frame while a turn streams, and the reading is null for most
    // of them, so an element that never carried a ramp would take a style
    // invalidation per frame for nothing.
    if (element.hasAttribute(RAMP_ATTRIBUTE)) element.removeAttribute(RAMP_ATTRIBUTE)
    if (element.hasAttribute(RAMP_SPAN_ATTRIBUTE)) element.removeAttribute(RAMP_SPAN_ATTRIBUTE)
    if (element.style.getPropertyValue(RAMP_POSITION_VAR) !== '') element.style.removeProperty(RAMP_POSITION_VAR)
  } else {
    setAttributeIfChanged(element, RAMP_ATTRIBUTE, kind)
    setAttributeIfChanged(element, RAMP_SPAN_ATTRIBUTE, position.span)
    if (element.style.getPropertyValue(RAMP_POSITION_VAR) !== position.mix) element.style.setProperty(RAMP_POSITION_VAR, position.mix)
  }
  return rampState(element) !== before
}

/** The three values a ramp writes, as one string to compare before and after a write. */
function rampState(element: HTMLElement) {
  return `${element.getAttribute(RAMP_ATTRIBUTE)}|${element.getAttribute(RAMP_SPAN_ATTRIBUTE)}|${element.style.getPropertyValue(RAMP_POSITION_VAR)}`
}
