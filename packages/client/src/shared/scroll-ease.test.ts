import { expect, test } from 'vitest'
import { springArrived, stepSpring } from './scroll-ease'

/** One 60 Hz frame, in seconds. */
const FRAME_S = 1 / 60

/** Run the spring frame by frame from rest until it arrives (or the frame cap runs out), recording each frame. */
function glide(from: number, target: number, frames = 240) {
  const trace: { position: number, velocity: number }[] = []
  let position = from
  let velocity = 0
  for (let i = 0; i < frames; i += 1) {
    ;({ position, velocity } = stepSpring(position, velocity, target, FRAME_S))
    trace.push({ position, velocity })
    if (springArrived(position, velocity, target)) break
  }
  return trace
}

test('from rest the speed builds up: the first frame stays under the acceleration cap', () => {
  const [first] = glide(0, 320)
  // 24000 px/s² for one frame.
  expect(first.velocity).toBeLessThanOrEqual(24000 * FRAME_S + 1e-6)
  expect(first.velocity).toBeGreaterThan(0)
})

test('a long gap glides at no more than the speed cap', () => {
  const trace = glide(0, 1200)
  expect(Math.max(...trace.map(step => step.velocity))).toBeLessThanOrEqual(2400)
})

test('the spring arrives without overshoot, and its last move is below a pixel', () => {
  for (const gap of [12, 80, 320, 1200]) {
    const trace = glide(0, gap)
    const last = trace.at(-1)!
    expect(springArrived(last.position, last.velocity, gap)).toBe(true)
    expect(Math.max(...trace.map(step => step.position))).toBeLessThanOrEqual(gap + 0.5)
    const before = trace.at(-2)!
    expect(gap - before.position).toBeLessThan(1)
  }
})

test('a short gap is mostly covered in about a sixth of a second', () => {
  const trace = glide(0, 40)
  // 95% of a short gap in 4.74 / ω seconds (ω = 28): about ten frames.
  const at = trace.findIndex(step => step.position >= 38)
  expect(at).toBeGreaterThan(0)
  expect(at).toBeLessThanOrEqual(11)
})

test('a target that grows mid-flight keeps the motion: no restart from rest', () => {
  let position = 0
  let velocity = 0
  for (let i = 0; i < 4; i += 1) ({ position, velocity } = stepSpring(position, velocity, 200, FRAME_S))
  const carried = velocity
  ;({ position, velocity } = stepSpring(position, velocity, 400, FRAME_S))
  expect(velocity).toBeGreaterThanOrEqual(carried)
})

test('the motion does not depend on how the time is cut into frames', () => {
  const whole = stepSpring(0, 0, 300, 0.1)
  let position = 0
  let velocity = 0
  for (let i = 0; i < 6; i += 1) ({ position, velocity } = stepSpring(position, velocity, 300, 0.1 / 6))
  expect(Math.abs(position - whole.position)).toBeLessThan(0.5)
})
