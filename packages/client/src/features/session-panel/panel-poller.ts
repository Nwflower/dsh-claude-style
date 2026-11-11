/**
 * The rail's poll loop, kept apart from React so its ordering can be tested
 * (D94). One ask is in flight at a time; a newer ask supersedes the one in
 * flight, and only that newer ask may deliver its answer, clear the controller
 * or schedule the next poll. A superseded ask stops at every step, so an older
 * answer cannot overwrite a newer one and a visibility flip that wakes the loop
 * cannot leave two timers behind. A hidden page keeps the loop, asking again
 * once the page is visible.
 */
import type { SessionPanelAnswer } from '@dsh-claude-style/contracts/session-panel'

/** The outside world one poll loop reads and writes, so a spec can stand in for it. */
export interface PanelPollerDeps {
  /** The address to ask; read per ask, since the reader's price table travels with it. */
  url(): string
  fetch(url: string, signal: AbortSignal): Promise<PanelCommonAnswer>
  /** Whether the page is hidden right now. */
  hidden(): boolean
  setTimeout(run: () => void, ms: number): number
  clearTimeout(id: number): void
  /** One ask's answer, or a failure with no answer. Called only for the ask in flight. */
  answer(answer: PanelCommonAnswer | null, failed: boolean): void
  /** The pause between asks. */
  pollMs: number
}

/** The answer shape the loop passes through; the route's own answer. */
type PanelCommonAnswer = SessionPanelAnswer

/** One poll loop; `wake` asks again now, `stop` ends it for good. */
export interface PanelPoller {
  start(): void
  wake(): void
  stop(): void
}

/**
 * Create the loop for one session.
 * @param deps - the page's own fetch, timers, visibility and answer sink.
 */
export function createPanelPoller(deps: PanelPollerDeps): PanelPoller {
  let stopped = false
  let timer: number | null = null
  let controller: AbortController | null = null
  /** Bumped per ask; a superseded ask's handlers and cleanup see a different number and stop. */
  let generation = 0

  const schedule = () => {
    if (stopped) return
    if (timer !== null) deps.clearTimeout(timer)
    timer = deps.setTimeout(load, deps.pollMs)
  }

  const load = () => {
    timer = null
    if (stopped) return
    if (deps.hidden()) {
      schedule()
      return
    }
    const mine = ++generation
    controller?.abort()
    const active = new AbortController()
    controller = active
    deps.fetch(deps.url(), active.signal)
      .then((answer) => {
        if (stopped || mine !== generation) return
        deps.answer(answer, false)
      }, (error: unknown) => {
        if (stopped || mine !== generation) return
        // An abort is this loop's own supersession, not the host failing.
        if ((error as { name?: string } | null)?.name === 'AbortError') return
        deps.answer(null, true)
      })
      .finally(() => {
        // Only the ask still in flight may clear the controller and schedule;
        // a superseded one must not touch the newer ask's state or timer.
        if (stopped || mine !== generation) return
        controller = null
        schedule()
      })
  }

  return {
    start: load,
    wake() {
      if (stopped) return
      if (deps.hidden()) return
      if (timer !== null) {
        deps.clearTimeout(timer)
        timer = null
      }
      load()
    },
    stop() {
      stopped = true
      generation += 1
      if (timer !== null) deps.clearTimeout(timer)
      timer = null
      controller?.abort()
      controller = null
    },
  }
}
