/**
 * The host's timing as one table (D44): the orders the skin depends on, what
 * breaks when one stops holding, and the check that holds each of them.
 *
 * The DOM contract (dom.ts, table.ts) says what the host's marks mean; this file
 * says *when* they happen — inside which callback, in which order relative to
 * the skin's own work. These are the assumptions a host upgrade breaks silently:
 * a selector that still matches but fires a frame later leaves the reader with a
 * jitter no smoke case notices.
 *
 * The checks are named rather than described: a scenario of the end-to-end lane
 * (packages/testing/e2e.cjs) or a unit test beside its module. The build refuses an entry
 * that names neither, and the lane refuses a scenario name outside
 * E2E_SCENARIOS, so an assumption cannot enter this table without something that
 * would notice it changing.
 */

/** The end-to-end lane's scenarios; the lane checks its own names against these. */
export const E2E_SCENARIOS = ['conversation', 'narrow', 'tool', 'reader', 'stepDisplay', 'send', 'scroll', 'contract', 'importance', 'shots'] as const

/** One timing assumption, and how it is held. */
interface HostTimingEntry {
  /** Stable id; a check names it when it fails. */
  id: string
  /** The order the host works in, as the skin depends on it. */
  assumption: string
  /** What the skin does with that order, and what breaks without it. */
  use: string
  /** Where it is held: `scenario:<name>` of the lane, or a `*.test.ts` path. */
  checks: string[]
}

export const HOST_TIMING: HostTimingEntry[] = [
  {
    id: 'host.column-observer',
    assumption: 'The host creates its own ResizeObserver when it mounts a message column and writes the scroll position to the bottom inside that callback.',
    use: 'The skin\u2019s afterHost subscription is made later, so it runs after the host\u2019s in the same frame and can take the pin back before the frame paints (D32, D40, D41).',
    checks: ['scenario:scroll'],
  },
  {
    id: 'host.follow-mark',
    assumption: 'The host marks the scroller while its own follow is on and drops the mark when the reader scrolls away, with a 25px threshold for "at the tail".',
    use: 'The scroll owner reads the mark to know whose turn it is and hands the follow back through it; the threshold is copied into the DOM contract.',
    checks: ['scenario:scroll'],
  },
  {
    id: 'host.streaming-marks',
    assumption: 'The markdown layer marks its container while an assistant answer streams and clears the mark when the turn settles.',
    use: 'The reveal keys its fade on the mark, and the lane reads it as the streaming state of the contract test.',
    checks: ['scenario:contract'],
  },
  {
    id: 'host.submission-echo',
    assumption: 'A submission mounts an optimistic row immediately and replaces it with the settled row: the echo is on the page for a few frames, not for the length of the turn.',
    use: 'The send flight hides the real row while its stand-in flies and hands the reader\u2019s words over without a blank frame (D32).',
    checks: ['scenario:send', 'scenario:contract'],
  },
  {
    id: 'host.think-phase',
    assumption: 'A thinking row carries `data-state="running"` while the model is thinking, and another value once that piece of work has settled.',
    use: 'The fold and the reveal read the phase to know whether the row is still moving.',
    checks: ['scenario:contract'],
  },
  {
    id: 'host.rail-window',
    assumption: 'The turn rail renders only the marks near its scroll position, and its scroller\u2019s content is `count \u00d7 pitch + 2 \u00d7 (inset \u2212 pitch / 2)` pixels tall.',
    use: 'The skin\u2019s navigator replaces the rail in place and matches its pitch; the geometry is the one number the DOM contract borrows from the host.',
    checks: ['scenario:contract'],
  },
  {
    id: 'host.work-details',
    assumption: 'The settings service answers `describe()` with an `{ ok, value: { namespaces } }` payload, the `ui-chat` namespace carries `transcriptView` once the reader picked a mode, and a write bumps that namespace\u2019s revision.',
    use: 'The reading view shapes a turn\u2019s process by that value and re-reads it when a turn opens; the lane puts the host in each mode through the same service (D57).',
    checks: ['scenario:stepDisplay', 'test:packages/client/src/core/step-display.test.ts'],
  },
]
