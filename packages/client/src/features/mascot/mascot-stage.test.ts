import { expect, test } from 'vitest'
import { EXTRA_MIN_MS, EXTRA_SPAN_MS, MIN_SHOW_MS, MOMENTS, REACTION_PRIORITY, SLEEP_AFTER_MS, decideStage, finishStage, freshStage, nextDecisionAt, switchSettles, takeMoment } from './mascot-stage'
import type { MascotStage, StageSurroundings } from './mascot-stage'
import type { MascotLevel } from './mascot-signals'

const IDLE: MascotLevel = { state: 'idle', animation: 'idle', priority: 1 }
const THINKING: MascotLevel = { state: 'thinking', animation: 'thinking', priority: 2 }
const WORKING: MascotLevel = { state: 'working', animation: 'typing', priority: 3 }
const NOTIFICATION: MascotLevel = { state: 'notification', animation: 'notification', priority: 7 }

/** Surroundings with fixed dice: an extra waits the shortest spell and the first extra is picked. */
const around = (extrasAllowed = true): StageSurroundings => ({ extras: ['blink', 'stretch'], extrasAllowed, random: () => 0 })

/** Put a pick on screen at `now`, as the player does when it shows one. */
function show(stage: MascotStage, level: MascotLevel, now: number) {
  const pick = decideStage(stage, now, level, around())
  stage.current = { ...pick, start: now }
  return pick
}

test('a moment outranks a lower level, and the level comes back when its hold ends', () => {
  const stage = freshStage(0)
  expect(takeMoment(stage, 'attention', 100)).toBe(true)
  expect(decideStage(stage, 200, THINKING, around()).key).toBe('happy')
  expect(decideStage(stage, 100 + MOMENTS.attention.holdMs, THINKING, around()).key).toBe('thinking')
})

test('a level above the moment shows over it', () => {
  const stage = freshStage(0)
  takeMoment(stage, 'attention', 0)
  expect(decideStage(stage, 10, NOTIFICATION, around()).key).toBe('notification')
})

test('a lesser moment waits behind a greater one, then takes its own full hold', () => {
  const stage = freshStage(0)
  takeMoment(stage, 'error', 0)
  expect(takeMoment(stage, 'attention', 1000)).toBe(false)
  expect(decideStage(stage, 2000, IDLE, around()).key).toBe('error')
  const ended = MOMENTS.error.holdMs
  expect(decideStage(stage, ended, IDLE, around()).key).toBe('happy')
  expect(stage.moment!.until).toBe(ended + MOMENTS.attention.holdMs)
})

test('a reaction outranks everything until it has played', () => {
  const stage = freshStage(0)
  takeMoment(stage, 'error', 0)
  stage.reaction = { key: 'poke-left', mode: 'once', fresh: true }
  const pick = decideStage(stage, 10, NOTIFICATION, around())
  expect(pick).toEqual({ key: 'poke-left', mode: 'once', priority: REACTION_PRIORITY })
  // Its predecessor ending does not end a reaction that has not been shown yet.
  finishStage(stage, 'poke-left', 20, () => 0)
  expect(stage.reaction).not.toBeNull()
  stage.reaction!.fresh = false
  finishStage(stage, 'poke-left', 30, () => 0)
  expect(stage.reaction).toBeNull()
})

test('a quiet minute puts it to sleep, work wakes it, and a wake plays once', () => {
  const stage = freshStage(0)
  expect(decideStage(stage, SLEEP_AFTER_MS - 1, IDLE, around(false)).key).toBe('idle')
  expect(decideStage(stage, SLEEP_AFTER_MS, IDLE, around(false)).key).toBe('sleeping')
  expect(decideStage(stage, SLEEP_AFTER_MS + 5, WORKING, around()).key).toBe('typing')
  expect(stage.asleep).toBe(false)
  // Work restarts the quiet spell.
  expect(stage.quietSince).toBe(SLEEP_AFTER_MS + 5)
  stage.waking = true
  expect(decideStage(stage, SLEEP_AFTER_MS + 10, IDLE, around())).toEqual({ key: 'waking', mode: 'once', priority: 1 })
  finishStage(stage, 'waking', SLEEP_AFTER_MS + 20, () => 0)
  expect(stage.waking).toBe(false)
})

test('an idle extra waits its spell, plays once, and spaces the next one out', () => {
  const stage = freshStage(0)
  expect(decideStage(stage, 0, IDLE, around()).key).toBe('idle')
  expect(stage.nextExtraAt).toBe(EXTRA_MIN_MS)
  expect(decideStage(stage, EXTRA_MIN_MS - 1, IDLE, around()).key).toBe('idle')
  expect(decideStage(stage, EXTRA_MIN_MS, IDLE, around())).toEqual({ key: 'blink', mode: 'once', priority: 1 })
  finishStage(stage, 'blink', EXTRA_MIN_MS + 500, () => 1)
  expect(stage.extra).toBeNull()
  expect(stage.nextExtraAt).toBe(EXTRA_MIN_MS + 500 + EXTRA_MIN_MS + EXTRA_SPAN_MS)
})

test('no extra starts while extras are held back', () => {
  const stage = freshStage(0)
  decideStage(stage, 0, IDLE, around(false))
  expect(stage.nextExtraAt).toBe(0)
})

test('a state that just arrived holds against an equal or lower one for a moment', () => {
  const stage = freshStage(0)
  show(stage, WORKING, 0)
  const thinking = decideStage(stage, 10, THINKING, around())
  expect(switchSettles(stage, thinking, 10)).toBe(false)
  expect(switchSettles(stage, thinking, MIN_SHOW_MS)).toBe(true)
  const notification = decideStage(stage, 10, NOTIFICATION, around())
  expect(switchSettles(stage, notification, 10)).toBe(true)
})

test('the next decision is the earliest moment something can flip', () => {
  const stage = freshStage(0)
  stage.level = IDLE
  expect(nextDecisionAt(stage, 0, false, () => 400)).toBe(SLEEP_AFTER_MS)
  takeMoment(stage, 'attention', 100)
  expect(nextDecisionAt(stage, 100, false, () => 400)).toBe(100 + MOMENTS.attention.holdMs)
  stage.current = { key: 'poke-left', mode: 'once', priority: REACTION_PRIORITY, start: 200 }
  expect(nextDecisionAt(stage, 200, false, () => 400)).toBe(600)
  stage.current = { key: 'thinking', mode: 'loop', priority: 2, start: 300 }
  expect(nextDecisionAt(stage, 300, true, () => 400)).toBe(300 + MIN_SHOW_MS)
  stage.moment = null
  stage.asleep = true
  expect(nextDecisionAt(stage, 300, false, () => 400)).toBe(Infinity)
})
