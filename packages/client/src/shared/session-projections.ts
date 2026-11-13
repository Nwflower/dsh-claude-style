import { hostSessions } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { Currency } from '@dsh-claude-style/contracts/prices'
import type { HostSnapshotSource, HostSessionStatsProjection, HostTokenUsageProjection } from '@dsh-claude-style/contracts/services'

/**
 * The host's key-addressed read faces for one session (D40): each answers the
 * projection's current value and subscribes to its frames.
 *
 * Two surfaces follow one session's figures — the composer's readout and the
 * details rail — so the lookup stands here and both read it. Null while the host
 * serves no projection seat for that session, which is how a host that names no
 * projections answers at all.
 * @param ctx - the page's host context, or null before the install hands it over.
 * @param sessionId - the session whose projections are wanted.
 * @param keys - the projection keys to read.
 */
export function sessionProjectionFaces(ctx: HostContext | null, sessionId: string, keys: readonly string[]) {
  if (ctx === null || sessionId === '') return null
  const sessions = hostSessions(ctx)
  const binding = typeof sessions?.binding === 'function' ? sessions.binding(sessionId) : undefined
  const projections = binding?.session?.projections
  if (typeof projections?.faceOf !== 'function') return null
  const faces: Record<string, HostSnapshotSource<unknown>> = {}
  for (let i = 0; i < keys.length; i++) faces[keys[i]] = projections.faceOf(keys[i])
  return faces
}

/**
 * One session's figures as both faces of them print it (D94): the composer's
 * line below the input and the rail's two tables are read from this one entry,
 * so the page shows one set of numbers and not two that disagree.
 *
 * The host settles its projections a step at a time (`tokenUsage` moves on
 * `assistant/message`), so a settled total stands still through a whole answer.
 * The statistics feature adds the text streaming on the page to that total
 * (features/context-stats/stream-estimate.ts) and publishes the sum here, which
 * is what lets either face move while the answer is still arriving.
 */
export interface SessionFigures {
  /** The session these figures belong to; a face never shows another session's numbers. */
  sessionId: string
  stats: HostSessionStatsProjection | null
  usage: HostTokenUsageProjection | null
  /** Micro units of `currency`, or null while no figure is known. */
  cost: number | null
  /** The currency the cost was priced in, or null while billing is off. */
  currency: Currency | null
}
