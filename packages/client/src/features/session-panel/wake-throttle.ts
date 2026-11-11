/**
 * One ask per window, while something else keeps signalling (D94).
 *
 * The rail refreshes on the host's own figure frames, and a streaming turn lands
 * one every few hundred milliseconds; the window keeps those signals from
 * becoming one answer each. A signal inside the window is not dropped: it holds
 * one timer for the rest of it, and that timer asks once when the window ends.
 * The clock, the timers and the ask are handed in, so a spec can drive it.
 */
export interface WakeThrottleDeps {
  /** Milliseconds between two asks at the closest. */
  minMs: number
  /** The current time, in milliseconds. */
  now(): number
  setTimeout(run: () => void, ms: number): number
  clearTimeout(id: number): void
  /** Ask again. */
  wake(): void
}

export interface WakeThrottle {
  /** A signal arrived: ask now, or once the window is over. */
  soon(): void
  /** Drop the timer still waiting; no ask follows it. */
  stop(): void
}

/**
 * Create the gate.
 * @param deps - the window, the clock, the timers and the ask.
 */
export function createWakeThrottle(deps: WakeThrottleDeps): WakeThrottle {
  let last = Number.NEGATIVE_INFINITY
  let timer: number | null = null

  return {
    soon() {
      const at = deps.now()
      const left = deps.minMs - (at - last)
      if (left <= 0) {
        last = at
        deps.wake()
        return
      }
      if (timer !== null) return
      timer = deps.setTimeout(() => {
        timer = null
        last = deps.now()
        deps.wake()
      }, left)
    },
    stop() {
      if (timer !== null) deps.clearTimeout(timer)
      timer = null
      last = Number.NEGATIVE_INFINITY
    },
  }
}
