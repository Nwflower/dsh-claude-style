import { afterEach, expect, test, vi } from 'vitest'
import { afterPhase, cancelAnimations, LANE_TIMING } from './lane-motion'
import type { PhaseRun } from './lane-motion'

const runs: PhaseRun[] = []
afterEach(() => {
  for (const run of runs.splice(0)) cancelAnimations(run)
  vi.useRealTimers()
})

function phaseRun(phase: PhaseRun['phase'] = 'idle'): PhaseRun {
  const run: PhaseRun = { phase, timer: 0, frame: 0 }
  runs.push(run)
  return run
}

test('a phase ends once, on the frame clock, and clears both of its clocks', async () => {
  const run = phaseRun()
  let finished = 0
  afterPhase(run, 'collapse', 16, () => { finished += 1 })
  expect(run.phase).toBe('collapse')
  await new Promise(resolve => setTimeout(resolve, 120))
  expect(finished).toBe(1)
  expect(run.timer).toBe(0)
  expect(run.frame).toBe(0)
  expect(run.phase).toBe('collapse')
})

test('the deadline ends a phase whose frames never come', () => {
  vi.useFakeTimers()
  const run = phaseRun()
  let finished = 0
  afterPhase(run, 'reveal', LANE_TIMING.reveal, () => { finished += 1 })
  // No frame ever runs in this test: the wall clock is the only way out.
  vi.advanceTimersByTime(LANE_TIMING.reveal + LANE_TIMING.watchdog + 1)
  expect(finished).toBe(1)
})

test('cancelling a phase stops it from finishing at all', async () => {
  const run = phaseRun()
  let finished = 0
  afterPhase(run, 'settle', 16, () => { finished += 1 })
  cancelAnimations(run)
  await new Promise(resolve => setTimeout(resolve, 120))
  expect(finished).toBe(0)
  expect(run.timer).toBe(0)
  expect(run.frame).toBe(0)
})
