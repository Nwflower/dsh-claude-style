/** When the rail offers the compact control, and what one press sends (D100).
 *
 * The host states where automatic compaction fires; the rail offers the manual
 * request while the session stands close to that point, and hides it again once a
 * compaction (manual or automatic) has moved the session away. The offer is decided
 * here, apart from the section that draws it, so a spec can pin the distance.
 */
import { SESSION_COMPACT_PATH } from '@dsh-claude-style/contracts/routes'
import type { PanelCompactAnswer } from '@dsh-claude-style/contracts/compaction'
import type { PanelContext } from '@dsh-claude-style/contracts/session-panel'
import type { ContextOverview } from './context-rows'

/**
 * The share of the window, left before the threshold, at which the control appears:
 * a fifth of the window. A session past the threshold keeps the control — the host
 * compacts on its own at the next step boundary, and a reader may want it now.
 */
export const COMPACT_OFFER_SHARE = 0.2

/** What the rail offers: how far the session stands from automatic compaction. */
export interface CompactOffer {
  /** Tokens left before automatic compaction runs; negative once the session passed it. */
  remaining: number
  /** The threshold the distance is measured to. */
  threshold: number
}

/**
 * Whether the context section offers the manual compact request.
 *
 * @param context - the host's context reading, or null before it answers.
 * @param overview - the occupancy the section states.
 * @returns the offer, or null while the host states no threshold or the session
 *   still stands further from it than {@link COMPACT_OFFER_SHARE} of the window.
 */
export function compactOffer(context: PanelContext | null, overview: ContextOverview): CompactOffer | null {
  const threshold = context?.compaction?.thresholdTokens
  if (threshold === undefined || !(threshold > 0)) return null
  const remaining = threshold - overview.used
  return remaining > overview.window * COMPACT_OFFER_SHARE ? null : { remaining, threshold }
}

/**
 * Ask the host to compact one session's history.
 *
 * @param sessionId - the session the rail shows.
 * @returns the host's answer: what the summary replaced, or the class of failure.
 */
export async function requestCompaction(sessionId: string): Promise<PanelCompactAnswer> {
  const response = await fetch(`${SESSION_COMPACT_PATH}?id=${encodeURIComponent(sessionId)}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`compact route answered ${response.status}`)
  return await response.json() as PanelCompactAnswer
}
