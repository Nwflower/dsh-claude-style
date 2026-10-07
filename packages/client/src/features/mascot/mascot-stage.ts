import type { MascotLevel, MascotMoment } from './mascot-signals'

/*
 * The mascot's state machine (D24), kept apart from the player so that the
 * decisions run on a plain object and a clock: the player owns the nodes, the
 * animations and the one timer, and asks these functions what to do.
 */

/** How an animation plays: round and round, or once to its last frame. */
export type PlayMode = 'loop' | 'once'

/** What should be on screen (decideStage). */
export interface MascotPick {
  key: string
  mode: PlayMode
  priority: number
}

/** Everything the mascot is doing on the page it stands on (freshStage). */
export interface MascotStage {
  sessionId: string | null
  level: MascotLevel | null
  moment: (MascotLevel & { until: number }) | null
  queued: MascotMoment | null
  reaction: { key: string, mode: PlayMode, fresh: boolean } | null
  extra: string | null
  waking: boolean
  asleep: boolean
  quietSince: number
  nextExtraAt: number
  current: (MascotPick & { start: number, done?: boolean }) | null
  animation: Animation | null
  timer: ReturnType<typeof setTimeout> | null
  clicks: number[]
  press: { id: number, x: number, y: number, lifted: boolean } | null
}

/**
 * What the stage's decisions read from outside the stage: the character's
 * idle extras, whether an extra may start now (the motion choice and the
 * page's visibility), and the dice that space and pick them.
 */
export interface StageSurroundings {
  extras: string[]
  extrasAllowed: boolean
  random: () => number
}

/** A level state that just took the stage holds it this long against an equal or lower one. */
export const MIN_SHOW_MS = 1000
/** The quiet spell before the mascot dozes off. */
export const SLEEP_AFTER_MS = 60000
/** The quiet spell between two idle extras. */
export const EXTRA_MIN_MS = 20000
export const EXTRA_SPAN_MS = 20000
/** Moments hold for two rounds of their animation, as Clawd's auto-return does. */
export const MOMENTS: Record<MascotMoment, MascotLevel & { holdMs: number }> = {
  error: { state: 'error', animation: 'error', priority: 8, holdMs: 4800 },
  attention: { state: 'attention', animation: 'happy', priority: 5, holdMs: 5200 },
}
/** A reaction outranks every state: it answers the reader's own hand. */
export const REACTION_PRIORITY = 10

/**
 * One object for everything the mascot does on a page, replaced whole when it
 * leaves the page: the fields reset together, so none can be forgotten.
 * @param now - where the quiet spell starts.
 */
export function freshStage(now: number): MascotStage {
  return {
    /** The followed session id, or null on the home page. */
    sessionId: null,
    level: null,
    /** The moment on screen, and the lesser one that waits for it to end. */
    moment: null,
    queued: null,
    reaction: null,
    extra: null,
    waking: false,
    asleep: false,
    /** Where the quiet spell starts: the reader's last pointer move or key, or the mascot's last work. */
    quietSince: now,
    nextExtraAt: 0,
    /** The animation on screen: `{ key, mode, priority, start, done? }`. */
    current: null,
    /** The WAAPI animation playing on the strip; null while a still frame is pinned. */
    animation: null,
    timer: null,
    clicks: [],
    press: null,
  }
}

function startMoment(stage: MascotStage, name: MascotMoment, now: number) {
  const next = MOMENTS[name]
  stage.moment = { state: next.state, animation: next.animation, priority: next.priority, until: now + next.holdMs }
}

/**
 * A moment happened. One that outranks the moment on screen (or equals it)
 * takes over now; a lesser one waits its turn — a turn that finishes right
 * after a tool failed still celebrates once the shake is over.
 * @returns whether the moment took the stage now.
 */
export function takeMoment(stage: MascotStage, name: MascotMoment, now: number) {
  if (stage.moment !== null && now < stage.moment.until && stage.moment.priority > MOMENTS[name].priority) {
    stage.queued = name
    return false
  }
  startMoment(stage, name, now)
  return true
}

/** What should be on screen now, given the level the signals read. */
export function decideStage(stage: MascotStage, now: number, level: MascotLevel, around: StageSurroundings): MascotPick {
  if (stage.moment !== null && now >= stage.moment.until) {
    stage.moment = null
    if (stage.queued !== null) startMoment(stage, stage.queued, now)
    stage.queued = null
  }
  if (stage.reaction !== null) return { key: stage.reaction.key, mode: stage.reaction.mode, priority: REACTION_PRIORITY }
  const held = stage.moment
  const pick = held !== null && held.priority >= level.priority ? held : level
  if (pick.state !== 'idle') {
    stage.asleep = false
    stage.waking = false
    stage.extra = null
    stage.nextExtraAt = 0
    // Work on screen is no quiet spell: the minute to sleep starts when it ends.
    stage.quietSince = now
    return { key: pick.animation, mode: 'loop', priority: pick.priority }
  }
  if (!stage.asleep && now - stage.quietSince >= SLEEP_AFTER_MS) {
    stage.asleep = true
    stage.extra = null
  }
  if (stage.asleep) return { key: 'sleeping', mode: 'loop', priority: 1 }
  if (stage.waking) return { key: 'waking', mode: 'once', priority: 1 }
  if (stage.extra === null && around.extrasAllowed) {
    if (stage.nextExtraAt === 0) stage.nextExtraAt = now + EXTRA_MIN_MS + around.random() * EXTRA_SPAN_MS
    else if (now >= stage.nextExtraAt) stage.extra = around.extras[Math.floor(around.random() * around.extras.length)]
  }
  if (stage.extra !== null) return { key: stage.extra, mode: 'once', priority: 1 }
  return { key: 'idle', mode: 'loop', priority: 1 }
}

/** A once animation reached its last frame: whoever asked for it lets go. */
export function finishStage(stage: MascotStage, key: string, now: number, random: () => number) {
  // A fresh reaction has not played yet: the one ending is its predecessor.
  if (stage.reaction !== null && stage.reaction.key === key && !stage.reaction.fresh) stage.reaction = null
  if (stage.extra === key) {
    stage.extra = null
    stage.nextExtraAt = now + EXTRA_MIN_MS + random() * EXTRA_SPAN_MS
  }
  if (key === 'waking') stage.waking = false
}

/**
 * Whether the animation on screen may give way to `next` now. A state that
 * just arrived is not pushed off by an equal or lower one within MIN_SHOW_MS,
 * so thinking and typing do not flicker; a once animation and a reaction give
 * way the moment something else is asked for.
 */
export function switchSettles(stage: MascotStage, next: MascotPick, now: number) {
  const current = stage.current
  return current === null || current.mode !== 'loop' || current.priority === REACTION_PRIORITY ||
    next.priority > current.priority || now - current.start >= MIN_SHOW_MS
}

/**
 * The next moment a time-based decision can flip — a moment's hold ending, a
 * deferred switch settling, a once animation's last frame (backstop for its
 * `finished`), the quiet minute to sleep, the next idle extra — or Infinity
 * when none waits.
 * @param waitSettle - a switch was put off by switchSettles.
 * @param playMs - how long one round of an animation lasts.
 */
export function nextDecisionAt(stage: MascotStage, now: number, waitSettle: boolean, playMs: (key: string) => number) {
  let at = Infinity
  if (stage.moment !== null) at = Math.min(at, stage.moment.until)
  if (waitSettle && stage.current !== null) at = Math.min(at, stage.current.start + MIN_SHOW_MS)
  if (stage.current !== null && stage.current.mode === 'once' && stage.current.done !== true) {
    at = Math.min(at, stage.current.start + playMs(stage.current.key))
  }
  if (!stage.asleep && stage.level !== null && stage.level.state === 'idle') at = Math.min(at, stage.quietSince + SLEEP_AFTER_MS)
  if (stage.extra === null && stage.nextExtraAt > now) at = Math.min(at, stage.nextExtraAt)
  return at
}
