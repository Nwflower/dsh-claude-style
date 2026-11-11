/**
 * The rail's frame wakes stay one ask per window (D94).
 * @capability session-panel
 * @features session-panel
 * @risk A streaming turn's figure frames wake one ask each, drop the signal that
 *   arrived inside the window, or leave a timer asking after the rail is gone.
 */
import { expect, test } from 'vitest'
import { createWakeThrottle } from '@dsh-claude-style/client/pure'

/** A clock and the timers a spec owns, so every window is driven by hand. */
function stand(minMs: number) {
  let at = 1000
  let next = 1
  const timers = new Map<number, { run: () => void, due: number }>()
  let wakes = 0
  const throttle = createWakeThrottle({
    minMs,
    now: () => at,
    setTimeout(run, ms) {
      const id = next++
      timers.set(id, { run, due: at + ms })
      return id
    },
    clearTimeout(id) {
      timers.delete(id)
    },
    wake() {
      wakes += 1
    },
  })
  /** Move the clock, running every timer that falls due on the way. */
  const advance = (ms: number) => {
    const target = at + ms
    for (;;) {
      const due = [...timers.entries()].filter(([, timer]) => timer.due <= target).sort((left, right) => left[1].due - right[1].due)[0]
      if (due === undefined) break
      timers.delete(due[0])
      at = due[1].due
      due[1].run()
    }
    at = target
  }
  return { throttle, advance, wakes: () => wakes, pending: () => timers.size }
}

test('the first signal asks at once', () => {
  const { throttle, wakes } = stand(400)
  throttle.soon()
  expect(wakes()).toBe(1)
})

test('a signal inside the window holds one timer and asks when it ends', () => {
  const { throttle, advance, wakes, pending } = stand(400)
  throttle.soon()
  advance(100)
  throttle.soon()
  throttle.soon()
  expect(wakes()).toBe(1)
  expect(pending()).toBe(1)
  advance(300)
  expect(wakes()).toBe(2)
  expect(pending()).toBe(0)
})

test('a signal after the window asks again at once', () => {
  const { throttle, advance, wakes } = stand(400)
  throttle.soon()
  advance(500)
  throttle.soon()
  expect(wakes()).toBe(2)
})

test('stopping drops the timer still waiting and the window it held', () => {
  const { throttle, advance, wakes, pending } = stand(400)
  throttle.soon()
  advance(100)
  throttle.soon()
  throttle.stop()
  expect(pending()).toBe(0)
  advance(1000)
  expect(wakes()).toBe(1)
  throttle.soon()
  expect(wakes()).toBe(2)
})
