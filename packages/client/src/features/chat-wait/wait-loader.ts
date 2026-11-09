import { motionReduced } from '../../core/prefs'
import { motionEase, motionMs } from '../../shared/motion'

/**
 * Rotate the waiting loader's three dot motions every token period, morphing
 * each dot at its still frame. Pairings minimise travel; reduced motion snaps to
 * the resting frame (D40). Lanes and keyframes live in chat-wait.css.
 */

/** A motion the loader's dots play. */
export type WaitLoaderMotion = 'bounce' | 'line' | 'orbit'

/** The lane, and how many dots, one motion is built from. */
const LANES: { motion: WaitLoaderMotion; lane: string; dots: number }[] = [
  { motion: 'bounce', lane: 'is-bounce', dots: 3 },
  { motion: 'line', lane: 'is-line', dots: 3 },
  { motion: 'orbit', lane: 'is-orbit', dots: 4 },
]

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
  /** The rotation running out, so the next motion is laid down. */
  timer: number | null
  /** How many hand-overs have begun, so one that has been overtaken stops. */
  handOvers: number
}

/** A motion's own clock on one dot: its turn, whether every other turn runs backwards, and how far it has run. */
type MotionClock = {
  motion: CSSAnimation
  turn: number
  alternate: boolean
  active: number
}

/** A dot's loader-space pose: scale origin, untranslated position and size. */
type Pose = {
  x: number
  y: number
  originX: number
  originY: number
  scaleX: number
  scaleY: number
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

/** The motion the stylesheet runs on one dot, read off the animation itself. */
function clockOf(dot: Element): MotionClock {
  const motion = dot.getAnimations().find((one): one is CSSAnimation => one instanceof CSSAnimation)
  const effect = motion === undefined ? null : motion.effect
  const time = motion === undefined ? null : motion.currentTime
  if (motion === undefined || effect === null || time === null) {
    throw new Error('chat-wait: a loader dot carries no motion to hand over (chat-wait.css)')
  }
  const timing = effect.getTiming()
  const turn = typeof timing.duration === 'number' ? timing.duration : 0
  if (turn <= 0) throw new Error('chat-wait: a loader motion has no turn to hand over on (chat-wait.css)')
  // The motion's own clock: its delay is the phase it was handed, negative.
  return { motion, turn, alternate: timing.direction === 'alternate', active: Number(time) - Number(timing.delay ?? 0) }
}

/**
 * How far through its own keyframes a motion stands at `time`, as the share of
 * them it has reached: an `alternate` motion plays them backwards every other
 * turn.
 */
function shareAt(turn: number, alternate: boolean, time: number): number {
  const passed = Math.floor(time / turn)
  const through = (time - passed * turn) / turn
  return alternate && passed % 2 === 1 ? 1 - through : through
}

/**
 * How long until the motion next stands at one of these shares. The window is a
 * whole cycle, which is the longest a dot of any motion can be from one of its
 * own moments.
 */
function waitFor(clock: MotionClock, shares: number[]): number {
  const step = 1
  const cycle = clock.turn * (clock.alternate ? 2 : 1)
  for (let waited = 0; waited <= cycle; waited += step) {
    const share = shareAt(clock.turn, clock.alternate, clock.active + waited)
    if (shares.some((one) => Math.abs(share - one) <= step / clock.turn)) return waited
  }
  throw new Error(`chat-wait: a loader motion never reaches ${shares.join('/')} (chat-wait.css)`)
}

/**
 * Where a dot's motion will stand it `wait` from now. The motion is moved there
 * and back inside one task, so no frame is ever drawn at the moment read; the
 * dot carries none of the hand-over's own animations while it is read.
 */
function poseAt(dot: HTMLElement, clock: MotionClock, wait: number): Pose {
  const now = clock.motion.currentTime
  clock.motion.currentTime = Number(now) + wait
  const style = getComputedStyle(dot)
  const translate = style.translate === 'none' ? [] : style.translate.split(' ').map(parseFloat)
  const scale = style.scale === 'none' ? [] : style.scale.split(' ').map(parseFloat)
  clock.motion.currentTime = now
  const originX = dot.offsetLeft + dot.offsetWidth / 2
  const originY = dot.offsetTop + dot.offsetHeight
  return {
    x: originX + (translate[0] ?? 0),
    y: originY + (translate[1] ?? 0),
    originX,
    originY,
    scaleX: scale[0] ?? 1,
    scaleY: scale[1] ?? scale[0] ?? 1,
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
 * the moment its hand-over measures every wait from, and read their clocks.
 */
function anchor(dots: HTMLElement[], start: number): MotionClock[] {
  return dots.map((dot) => {
    clockOf(dot).motion.startTime = start
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
function openingEase(motion: WaitLoaderMotion): '--dsh-claude-ease-damped-in' | '--dsh-claude-ease-damped-out' {
  return motion === 'bounce' ? '--dsh-claude-ease-damped-in' : '--dsh-claude-ease-damped-out'
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
      easing: motionEase(openingEase(to)),
      // Held at both ends: a dot stays hidden until its own moment comes, and
      // keeps the value it reached afterwards.
      fill: 'both',
    }, start)
  }
}

/**
 * Morph the loader from one motion into the next (the file's header describes
 * the shape of it). Every wait below is measured from one moment, the start
 * every new animation is given, so a dot handed over is drawn at the frame its
 * still moment comes and nowhere else.
 *
 * @returns the hand-over's animations, which are all over once the last dot has
 *     landed in its new motion.
 */
function morph(loader: HTMLElement, from: WaitLoaderMotion, to: WaitLoaderMotion): Animation[] {
  const start = timelineNow()
  const travel = motionMs('--dsh-claude-duration-dot-morph')
  const ease = motionEase('--dsh-claude-ease-harmonic')
  const timing = timingOf(laneOf(loader, from))
  const leaving = dotsOf(loader, from)
  const leavingClocks = leaving.map(clockOf)
  const moments = leavingClocks.map((clock) => waitFor(clock, timing.leaves))
  const stood = leaving.map((dot, at) => poseAt(dot, leavingClocks[at], moments[at]))
  // The lane arriving comes back into the page, which starts its motion from the
  // top, on the same clock as everything else here.
  place(loader, to, from)
  const arriving = dotsOf(loader, to)
  const clocks = anchor(arriving, start)
  const pairs = pairDots(leaving.length, arriving.length, (one, two) => {
    const there = poseAt(arriving[two], clocks[two], moments[one])
    return Math.hypot(there.x - stood[one].x, there.y - stood[one].y)
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
    // A spare dot glides onto the partner already standing in for it, and is
    // gone at the frame the two are one.
    const partner = pairs.find((pair) => pair[0] === one)
    if (partner === undefined) throw new Error('chat-wait: a loader dot was left out of the hand-over')
    const meet = poseAt(arriving[partner[1]], clocks[partner[1]], moments[one] + travel)
    const own = stood[one]
    animations.push(handOverAnimation(dot, [
      { translate: `${own.x - own.originX}px ${own.y - own.originY}px`, scale: `${own.scaleX} ${own.scaleY}` },
      { translate: `${meet.x - own.originX}px ${meet.y - own.originY}px`, scale: `${meet.scaleX} ${meet.scaleY}` },
    ], { duration: travel, delay: moments[one], easing: ease, fill: 'forwards' }, start))
    animations.push(switchDot(dot, false, moments[one] + travel, start))
  }
  for (const [at, dot] of arriving.entries()) {
    const lead = leads[at]
    const wait = moments[lead]
    const here = poseAt(dot, clocks[at], wait)
    const landed = poseAt(dot, clocks[at], wait + travel)
    animations.push(switchDot(dot, true, wait, start))
    // An offset added onto the motion's own path, shrinking to nothing: the dot
    // starts where its partner stood and is moving with its new motion by the
    // time it lands. Its size is carried from its partner's to the one its
    // motion has for it on landing.
    animations.push(handOverAnimation(dot, [
      { translate: `${stood[lead].x - here.x}px ${stood[lead].y - here.y}px` },
      { translate: '0px 0px' },
    ], { duration: travel, delay: wait, easing: ease, composite: 'add' }, start))
    animations.push(handOverAnimation(dot, [
      { scale: `${stood[lead].scaleX} ${stood[lead].scaleY}` },
      { scale: `${landed.scaleX} ${landed.scaleY}` },
    ], { duration: travel, delay: wait, easing: ease }, start))
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
    open(loader, to)
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

/** Arm the rotation: when it runs out, one of the other motions takes over. */
function rotate(loader: HTMLElement, state: LoaderState) {
  if (state.timer !== null) window.clearTimeout(state.timer)
  const period = motionMs('--dsh-claude-period-dot-rotate')
  state.timer = window.setTimeout(() => {
    state.timer = null
    if (!loader.isConnected) return
    handOver(loader, state, state.motion, nextMotion(state.motion))
    rotate(loader, state)
  }, period)
}

/**
 * Set one loader going: one of its motions at random at once, then a new one
 * every `--dsh-claude-period-dot-rotate`, never the one already standing.
 *
 * @param loader - the loader leading the line.
 */
export function startWaitLoader(loader: HTMLElement) {
  if (loaders.has(loader)) return
  const opening = LANES[Math.floor(Math.random() * LANES.length)].motion
  const state: LoaderState = { motion: opening, timer: null, handOvers: 0 }
  loaders.set(loader, state)
  handOver(loader, state, null, opening)
  // Under the Reduced choice the loader holds one frame and never takes another
  // up: a rotation would be a visible jump with nothing moving the dots.
  if (!motionReduced()) rotate(loader, state)
}

/** Let go of one loader: a row leaving the page takes no timer with it. */
export function releaseWaitLoader(loader: HTMLElement) {
  const state = loaders.get(loader)
  if (state === undefined) return
  if (state.timer !== null) window.clearTimeout(state.timer)
  loaders.delete(loader)
}
