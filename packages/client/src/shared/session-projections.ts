import { hostSessions } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostSnapshotSource } from '@dsh-claude-style/contracts/services'

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
