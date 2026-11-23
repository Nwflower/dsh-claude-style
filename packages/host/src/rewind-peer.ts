/**
 * Whether dsh-rewind runs in this host right now (D111). While it does, the turn
 * checkpoints are its own: a second recorder would double the wait before every
 * tool call and store every change twice.
 *
 * The answer is read from the host loader each time it is asked, never cached:
 * the reader can enable, disable or remove that plugin at any moment, and the
 * question is asked once per turn, with or without a page open.
 */
import { REWIND_PEER_PACKAGE } from '@dsh-claude-style/contracts/session-rewind'
import type { DshContext } from '@dsh-claude-style/engine/node/dsh'

/** cordis's `FiberState.ACTIVE`: the plugin's callback returned and its effects run. */
const FIBER_ACTIVE = 2

/** One loader entry, in the members this check reads: the module it names and the fiber it started. */
interface LoaderEntry {
  options?: { name?: unknown }
  fiber?: { state?: unknown }
}

/** The host loader, in the member this check reads: every entry of its tree and the nested trees. */
interface EntryLoader {
  entries?(): Iterable<LoaderEntry>
}

/**
 * Whether a loader entry naming dsh-rewind's package has an active fiber. An
 * entry another plugin's bundle inserted counts the same as a direct one: the
 * engine records either way.
 */
export function rewindPeerActive(ctx: DshContext): boolean {
  const loader = ctx.get('loader') as EntryLoader | null | undefined
  // A host that loads no plugin through a loader cannot be running dsh-rewind as an entry.
  if (loader === null || loader === undefined) return false
  if (typeof loader.entries !== 'function') throw new Error('session rewind: the host loader lists no entries')
  for (const entry of loader.entries()) {
    if (entry.options?.name === REWIND_PEER_PACKAGE && entry.fiber?.state === FIBER_ACTIVE) return true
  }
  return false
}
