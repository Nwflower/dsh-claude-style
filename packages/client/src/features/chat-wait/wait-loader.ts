import { buildElement } from '@dsh-claude-style/engine/dom'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { motionReduced } from '../../core/prefs'
import { motionEase, motionEaseAt, motionMs } from '../../shared/motion'
import { clockOf, originOf, samplerOf, waitFor } from './wait-loader-sampler'
import type { DotSampler, MotionClock, Pose } from './wait-loader-sampler'

/**
 * The waiting loader's four dot motions: it holds one while the model outputs
 * and swirls each dot in counter-clockwise polar coordinates into the next when
 * an output ends past the minimum gap (setWaitLoaderOutputting). Reduced motion
 * snaps to the resting frame (D40). Lanes and keyframes live in chat-wait.css.
 */

/** A motion the loader's dots play. */
export type WaitLoaderMotion = 'bounce' | 'line' | 'orbit' | 'cross'

/** The lane, dot count, and whether its dots reach rest together. */
const LANES: { motion: WaitLoaderMotion; lane: string; dots: number; sync: boolean; landShare: number }[] = [
  { motion: 'bounce', lane: 'is-bounce', dots: 3, sync: false, landShare: 0 },
  { motion: 'line', lane: 'is-line', dots: 3, sync: false, landShare: 0 },
  { motion: 'orbit', lane: 'is-orbit', dots: 4, sync: true, landShare: 0.9583 },
  { motion: 'cross', lane: 'is-cross', dots: 3, sync: true, landShare: 0 },
]

/** Full circle in radians. */
const TWO_PI = Math.PI * 2
/** Preferred counter-clockwise sweep (~207 deg) used to pair swirl arcs cleanly. */
const TARGET_SWIRL = -Math.PI * 1.15
/** Samples along one polar swirl arc, matching is-orbit's baked curve precision. */
const SWIRL_STEPS = 16
/** Maximum interval between samples during a level-line hold before wave launch. */
const HOLD_STEP_MS = 35

/**
 * The motion the Reduced choice rests on: the bounce lane's three dots on their
 * own places are a still frame with no keyframe to read, and every line opens on
 * the same one so a rebuilt row does not change the picture (chat-wait.css).
 */
const STILL_MOTION: WaitLoaderMotion = 'bounce'

/** The lane in play, the one on its way out, and the one out of the page. */
const ACTIVE = 'is-active'
const LEAVING = 'is-leaving'
const RESTING = 'is-resting'

/** What the hand-over's own animations are called, so a stale one can be let go. */
const HAND_OVER = 'dsh-claude-wait-hand-over'

const DOT = 'dsh-claude-chat-wait-dot'

/** A lane's fade-in and still-frame shares plus its opening fade length. */
type LaneTiming = {
  arrives: number[]
  leaves: number[]
  fade: number
}

type LoaderState = {
  /** The motion in play, or on its way in while the one before it hands its dots over. */
  motion: WaitLoaderMotion
  /** How many hand-overs have begun, so one that has been overtaken stops. */
  handOvers: number
  /** Whether the model was outputting on the last pass, to catch the moment it stops. */
  outputting: boolean
  /** When the last hand-over began, so the next one waits out the minimum gap. */
  lastHandOverAt: number
  /** Cancels a hand-over deferred to the next frame so it never runs mid-microtask after DOM writes (D40). */
  cancelPending: (() => void) | null
}

const loaders = new WeakMap<HTMLElement, LoaderState>()

function laneEntry(motion: WaitLoaderMotion) {
  const entry = LANES.find((one) => one.motion === motion)
  if (entry === undefined) throw new Error(`chat-wait: no lane is built for ${motion} (chat-wait.css)`)
  return entry
}

function laneOf(loader: HTMLElement, motion: WaitLoaderMotion): Element {
  const lane = loader.querySelector(`.${laneEntry(motion).lane}`)
  if (lane === null) throw new Error('chat-wait: the loader is missing a lane (chat-wait.css)')
  return lane
}

/** The dots of one lane. */
function dotsOf(loader: HTMLElement, motion: WaitLoaderMotion): HTMLElement[] {
  return Array.from(laneOf(loader, motion).querySelectorAll<HTMLElement>(`.${DOT}`))
}

/** Draw the active lane, keep the leaving lane until hand-over, and rest the others. */
function place(loader: HTMLElement, active: WaitLoaderMotion | null, leaving: WaitLoaderMotion | null) {
  for (const { motion } of LANES) {
    const lane = laneOf(loader, motion)
    lane.classList.toggle(ACTIVE, motion === active)
    lane.classList.toggle(LEAVING, motion === leaving)
    lane.classList.toggle(RESTING, motion !== active && motion !== leaving)
  }
}

/** The shares a lane declares for one of the hand-over's names. */
function sharesOf(style: CSSStyleDeclaration, name: string): number[] {
  return style.getPropertyValue(name).trim().split(/\s+/).filter((one) => one !== '').map(Number)
}

function timingOf(lane: Element): LaneTiming {
  const style = getComputedStyle(lane)
  const fade = Number(style.getPropertyValue('--dsh-claude-dot-fade'))
  if (!Number.isFinite(fade) || fade <= 0) throw new Error('chat-wait: a loader lane declares no fade length (chat-wait.css)')
  const leaves = sharesOf(style, '--dsh-claude-dot-leaves')
  if (leaves.length === 0) throw new Error('chat-wait: a loader lane declares no moment its dots stand still (chat-wait.css)')
  return { arrives: sharesOf(style, '--dsh-claude-dot-arrives'), leaves, fade }
}

/** Visual centre of the loader box, used as the pole of every swirl arc. */
function centerOf(loader: HTMLElement): { x: number; y: number } {
  return {
    x: (loader.clientWidth || 18) / 2,
    y: (loader.clientHeight || 14) / 2,
  }
}

/** Polar coordinates of a point relative to the loader's centre. */
function polarOf(point: { x: number; y: number }, center: { x: number; y: number }): { r: number; theta: number } {
  const dx = point.x - center.x
  const dy = point.y - center.y
  return { r: Math.hypot(dx, dy), theta: Math.atan2(dy, dx) }
}

/** Counter-clockwise angular sweep from one angle to another in screen coordinates. */
function ccwDelta(fromTheta: number, toTheta: number): number {
  const raw = (((toTheta - fromTheta) % TWO_PI) + TWO_PI) % TWO_PI
  const ccw = raw - TWO_PI
  return ccw > -Math.PI / 3 ? ccw - TWO_PI : ccw
}

/** Cost of pairing two dots on a counter-clockwise swirl: favours uniform sweep around TARGET_SWIRL. */
function swirlCost(from: Pose, to: Pose, center: { x: number; y: number }): number {
  const startPolar = polarOf(from, center)
  const endPolar = polarOf(to, center)
  const delta = ccwDelta(startPolar.theta, endPolar.theta)
  return Math.abs(delta - TARGET_SWIRL) + Math.abs(endPolar.r - startPolar.r) * 0.08
}

/** World position along a counter-clockwise polar spiral at normalised progress `u`. */
function swirlAt(
  from: { r: number; theta: number },
  to: { r: number; theta: number },
  delta: number,
  center: { x: number; y: number },
  u: number,
): { x: number; y: number } {
  const eTheta = motionEaseAt('--dsh-claude-ease-dot-swirl', u)
  const eRadius = motionEaseAt('--dsh-claude-ease-harmonic', u)
  const radius = from.r + (to.r - from.r) * eRadius
  const angle = from.theta + delta * eTheta
  return {
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle),
  }
}

/**
 * Pair the dots of the motion leaving with those of the motion arriving so they
 * travel least: every dot on both sides is in at least one pair, so with more
 * dots on one side a dot of the other is in two — one dot splitting in two, or
 * two meeting in one.
 *
 * @param cost - how far one leaving dot is from one arriving dot at the leaving
 *     dot's own still moment.
 * @returns the pairs, as [leaving dot, arriving dot].
 */
function pairDots(leaving: number, arriving: number, cost: (from: number, to: number) => number): [number, number][] {
  const many = Math.max(leaving, arriving)
  const few = Math.min(leaving, arriving)
  let best: [number, number][] = []
  let least = Infinity
  // Every map from the side with more dots onto the side with fewer, as the
  // digits of one number in base `few`; one that misses a dot is no pairing.
  for (let code = 0; code < few ** many; code += 1) {
    const pairs: [number, number][] = []
    const reached = new Set<number>()
    for (let at = 0, rest = code; at < many; at += 1, rest = Math.floor(rest / few)) {
      const other = rest % few
      reached.add(other)
      pairs.push(leaving >= arriving ? [at, other] : [other, at])
    }
    if (reached.size < few) continue
    const total = pairs.reduce((sum, [from, to]) => sum + cost(from, to), 0)
    if (total < least) {
      least = total
      best = pairs
    }
  }
  return best
}

/** The document's own clock, which every motion and hand-over animation runs on. */
function timelineNow(): number {
  const now = document.timeline.currentTime
  if (now === null) throw new Error('chat-wait: the document timeline has no time to hand the loader over on')
  return Number(now)
}

/**
 * Start the motions of a lane that has just come back into the page at `start`,
 * or phase-locked so its `landShare` stands at `start + targetRel`, and read
 * their clocks.
 */
function anchor(dots: HTMLElement[], start: number, targetRel?: number, landShare = 0): MotionClock[] {
  return dots.map((dot) => {
    const clock = clockOf(dot)
    if (targetRel === undefined) {
      clock.motion.startTime = start
    } else {
      const offsetInTurn = landShare * clock.turn
      const cycles = Math.ceil((targetRel - offsetInTurn) / clock.turn) + 1
      clock.motion.startTime = start + targetRel - offsetInTurn - cycles * clock.turn
    }
    return clockOf(dot)
  })
}

/** Let go of the animations a hand-over left on the loader. */
function dropHandOver(loader: HTMLElement) {
  for (const dot of loader.querySelectorAll(`.${DOT}`)) {
    for (const one of dot.getAnimations()) if (one.id === HAND_OVER) one.cancel()
  }
}

/**
 * Run one of the hand-over's own animations on the clock the motions read: its
 * start is the moment every wait in this hand-over was measured from.
 */
function handOverAnimation(dot: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions, start: number): Animation {
  const animation = dot.animate(keyframes, { ...options, id: HAND_OVER })
  animation.startTime = start
  return animation
}

/** Show or hide a dot at one frame, held either side of it. */
function switchDot(dot: Element, shown: boolean, wait: number, start: number): Animation {
  return handOverAnimation(dot, shown ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], { duration: 0, delay: wait, fill: 'both' }, start)
}

/** The curve a lane's opening fade runs on, read from the token sheet (D9). */
function openingEase(): '--dsh-claude-ease-damped-out' {
  return '--dsh-claude-ease-damped-out'
}

/**
 * Open the loader on a motion: its lane comes into the page, which starts its
 * motion from the top, and each dot fades in over one of its own legs from the
 * moment that motion next carries it to where it arrives.
 */
function open(loader: HTMLElement, to: WaitLoaderMotion) {
  place(loader, to, null)
  const lane = timingOf(laneOf(loader, to))
  const start = timelineNow()
  const dots = dotsOf(loader, to)
  const clocks = anchor(dots, start)
  for (const [at, dot] of dots.entries()) {
    const clock = clocks[at]
    handOverAnimation(dot, [{ opacity: 0 }, { opacity: 1 }], {
      duration: clock.turn * lane.fade,
      delay: lane.arrives.length === 0 ? 0 : waitFor(clock, lane.arrives),
      easing: motionEase(openingEase()),
      // Held at both ends: a dot stays hidden until its own moment comes, and
      // keeps the value it reached afterwards.
      fill: 'both',
    }, start)
  }
}

/**
 * Sample a counter-clockwise polar swirl as additive keyframes on an arriving
 * dot, plus an optional flat hold between `swirlEnd` and `landEnd` so a
 * synchronised arrival can rest on a level baseline before rippling into motion.
 */
function arrivingSwirlKeyframes(
  sample: DotSampler,
  fromPos: Pose,
  toPos: Pose,
  center: { x: number; y: number },
  wait: number,
  swirlEnd: number,
  landEnd: number,
): Keyframe[] {
  const fromPolar = polarOf(fromPos, center)
  const toPolar = polarOf(toPos, center)
  const delta = ccwDelta(fromPolar.theta, toPolar.theta)
  const total = Math.max(1, landEnd - wait)
  const swirlSpan = Math.max(1, swirlEnd - wait)
  const frames: Keyframe[] = []
  for (let step = 0; step <= SWIRL_STEPS; step += 1) {
    const u = step / SWIRL_STEPS
    const t = wait + u * swirlSpan
    const offset = (t - wait) / total
    const target = u === 0 ? fromPos : u === 1 ? toPos : swirlAt(fromPolar, toPolar, delta, center, u)
    const here = sample(t)
    const dx = target.x - here.x
    const dy = target.y - here.y
    frames.push({
      offset,
      translate: step === SWIRL_STEPS && landEnd <= swirlEnd ? '0px 0px' : `${dx.toFixed(2)}px ${dy.toFixed(2)}px`,
    })
  }
  if (landEnd > swirlEnd) {
    const holdSpan = landEnd - swirlEnd
    const holdSteps = Math.max(4, Math.ceil(holdSpan / HOLD_STEP_MS))
    for (let step = 1; step <= holdSteps; step += 1) {
      const t = swirlEnd + (step / holdSteps) * holdSpan
      const offset = step === holdSteps ? 1 : (t - wait) / total
      if (step === holdSteps) {
        frames.push({ offset, translate: '0px 0px' })
        continue
      }
      const here = sample(t)
      frames.push({
        offset,
        translate: `${(toPos.x - here.x).toFixed(2)}px ${(toPos.y - here.y).toFixed(2)}px`,
      })
    }
  }
  return frames
}

/** Sample a counter-clockwise polar swirl as absolute translate keyframes on a spare leaving dot. */
function spareSwirlKeyframes(
  fromPos: Pose,
  toPos: Pose,
  center: { x: number; y: number },
): Keyframe[] {
  const fromPolar = polarOf(fromPos, center)
  const toPolar = polarOf(toPos, center)
  const delta = ccwDelta(fromPolar.theta, toPolar.theta)
  const frames: Keyframe[] = []
  for (let step = 0; step <= SWIRL_STEPS; step += 1) {
    const u = step / SWIRL_STEPS
    const target = u === 0 ? fromPos : u === 1 ? toPos : swirlAt(fromPolar, toPolar, delta, center, u)
    const scaleX = fromPos.scaleX + (toPos.scaleX - fromPos.scaleX) * u
    const scaleY = fromPos.scaleY + (toPos.scaleY - fromPos.scaleY) * u
    frames.push({
      offset: u,
      translate: `${(target.x - fromPos.originX).toFixed(2)}px ${(target.y - fromPos.originY).toFixed(2)}px`,
      scale: `${scaleX.toFixed(3)} ${scaleY.toFixed(3)}`,
    })
  }
  return frames
}

/**
 * Morph the loader from one motion into the next along coherent counter-clockwise
 * polar swirls. Staggered departures landing on a synchronised lane (`cross`,
 * `orbit`) share one arrival instant; synchronised departures landing on the
 * wave (`bounce`) land together on the top baseline, hold briefly, and ripple
 * downward in order. Landing on the walk (`line`), each dot's swirl lands a
 * beat after the one before it and releases straight into the already-moving
 * walk, so displacement starts promptly and asynchronously rather than waiting
 * for every dot to reach a still end.
 */
function morph(loader: HTMLElement, from: WaitLoaderMotion, to: WaitLoaderMotion): Animation[] {
  const start = timelineNow()
  const travel = motionMs('--dsh-claude-duration-dot-morph')
  const settle = motionMs('--dsh-claude-duration-dot-settle')
  const scaleEase = motionEase('--dsh-claude-ease-harmonic')
  const center = centerOf(loader)
  const fromEntry = laneEntry(from)
  const toEntry = laneEntry(to)
  const timing = timingOf(laneOf(loader, from))
  const leaving = dotsOf(loader, from)
  const leavingOrigins = leaving.map(originOf)
  const leavingClocks = leaving.map(clockOf)
  const leavingSamplers = leaving.map((dot, at) => samplerOf(dot, leavingClocks[at], leavingOrigins[at]))
  const moments = leavingClocks.map((clock) => waitFor(clock, timing.leaves))
  const stood = leavingSamplers.map((sample, at) => sample(moments[at]))
  const maxMoment = Math.max(...moments)
  const sharedSwirlEnd = maxMoment + travel
  const waveSyncArrival = fromEntry.sync && to === 'bounce'
  const lineWalkArrival = to === 'line'
  const lineStagger = motionMs('--dsh-claude-period-dot-line') / 8
  // The lane arriving comes back into the page, anchored so a synchronised lane
  // stands on its rest pose at `sharedSwirlEnd` and a wave receiving a synchronised
  // swirl launches from its top baseline after the brief hold. The walk keeps its
  // own running clock (the stylesheet's negative delays phase the three dots), and
  // each dot's swirl lands a beat after the one before it, straight into the moving
  // walk — so displacement begins promptly and asynchronously, with no wait at an end.
  place(loader, to, from)
  const arriving = dotsOf(loader, to)
  const arrivingOrigins = arriving.map(originOf)
  const clocks = toEntry.sync
    ? anchor(arriving, start, sharedSwirlEnd, toEntry.landShare)
    : waveSyncArrival
      ? anchor(arriving, start, sharedSwirlEnd + settle, 0)
      : anchor(arriving, start)
  const arrivingSamplers = arriving.map((dot, at) => samplerOf(dot, clocks[at], arrivingOrigins[at]))
  const swirlEnds = arriving.map((_, at) => {
    if (toEntry.sync || waveSyncArrival) return sharedSwirlEnd
    if (lineWalkArrival) return sharedSwirlEnd + at * lineStagger
    return moments[Math.min(at, moments.length - 1)] + travel
  })
  const landEnds = arriving.map((_, at) => {
    if (toEntry.sync) return sharedSwirlEnd
    if (waveSyncArrival) return sharedSwirlEnd + settle + at * (clocks[at].turn / 6)
    return swirlEnds[at]
  })
  const pairTargets = arrivingSamplers.map((sample, at) => sample(landEnds[at]))
  const pairs = pairDots(leaving.length, arriving.length, (one, two) => {
    const target = toEntry.sync || waveSyncArrival || lineWalkArrival
      ? pairTargets[two]
      : arrivingSamplers[two](moments[one] + travel)
    return swirlCost(stood[one], target, center)
  })
  // The first of an arriving dot's partners to stand still is the one it takes
  // the place of; any other meets it there afterwards.
  const leads = arriving.map((_, at) => pairs.filter((pair) => pair[1] === at).map((pair) => pair[0])
    .reduce((first, one) => (moments[one] < moments[first] ? one : first)))
  // The leaving dots are laid down first: a spare one reads where its partner's
  // motion will be, which is read before any hand-over animation is on it.
  const animations: Animation[] = []
  for (const [one, dot] of leaving.entries()) {
    if (leads.includes(one)) {
      animations.push(switchDot(dot, false, moments[one], start))
      continue
    }
    const partner = pairs.find((pair) => pair[0] === one)
    if (partner === undefined) throw new Error('chat-wait: a loader dot was left out of the hand-over')
    const arrivingAt = partner[1]
    const endAt = toEntry.sync || waveSyncArrival ? sharedSwirlEnd : lineWalkArrival ? landEnds[arrivingAt] : moments[one] + travel
    const meet = arrivingSamplers[arrivingAt](waveSyncArrival || lineWalkArrival ? landEnds[arrivingAt] : endAt)
    const dur = Math.max(1, endAt - moments[one])
    animations.push(handOverAnimation(
      dot,
      spareSwirlKeyframes(stood[one], meet, center),
      { duration: dur, delay: moments[one], easing: 'linear', fill: 'forwards' },
      start,
    ))
    animations.push(switchDot(dot, false, endAt, start))
  }
  for (const [at, dot] of arriving.entries()) {
    const lead = leads[at]
    const wait = moments[lead]
    const swirlEnd = toEntry.sync || waveSyncArrival ? sharedSwirlEnd : lineWalkArrival ? swirlEnds[at] : wait + travel
    const landEnd = toEntry.sync ? sharedSwirlEnd : waveSyncArrival ? landEnds[at] : swirlEnd
    const landed = arrivingSamplers[at](landEnd)
    animations.push(switchDot(dot, true, wait, start))
    animations.push(handOverAnimation(
      dot,
      arrivingSwirlKeyframes(arrivingSamplers[at], stood[lead], landed, center, wait, swirlEnd, landEnd),
      { duration: Math.max(1, landEnd - wait), delay: wait, easing: 'linear', composite: 'add' },
      start,
    ))
    if (stood[lead].scaleX !== landed.scaleX || stood[lead].scaleY !== landed.scaleY) {
      animations.push(handOverAnimation(dot, [
        { scale: `${stood[lead].scaleX} ${stood[lead].scaleY}` },
        { scale: `${landed.scaleX} ${landed.scaleY}` },
      ], { duration: Math.max(1, swirlEnd - wait), delay: wait, easing: scaleEase }, start))
    }
  }
  return animations
}

/**
 * Hand the loader over from one motion to the next, or open it on its first.
 *
 * @param from - the lane in play, or null for the opening motion, which has no
 *     lane to leave.
 */
function handOver(loader: HTMLElement, state: LoaderState, from: WaitLoaderMotion | null, to: WaitLoaderMotion) {
  dropHandOver(loader)
  state.motion = to
  const handOvers = ++state.handOvers
  if (from === null) {
    // Under the Reduced choice there is no motion to read and none to hand over:
    // the lane is placed on the still frame its stylesheet keeps for it.
    if (motionReduced()) place(loader, to, null)
    else open(loader, to)
    return
  }
  if (motionReduced()) {
    place(loader, to, null)
    return
  }
  const animations = morph(loader, from, to)
  // The lane leaving stays in the page until its last dot has been handed over,
  // then steps out of it, which is what stops a motion nothing draws. A later
  // hand-over, or a loader let go of, owns the lanes by then, so this one stops.
  void Promise.allSettled(animations.map((one) => one.finished)).then(() => {
    if (!loader.isConnected || loaders.get(loader) !== state || state.handOvers !== handOvers) return
    place(loader, to, null)
    dropHandOver(loader)
  })
}

/** Pick the motion that follows the one in play: any of the others, at random. */
function nextMotion(motion: WaitLoaderMotion): WaitLoaderMotion {
  const others = LANES.filter((one) => one.motion !== motion)
  return others[Math.floor(Math.random() * others.length)].motion
}

/** Drop any frame-queued hand-over on `state`. */
function cancelPendingHandOver(state: LoaderState) {
  if (state.cancelPending === null) return
  state.cancelPending()
  state.cancelPending = null
}

/**
 * Tell the loader whether the model is outputting right now (thinking, drawing
 * up or running a call, writing its answer). The motion holds while the model
 * outputs; the moment an output ends — the fall from outputting to silent — the
 * next motion takes over on the next frame (D40), once the hand-over in play
 * has stood for the minimum gap (`--dsh-claude-duration-dot-handover-gap`).
 */
export function setWaitLoaderOutputting(loader: HTMLElement, outputting: boolean) {
  const state = loaders.get(loader)
  if (state === undefined) return
  const was = state.outputting
  state.outputting = outputting
  if (!was || outputting) return
  if (motionReduced() || !loader.isConnected || state.cancelPending !== null) return
  const now = timelineNow()
  if (now - state.lastHandOverAt < motionMs('--dsh-claude-duration-dot-handover-gap')) return
  // Schedule on the next frame so morph() never flushes style/layout inside a
  // streaming microtask directly after DOM writes (D40).
  state.cancelPending = requestFrame({
    write() {
      state.cancelPending = null
      if (!loader.isConnected || loaders.get(loader) !== state || motionReduced()) return
      state.lastHandOverAt = timelineNow()
      handOver(loader, state, state.motion, nextMotion(state.motion))
    },
  })
}

/**
 * The loader the Claude brand leads the row with, where the host draws its
 * whale tail: one lane of accent dots for each of the loader's four motions
 * (chat-wait.css). Every motion is built up front, so swapping lanes is a
 * hand-over rather than a redraw. The dots are decorative — the host's live
 * region is what a reader hears.
 */
export function buildWaitLoader(): HTMLElement {
  const loader = buildElement('span', 'dsh-claude-chat-wait-loader')
  loader.setAttribute('aria-hidden', 'true')
  for (const { lane, dots } of LANES) {
    const box = buildElement('span', `dsh-claude-chat-wait-lane ${lane}`)
    for (let dot = 0; dot < dots; dot += 1) box.append(buildElement('span', DOT))
    loader.append(box)
  }
  return loader
}

/**
 * Set one loader going on one of its motions at random. It holds that motion
 * while the model outputs and takes another up only when an output ends past
 * the minimum gap (setWaitLoaderOutputting), never the one already standing.
 *
 * @param loader - the loader leading the line.
 */
export function startWaitLoader(loader: HTMLElement) {
  if (loaders.has(loader)) return
  const opening = motionReduced() ? STILL_MOTION : LANES[Math.floor(Math.random() * LANES.length)].motion
  const state: LoaderState = { motion: opening, handOvers: 0, outputting: false, lastHandOverAt: timelineNow(), cancelPending: null }
  loaders.set(loader, state)
  handOver(loader, state, null, opening)
}

/**
 * Put one loader on the animation choice the reader holds now: under the
 * Reduced choice it rests on the still frame and takes no other motion up,
 * otherwise it keeps the motion in play. The next output-end lays another down
 * (setWaitLoaderOutputting); the choice can flip while a line stands, and a
 * hand-over armed under the other answer would fold the next motion in place
 * with nothing moving the dots.
 */
export function resyncWaitLoader(loader: HTMLElement) {
  const state = loaders.get(loader)
  if (state === undefined) return
  cancelPendingHandOver(state)
  dropHandOver(loader)
  if (motionReduced()) {
    state.motion = STILL_MOTION
    place(loader, STILL_MOTION, null)
    return
  }
  place(loader, state.motion, null)
}

/** Let go of one loader: a row leaving the page takes no hand-over with it. */
export function releaseWaitLoader(loader: HTMLElement) {
  const state = loaders.get(loader)
  if (state !== undefined) cancelPendingHandOver(state)
  loaders.delete(loader)
}
