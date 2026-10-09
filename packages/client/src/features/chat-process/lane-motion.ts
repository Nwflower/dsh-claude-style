import { PROCESS_LANE_ATTR } from '../../constants'
import { PROCESS_BODY_SELECTOR, TURN_PROCESS_MEMBER_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'

/**
 * The lane's presentation clock and the primitives every phase is built from
 * (D55, D56): the numbers dsh-better-display's reader settled on, the
 * rendered-time phase runner, the layout-suspension events the follow listens
 * for, and the box hold an animated height measures against.
 *
 * The reference implementation is the source of every constant here
 * (`fold-choreography.ts`, `motion.tsx`, `ChoreographedFlow.tsx`); the skin
 * copies the numbers, not the code.
 */

/** The lane's presentation clock, from dsh-better-display's fold choreography. */
export const LANE_TIMING = {
  /** One cell changing size: the reference's FlowCell height-and-opacity move. */
  cell: 220,
  collapse: 320,
  count: 160,
  settle: 80,
  reveal: 180,
  /** The summary's landing pulse, and the elastic a settled fold leaves behind. */
  pulse: 180,
  /** Slack added to every phase deadline before the watchdog forces the next phase. */
  watchdog: 240,
  easing: 'cubic-bezier(.4,0,.2,1)',
  /** The easing the reference's own disclosure moves use. */
  easeOut: 'cubic-bezier(.22,1,.36,1)',
  /** The elastic a landed fold plays under. */
  easeElastic: 'cubic-bezier(.2,0,0,1)',
} as const

/** Where one segment or the turn itself is in the choreography. */
export type LanePhase = 'idle' | 'collapse' | 'count' | 'settle' | 'reveal'

/** What a phase needs from whatever is running it: its animations, its deadline and its frame. */
export interface PhaseRun {
  phase: LanePhase
  timer: number
  frame: number
}

/**
 * The marks an animated layout puts on the page: the follow stands down between
 * the two (dsh-better-display's `reader-layout-start`/`-end`).
 */
export const LAYOUT_START_EVENT = 'dsh-claude-layout-start'
export const LAYOUT_END_EVENT = 'dsh-claude-layout-end'

/** Say that an animated layout is about to move things. */
export function layoutStart(root: Element) {
  root.dispatchEvent(new CustomEvent(LAYOUT_START_EVENT, { bubbles: true }))
}

/** Say that the animated layout is over. */
export function layoutEnd(root: Element) {
  root.dispatchEvent(new CustomEvent(LAYOUT_END_EVENT, { bubbles: true }))
}

/**
 * Enter `phase` and run `next` after `ms` of *rendered* time, or when the
 * deadline fires, whichever comes first.
 *
 * The reference counts painted frames rather than trusting a timer: a busy
 * browser can run a 320 ms timer without painting one frame of the shrink, and
 * the phase would then be over before the reader saw anything. Each frame
 * counts at most 40 ms, so a tab that paints rarely still advances. The
 * deadline covers the other side — a hidden tab paints nothing at all.
 *
 * @returns the finish, so an animation promise and the clock can race for it.
 */
export function afterPhase(running: PhaseRun, phase: LanePhase, ms: number, next: () => void) {
  running.phase = phase
  let done = false
  const finish = () => {
    if (done) return
    done = true
    if (running.timer !== 0) {
      window.clearTimeout(running.timer)
      running.timer = 0
    }
    if (running.frame !== 0) {
      cancelAnimationFrame(running.frame)
      running.frame = 0
    }
    next()
  }
  let elapsed = 0
  let previous: number | undefined
  const tick = (now: number) => {
    if (previous !== undefined) elapsed += Math.min(40, now - previous)
    previous = now
    if (elapsed < ms) {
      running.frame = requestAnimationFrame(tick)
      return
    }
    finish()
  }
  running.frame = requestAnimationFrame(tick)
  running.timer = window.setTimeout(finish, ms + LANE_TIMING.watchdog)
  return finish
}

/** Cancel every animation and clock a phase is running. */
export function cancelAnimations(running: { animations?: Animation[], timer: number, frame: number }) {
  for (const animation of running.animations ?? []) animation.cancel()
  if (running.animations !== undefined) running.animations = []
  if (running.timer !== 0) {
    window.clearTimeout(running.timer)
    running.timer = 0
  }
  if (running.frame !== 0) {
    cancelAnimationFrame(running.frame)
    running.frame = 0
  }
}

/**
 * The reference's FlowCell move: one cell opens or closes on its own measured
 * height, fading against it over 220 ms (D56).
 */
export function animateCell(element: HTMLElement, hidden: boolean, motion: boolean): Animation | null {
  const height = element.getBoundingClientRect().height
  if (!motion || height < 1) return null
  return element.animate(
    [{ height: `${hidden ? height : 0}px`, opacity: hidden ? 1 : 0 }, { height: `${hidden ? 0 : height}px`, opacity: hidden ? 0 : 1 }],
    { duration: LANE_TIMING.cell, easing: LANE_TIMING.easing, fill: 'both' },
  )
}

/**
 * The reference's retiring move: a row that leaves the visible window gives way
 * in three stops rather than a straight shrink, so the reader sees it settle
 * before it goes.
 */
export function animateRetire(element: HTMLElement, motion: boolean): Animation | null {
  const height = element.getBoundingClientRect().height
  if (!motion || height < 1) return null
  return element.animate(
    [
      { height: `${height}px`, opacity: 1 },
      { height: `${height * .5}px`, opacity: .85, offset: .5 },
      { height: '0px', opacity: 0 },
    ],
    { duration: LANE_TIMING.collapse, easing: LANE_TIMING.easing, fill: 'both' },
  )
}

/** The reference's reveal: new space opens before anything is painted into it. */
export function animateReveal(element: HTMLElement, motion: boolean): Animation | null {
  const height = element.getBoundingClientRect().height
  if (!motion || height < 1) return null
  return element.animate(
    [{ height: '0px', opacity: 0 }, { height: `${height}px`, opacity: 1 }],
    { duration: LANE_TIMING.reveal, easing: LANE_TIMING.easing, fill: 'both' },
  )
}

/** The pulse the reference plays when its live summary first stands (D56). */
export function playPulse(element: HTMLElement, motion: boolean) {
  if (!motion) return
  element.animate(
    [
      { transform: 'translateY(-4px) scale(.98)', opacity: .8 },
      { transform: 'translateY(0) scale(1.02)', opacity: 1, offset: .5 },
      { transform: 'translateY(0) scale(1)', opacity: 1 },
    ],
    { duration: LANE_TIMING.pulse, easing: LANE_TIMING.easeOut, fill: 'none' },
  )
}

/** The elastic the reference leaves behind when a fold lands (D56). */
export function playElastic(element: HTMLElement, motion: boolean) {
  if (!motion) return
  element.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.015)', offset: .5 }, { transform: 'scale(1)' }],
    { duration: LANE_TIMING.pulse, easing: LANE_TIMING.easeElastic, fill: 'none' },
  )
}

/**
 * Keep hidden boxes laid out, so an animated height has something to measure.
 * The group bodies are in the set as well: the host hides every level of the
 * fold at once, and `content-visibility` is not inherited.
 */
export function holdBoxes(elements: readonly HTMLElement[]): HTMLElement[] {
  const held = new Set<HTMLElement>()
  for (const element of elements) {
    held.add(element)
    const body = element.querySelector(PROCESS_BODY_SELECTOR)
    if (body instanceof HTMLElement) held.add(body)
    for (const row of element.querySelectorAll<HTMLElement>(`[${TURN_PROCESS_MEMBER_ATTRIBUTE}]`)) held.add(row)
  }
  const list = [...held]
  for (const element of list) element.setAttribute(PROCESS_LANE_ATTR, '')
  return list
}

/** Hand held boxes back: the host's own `hidden` attribute takes them from here. */
export function releaseHeld(held: HTMLElement[]) {
  for (const element of held) element.removeAttribute(PROCESS_LANE_ATTR)
}
