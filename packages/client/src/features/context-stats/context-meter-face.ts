/**
 * Context meter ring geometry and dash computation (features/context-stats/meter-ring.ts,
 * context-ramp-settings.ts).
 */

/** The ring's viewBox, and the radius every face draws on. */
export const METER_RING_SIZE = 14
export const METER_RING_RADIUS = 5.5
/** The arc's whole length. */
export const METER_RING_CIRCUMFERENCE = 2 * Math.PI * METER_RING_RADIUS
/** Two decimals: more is noise at 14 px. */
const RING_PRECISION = 100

/**
 * One reading's arc, as the dash array the ring's fill carries: the share
 * taken, then the whole circle, so the gap is the rest.
 *
 * @param percent - the occupancy, or null while none can be taken.
 * @returns the `stroke-dasharray` value.
 */
export function ringDash(percent: number | null) {
  const whole = Math.round(METER_RING_CIRCUMFERENCE * RING_PRECISION) / RING_PRECISION
  const taken = percent === null ? 0 : Math.round(METER_RING_CIRCUMFERENCE * percent) / RING_PRECISION
  return `${taken} ${whole}`
}
