import { easeValueAt } from '../../shared/motion'

/**
 * Pure-math pose sampling for the wait loader's CSS animations (D40). Reads
 * each dot's untranslated origin once and evaluates its `KeyframeEffect`
 * `translate`/`scale` tracks in JS so hand-over swirl arcs and dot pairing
 * never interleave `currentTime` writes with `getComputedStyle` or layout reads.
 */

/** A motion's own clock on one dot: its turn, delay, direction, and how far it has run. */
export type MotionClock = {
  motion: CSSAnimation
  turn: number
  delay: number
  alternate: boolean
  active: number
}

/** A dot's untranslated loader-space centre, read once per hand-over. */
export type DotOrigin = {
  originX: number
  originY: number
}

/** A dot's loader-space pose: scale origin, untranslated position and size. */
export type Pose = {
  x: number
  y: number
  originX: number
  originY: number
  scaleX: number
  scaleY: number
}

/** Evaluates a dot's CSS motion at `wait` ms from now without mutating `currentTime` or flushing layout. */
export type DotSampler = (wait: number) => Pose

/** One stop along a per-property keyframe track (`translate` or `scale`). */
type PairStop = {
  offset: number
  x: number
  y: number
  curve: string
}

const PX_TOKEN_RE = /^(?:0|-?(?:\d+\.?\d*|\.\d+)px)$/
const NUM_TOKEN_RE = /^-?(?:\d+\.?\d*|\.\d+)$/

/** The motion the stylesheet runs on one dot, read off the animation itself. */
export function clockOf(dot: Element): MotionClock {
  const motion = dot.getAnimations().find((one): one is CSSAnimation => one instanceof CSSAnimation)
  const effect = motion === undefined ? null : motion.effect
  const time = motion === undefined ? null : motion.currentTime
  if (motion === undefined || effect === null || time === null) {
    throw new Error('chat-wait: a loader dot carries no motion to hand over (chat-wait.css)')
  }
  const timing = effect.getTiming()
  const turn = typeof timing.duration === 'number' ? timing.duration : 0
  if (turn <= 0) throw new Error('chat-wait: a loader motion has no turn to hand over on (chat-wait.css)')
  const delay = Number(timing.delay ?? 0)
  // The motion's own clock: its delay is the phase it was handed, negative.
  return { motion, turn, delay, alternate: timing.direction === 'alternate', active: Number(time) - delay }
}

/**
 * How far through its own keyframes a motion stands at `time`, as the share of
 * them it has reached: an `alternate` motion plays them backwards every other
 * turn.
 */
export function shareAt(turn: number, alternate: boolean, time: number): number {
  const passed = Math.floor(time / turn)
  const through = (time - passed * turn) / turn
  return alternate && passed % 2 === 1 ? 1 - through : through
}

/**
 * How long until the motion next stands at one of these shares. The window is a
 * whole cycle, which is the longest a dot of any motion can be from one of its
 * own moments.
 */
export function waitFor(clock: MotionClock, shares: number[]): number {
  const step = 1
  const cycle = clock.turn * (clock.alternate ? 2 : 1)
  for (let waited = 0; waited <= cycle; waited += step) {
    const share = shareAt(clock.turn, clock.alternate, clock.active + waited)
    if (shares.some((one) => Math.abs(share - one) <= step / clock.turn)) return waited
  }
  throw new Error(`chat-wait: a loader motion never reaches ${shares.join('/')} (chat-wait.css)`)
}

/** Parse a resolved CSS `translate` property into `[x, y]` px, or null when CSS expressions remain. */
function parseTranslate(raw: string): [number, number] | null {
  const trimmed = raw.trim()
  if (trimmed === 'none') return [0, 0]
  const parts = trimmed.split(/\s+/)
  if (parts.length < 1 || parts.length > 2) return null
  if (!parts.every((part) => PX_TOKEN_RE.test(part))) return null
  return [parseFloat(parts[0]), parts[1] === undefined ? 0 : parseFloat(parts[1])]
}

/** Parse a resolved CSS `scale` property into `[sx, sy]`, or null when CSS expressions remain. */
function parseScale(raw: string): [number, number] | null {
  const trimmed = raw.trim()
  if (trimmed === 'none') return [1, 1]
  const parts = trimmed.split(/\s+/)
  if (parts.length < 1 || parts.length > 2) return null
  if (!parts.every((part) => NUM_TOKEN_RE.test(part))) return null
  const sx = parseFloat(parts[0])
  return [sx, parts[1] === undefined ? sx : parseFloat(parts[1])]
}

/** Interpolate a sorted per-property keyframe track at normalised share `share` in `[0, 1]`. */
function evalTrack(stops: PairStop[], share: number, fallbackX: number, fallbackY: number): [number, number] {
  if (stops.length === 0) return [fallbackX, fallbackY]
  if (share <= stops[0].offset) return [stops[0].x, stops[0].y]
  for (let index = 0; index < stops.length - 1; index += 1) {
    const start = stops[index]
    const end = stops[index + 1]
    if (share > end.offset) continue
    const span = end.offset - start.offset
    const eased = span <= 0 ? 1 : easeValueAt(start.curve, (share - start.offset) / span)
    return [start.x + (end.x - start.x) * eased, start.y + (end.y - start.y) * eased]
  }
  const last = stops[stops.length - 1]
  return [last.x, last.y]
}

/** Read a dot's untranslated centre once so sampling its motion never flushes layout again. */
export function originOf(dot: HTMLElement): DotOrigin {
  return {
    originX: dot.offsetLeft + dot.offsetWidth / 2,
    originY: dot.offsetTop + dot.offsetHeight / 2,
  }
}

/**
 * Build a pure-math sampler for one dot's CSS motion from its resolved
 * keyframes (D40). Literal keyframe values parse directly; any unexpanded CSS
 * custom property or calc() expression is resolved once per distinct expression
 * without interleaved layout reads, so swirl sampling and pairing touch no DOM.
 */
export function samplerOf(dot: HTMLElement, clock: MotionClock, origin: DotOrigin): DotSampler {
  const effect = clock.motion.effect
  const keyframes = effect instanceof KeyframeEffect ? effect.getKeyframes() : []
  const translateTrack: PairStop[] = []
  const scaleTrack: PairStop[] = []
  const resolvedTranslate = new Map<string, [number, number]>()
  const resolvedScale = new Map<string, [number, number]>()
  const savedTime = clock.motion.currentTime
  let movedClock = false

  const readAtOffset = (offset: number) => {
    const shareTime = offset >= 1 && !clock.alternate ? Math.max(0, clock.turn - 0.01) : offset * clock.turn
    clock.motion.currentTime = clock.delay + shareTime
    movedClock = true
    return getComputedStyle(dot)
  }

  for (const frame of keyframes) {
    const offset = frame.computedOffset
    if (typeof offset !== 'number') continue
    const curve = typeof frame.easing === 'string' ? frame.easing : 'linear'
    if (typeof frame.translate === 'string') {
      let pair = parseTranslate(frame.translate) ?? resolvedTranslate.get(frame.translate) ?? null
      if (pair === null) {
        const computed = readAtOffset(offset).translate
        pair = parseTranslate(computed) ?? [0, 0]
        resolvedTranslate.set(frame.translate, pair)
      }
      translateTrack.push({ offset, x: pair[0], y: pair[1], curve })
    }
    if (typeof frame.scale === 'string') {
      let pair = parseScale(frame.scale) ?? resolvedScale.get(frame.scale) ?? null
      if (pair === null) {
        const computed = readAtOffset(offset).scale
        pair = parseScale(computed) ?? [1, 1]
        resolvedScale.set(frame.scale, pair)
      }
      scaleTrack.push({ offset, x: pair[0], y: pair[1], curve })
    }
  }
  if (movedClock) clock.motion.currentTime = savedTime

  return (wait: number): Pose => {
    const share = shareAt(clock.turn, clock.alternate, clock.active + wait)
    const [tx, ty] = evalTrack(translateTrack, share, 0, 0)
    const [sx, sy] = evalTrack(scaleTrack, share, 1, 1)
    return {
      x: origin.originX + tx,
      y: origin.originY + ty,
      originX: origin.originX,
      originY: origin.originY,
      scaleX: sx,
      scaleY: sy,
    }
  }
}
