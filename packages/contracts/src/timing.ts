/**
 * Host callback ordering the skin depends on (D3), with the check guarding each assumption.
 * Every entry must name an end-to-end scenario or spec (D87).
 */

/** The end-to-end lane's scenarios; the lane checks its own names against these. */
export const E2E_SCENARIOS = ['conversation', 'systemTypography', 'messageActions', 'messageAnswerActions', 'mobileHome', 'composerViewport', 'narrow', 'tool', 'fileMerge', 'send', 'sendFull', 'scroll', 'readerScroll', 'doorPin', 'streamPace', 'streamJitter', 'streamJitterFooter', 'streamJitterInline', 'motion', 'processSummary', 'reasoningStream', 'reasoningContinuous', 'waitLine', 'washLine', 'longSession', 'statsPosition', 'statsOverlay', 'statsFooter', 'sidebarRail', 'sidebarPeek', 'rightbar', 'contract', 'importance', 'remoteSettings', 'customBrand', 'dsBot', 'shots'] as const

/** One timing assumption, and how it is held. */
interface HostTimingEntry {
  /** Stable id; a check names it when it fails. */
  id: string
  /** The order the host works in, as the skin depends on it. */
  assumption: string
  /** What the skin does with that order, and what breaks without it. */
  use: string
  /** Where it is held: `scenario:<name>` of the lane, or `spec:<id>` of a spec (D87). */
  checks: string[]
}

export const HOST_TIMING: HostTimingEntry[] = [
  {
    id: 'host.column-observer',
    assumption: 'The host creates its own ResizeObserver when it mounts a message column and writes the scroll position to the bottom inside that callback.',
    use: 'The skin\u2019s afterHost subscription is made later, so it runs after the host\u2019s in the same frame and can take the pin back before the frame paints (D74, D40).',
    checks: ['scenario:scroll', 'scenario:streamJitter', 'spec:mechanism/page-observation/an afterHost subscription runs after a resize observer made before it'],
  },
  {
    id: 'host.follow-mark',
    assumption: 'The host marks the scroller while its own follow is on and drops the mark when the reader scrolls away, with a 25px threshold for "at the tail".',
    use: 'The scroll owner reads the mark to know whose turn it is and hands the follow back through it; the threshold is copied into the DOM contract, and the status line\u2019s pin reads the same mark as \u201cthe tail is being followed\u201d.',
    checks: ['scenario:scroll', 'scenario:readerScroll'],
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
    use: 'The send flight hides the real row while its stand-in flies and hands the reader\u2019s words over without a blank frame (D74).',
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
    id: 'host.rightbar-toggle',
    assumption: 'The host mounts the right panel’s own collapse control only while that panel is expanded, inside a chrome strip under a transformed, clipped subtree.',
    use: 'The skin’s control stands in the header’s row and presses the host’s one, which cannot be placed there: a fixed box inside that subtree is measured from the panel and cut at its edge (features/header-band).',
    checks: ['scenario:rightbar'],
  },
  {
    id: 'host.composer-place',
    assumption: 'The composer seat is the conversation scroller\u2019s own sibling rather than a row inside the message column, so growing the column moves the transcript under the composer and never the composer itself.',
    use: 'The stream slide puts the column back down with a transform on the column alone (D85); the lane holds the composer\u2019s box still through a fast answer on the strength of that shape.',
    checks: ['scenario:streamPace', 'scenario:streamJitter', 'scenario:streamJitterFooter', 'scenario:streamJitterInline'],
  },
]
