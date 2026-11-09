import { MOTION } from 'virtual:dsh-claude-style/generated'

/** Generated tokens keep script and CSS values identical; unknown names fail immediately (D9, D12).
 * Non-animation timers belong beside their features.
 */

export function motionValue(token: string): string {
  const value = MOTION[token]
  if (value === undefined) throw new Error(`shared/motion: the token table carries no ${token}`)
  return value
}

/** A motion token as a number of milliseconds, for `duration` and `setTimeout`. */
export function motionMs(token: string): number {
  const value = motionValue(token).trim()
  const match = /^([\d.]+)(ms|s)$/.exec(value)
  if (match === null) throw new Error(`shared/motion: ${token} is "${value}", not a duration`)
  return match[2] === 's' ? Number(match[1]) * 1000 : Number(match[1])
}

/** A motion token as an easing curve, for `easing`. */
export function motionEase(token: string): string {
  const value = motionValue(token)
  if (!value.startsWith('cubic-bezier(') && !['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear'].includes(value)) {
    throw new Error(`shared/motion: ${token} is "${value}", not an easing curve`)
  }
  return value
}

/** The curves already parsed, by token: a curve is read at most once per token. */
const CURVES = new Map<string, readonly [number, number, number, number]>()

/** A cubic-bezier token's four control points, in the form the CSS function takes them. */
function curveOf(token: string): readonly [number, number, number, number] {
  const held = CURVES.get(token)
  if (held !== undefined) return held
  const value = motionEase(token)
  const match = /^cubic-bezier\(([^)]+)\)$/.exec(value)
  const parts = match === null ? [] : match[1].split(',').map(part => Number(part.trim()))
  const [x1, y1, x2, y2] = parts
  if (parts.length !== 4 || x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined
    || ![x1, y1, x2, y2].every(Number.isFinite)) {
    throw new Error(`shared/motion: ${token} is "${value}", which has no control points to evaluate`)
  }
  const points = [x1, y1, x2, y2] as const
  CURVES.set(token, points)
  return points
}

/** One coordinate of a cubic bezier whose ends are 0 and 1. */
function bezierAt(t: number, first: number, second: number) {
  const rest = 1 - t
  return 3 * rest * rest * t * first + 3 * rest * t * t * second + t * t * t
}

/** Solve `x(t) = progress` and return `y(t)`; bisection requires the token curves' monotonic x axis. */
export function motionEaseAt(token: string, progress: number): number {
  const [x1, y1, x2, y2] = curveOf(token)
  let low = 0
  let high = 1
  // 24 halvings put the answer within a ten-millionth, past what a pixel of
  // any of these travels can show, at a fixed cost.
  for (let step = 0; step < 24; step += 1) {
    const middle = (low + high) / 2
    if (bezierAt(middle, x1, x2) < progress) low = middle
    else high = middle
  }
  return bezierAt((low + high) / 2, y1, y2)
}
