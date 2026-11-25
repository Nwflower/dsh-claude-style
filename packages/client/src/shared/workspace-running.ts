import { hostSessionStatus, hostSessions, hostSlots, hostSnapshot, hostWorkspaceView, hostWorkspaces } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostSessionListSnapshot, HostSessionStatusSnapshot, HostSlotsService, HostSnapshotSource, HostWorkspaceListSnapshot, HostWorkspaceViewSnapshot, HostWorkspaceViewStore } from '@dsh-claude-style/contracts/services'

/**
 * The host lists the workspace group mark and the active-first order read,
 * followed once and cached here instead of being re-read by every pass.
 *
 * A pass is queued after each DOM batch, while these sources move on their own:
 * a session starting or stopping under a closed workspace changes no page node,
 * and the host's view menu writes its grouping straight into the store. Each
 * source is therefore subscribed once per reader, compared by object identity,
 * because the host replaces a service rather than mutating it, and a reading is
 * rebuilt only when one of those subscriptions reports a change. A source the
 * host cannot announce changes through (no `subscribe`, or one that throws on the
 * way out) is polled on every pass, which is what the features did before this
 * reader owned the read.
 *
 * The workspace browser's store is not a service: `hostWorkspaceView` asks the
 * slot registry for it, and the browser's own `create` answers the rendered
 * instance. That walk is paid once here, not on every pass: the store is kept
 * until the registry says the `sidebar.workspaces` registrations changed, and a
 * registry that cannot announce changes costs the one walk that finds the store.
 * The slot key is read only to hear that announcement; the store itself still
 * comes from the accessor (D3, D75).
 *
 * One reader belongs to the generation that created it (docs/ARCHITECTURE.md,
 * the object lifetime section): the feature that owns it drops every table in
 * `dispose`, so no reading outlives a reload. Its keys are host source objects,
 * never page nodes.
 */

/** The slot whose registration hands out the view store; the accessor reads the same key (`packages/engine/src/host.ts`). */
const WORKSPACE_VIEW_SLOT = 'sidebar.workspaces'

/** An empty answer shared by readings that carry no running session. */
const NO_IDS: ReadonlySet<string> = new Set()

/** The workspace and session lists, the live status table and the view store, as one reading. */
export interface WorkspaceRunningReading {
  /** The workspace list; null while the host serves none. */
  readonly workspaces: HostWorkspaceListSnapshot | null
  /** Whether both lists have answered (the group mark draws nothing from a guess). */
  readonly answered: boolean
  /** The sessions running now, subagent sessions and list rows without a summary left out. */
  readonly running: ReadonlySet<string>
  /** The pinned sessions under their `session:` row keys, archived ones removed; null until the list answers. */
  readonly pinnedKeys: ReadonlySet<string> | null
  /** The host's view store; null until the browser's registration is on the page. */
  readonly view: HostWorkspaceViewStore | null
  /** The store's grouping and ordering; null with the store. */
  readonly viewSnapshot: HostWorkspaceViewSnapshot | null
  /** Whether the list groups as a workspace tree, which the mark walks upward. */
  readonly nested: boolean
}

/** The reader one generation holds; `dispose` gives back every subscription it took. */
export interface WorkspaceRunningReader {
  /**
   * The current reading. Source identities are re-resolved on every call, since
   * the host mounts its services late and replaces them; snapshots are re-read
   * only when their source published, and the same object answers while nothing
   * moved (the caller can key derived work on it).
   */
  read(): WorkspaceRunningReading
  dispose(): void
}

/** One followed list: the source it was bound to, the subscription it answered, and the snapshot read from it. */
interface ListSlot<Snapshot> {
  source: HostSnapshotSource<Snapshot> | null
  /** The unsubscribe the source answered; null while it announces nothing (a torn-down or silent source). */
  stop: (() => void) | null
  /** Whether the held snapshot is older than the source. */
  dirty: boolean
  snapshot: Snapshot | null
}

function listSlot<Snapshot>(): ListSlot<Snapshot> {
  return { source: null, stop: null, dirty: false, snapshot: null }
}

/**
 * Subscribe to one source. A source the host already tore down can still be
 * handed out and throw here; the reader then polls that source on every pass,
 * which is the read the features made before it was cached (D12).
 */
function listen(source: HostSnapshotSource<unknown>, onChange: () => void): (() => void) | null {
  if (typeof source.subscribe !== 'function') return null
  try {
    return source.subscribe(onChange)
  } catch {
    // The source still holds its last snapshot; polling it keeps the features
    // reading that value, and losing the subscription costs no answer (D12).
    return null
  }
}

/** The sessions running now, read off the live status table with the list's own summary behind it. */
function runningIds(sessions: HostSessionListSnapshot, status: HostSessionStatusSnapshot | null): ReadonlySet<string> {
  const running = new Set<string>()
  // A list without ids cannot name a runner; it reads as nobody running rather
  // than failing the pass, which is the answer the mark drew from it before.
  if (!Array.isArray(sessions.ids)) return running
  for (const id of sessions.ids) {
    const summary = sessions.byId?.[id]
    if (summary === undefined || summary === null || summary.origin === 'subagent') continue
    const live = typeof status?.get === 'function' ? status.get(id)?.running : undefined
    if ((live ?? summary.running) === true) running.add(id)
  }
  return running
}

/** The pinned sessions as row keys, archived ones left out; null while the list cannot say. */
function pinnedKeys(workspaces: HostWorkspaceListSnapshot | null): ReadonlySet<string> | null {
  if (workspaces === null || workspaces.phase === 'pending') return null
  if (!Array.isArray(workspaces.pinnedSessionIds) || !Array.isArray(workspaces.archivedSessionIds)) return null
  const archived = new Set(workspaces.archivedSessionIds)
  const keys = new Set<string>()
  for (const id of workspaces.pinnedSessionIds) if (!archived.has(id)) keys.add('session:' + id)
  return keys
}

function createReading(
  workspaces: HostWorkspaceListSnapshot | null,
  sessions: HostSessionListSnapshot | null,
  status: HostSessionStatusSnapshot | null,
  view: HostWorkspaceViewStore | null,
  viewSnapshot: HostWorkspaceViewSnapshot | null,
): WorkspaceRunningReading {
  // A list that has not answered says nothing about who runs; the mark and the
  // order features both stay off it rather than reading empty as a fact.
  const listReady = workspaces !== null && workspaces.phase !== 'pending' && Array.isArray(workspaces.items)
  return {
    workspaces,
    answered: listReady && sessions !== null,
    running: listReady && sessions !== null ? runningIds(sessions, status) : NO_IDS,
    pinnedKeys: pinnedKeys(workspaces),
    view,
    viewSnapshot,
    nested: viewSnapshot !== null && viewSnapshot.groupBy === 'workspace-tree',
  }
}

/**
 * Follow the four sources of one generation: the workspace list, the session
 * list, the live status table and the workspace browser's view store.
 *
 * @param ctx - the host context the sources are read from.
 * @param schedule - asks for the pass that turns a moved source into what the page shows.
 */
export function createWorkspaceRunning(ctx: HostContext, schedule: () => void): WorkspaceRunningReader {
  const statusSlot = listSlot<HostSessionStatusSnapshot>()
  const sessionsSlot = listSlot<HostSessionListSnapshot>()
  const workspacesSlot = listSlot<HostWorkspaceListSnapshot>()

  /** The store the accessor last answered, and the snapshot read from it. */
  let viewStore: HostWorkspaceViewStore | null = null
  let viewSnapshot: HostWorkspaceViewSnapshot | null = null
  /** The store's own change subscription; null while the store announces nothing. */
  let viewStop: (() => void) | null = null
  let viewDirty = true
  /** The registry the registration watch was taken from; a replaced service is a new watch. */
  let watchedSlots: HostSlotsService | null = null
  let stopRegistrations: (() => void) | null = null
  /** Whether the store was asked for since the last registration change; a watched registry announces the next one. */
  let viewResolved = false
  /** The reading the last pass built; a new object marks a source event for its consumers. */
  let reading: WorkspaceRunningReading | null = null

  /** Bind one list source; a replaced object is a new subscription, and its old snapshot is dropped. */
  function bind<Snapshot>(target: ListSlot<Snapshot>, next: HostSnapshotSource<Snapshot> | null): void {
    if (target.source === next) return
    target.stop?.()
    target.stop = null
    target.source = next
    target.snapshot = null
    target.dirty = true
    if (next !== null) target.stop = listen(next, () => { target.dirty = true; schedule() })
  }

  /** Read one slot when it moved or has to be polled; a throwing source keeps its dirty mark for the next pass. */
  function pull<Snapshot>(target: ListSlot<Snapshot>): Snapshot | null {
    const polled = target.source !== null && target.stop === null
    if (!target.dirty && !polled) return target.snapshot
    try {
      const snapshot = hostSnapshot(target.source)
      target.snapshot = snapshot
      target.dirty = false
      return snapshot
    } catch {
      // A source whose snapshot throws (a host that lost the service, or the
      // stand-in's fault case) must not take the other sources' readers down
      // with it: the slot answers null, the reading draws no running set from
      // it, and the next pass asks again (D12's isolation).
      target.snapshot = null
      return null
    }
  }

  /** Stop one list subscription and forget what it held. */
  function release<Snapshot>(target: ListSlot<Snapshot>): void {
    target.stop?.()
    target.stop = null
    target.source = null
    target.snapshot = null
    target.dirty = false
  }

  /** Take the store's own publication, or fall back to polling it. */
  function watchView(store: HostWorkspaceViewStore): (() => void) | null {
    if (typeof store.subscribe !== 'function') return null
    try {
      return store.subscribe(() => { viewDirty = true; schedule() })
    } catch {
      // A store the host tore down can still hand out its subscription and
      // throw; the store is then polled each pass, the read the features made
      // before it was cached (D12).
      return null
    }
  }

  /** Hold one store; a replaced object drops the old subscription and snapshot. */
  function attachView(next: HostWorkspaceViewStore | null): void {
    if (next === viewStore) return
    viewStop?.()
    viewStop = null
    viewStore = next
    viewSnapshot = null
    viewDirty = true
    if (next !== null) viewStop = watchView(next)
  }

  /** Give the held store and its subscription back; the next pass resolves it again, once. */
  function forgetView(): void {
    viewStop?.()
    viewStop = null
    viewStore = null
    viewSnapshot = null
    viewDirty = true
    viewResolved = false
  }

  /** The registry replaced the registration: the next pass resolves the store again. */
  function dropView(): void {
    forgetView()
    schedule()
  }

  function watchRegistrations(slots: HostSlotsService | null): (() => void) | null {
    if (typeof slots?.subscribe !== 'function') return null
    try {
      return slots.subscribe(WORKSPACE_VIEW_SLOT, dropView)
    } catch {
      // A registry the host tore down can still hand out its subscription and
      // throw; the store is then resolved on every pass instead of once per
      // registration, which still reads the store the page shows (D12).
      return null
    }
  }

  /** Keep the registration watch on the current registry; a replaced registry is a new watch. */
  function followRegistrations(): void {
    const slots = hostSlots(ctx)
    if (slots === watchedSlots) return
    stopRegistrations?.()
    watchedSlots = slots
    // A replaced registry cannot be trusted to hold the store the old one did;
    // and a registration that stood before this watch was taken is not replayed,
    // so the next pass asks the accessor once more.
    forgetView()
    stopRegistrations = watchRegistrations(slots)
  }

  /**
   * The store, resolved once and then kept: a watched registry announces its
   * next registration, and one that cannot announce is kept at the store its
   * first answer found (the read workspace-view.ts makes for the same store).
   * While nothing has answered yet, the accessor is asked again each pass, so a
   * registration that stood before the watch was taken is not missed.
   */
  function resolveView(): void {
    followRegistrations()
    if (viewStore !== null) return
    // A watched registry announces the next registration, so an absent store is
    // not asked for again until it does.
    if (viewResolved && stopRegistrations !== null) return
    attachView(hostWorkspaceView(ctx))
    viewResolved = true
  }

  /** The store's current answer; polled while no subscription hears it move. */
  function currentViewSnapshot(): HostWorkspaceViewSnapshot | null {
    if (viewStore === null) {
      // Nothing to read; a store appearing arrives through attachView, never through a stale dirty flag.
      viewDirty = false
      return null
    }
    if (viewStop === null) return viewStore.getSnapshot()
    if (viewDirty) {
      viewSnapshot = viewStore.getSnapshot()
      viewDirty = false
    }
    return viewSnapshot
  }

  function read(): WorkspaceRunningReading {
    bind(statusSlot, hostSessionStatus(ctx))
    bind(sessionsSlot, hostSessions(ctx)?.list ?? null)
    bind(workspacesSlot, hostWorkspaces(ctx)?.list ?? null)
    resolveView()
    const polling = (statusSlot.source !== null && statusSlot.stop === null)
      || (sessionsSlot.source !== null && sessionsSlot.stop === null)
      || (workspacesSlot.source !== null && workspacesSlot.stop === null)
      || (viewStore !== null && viewStop === null)
    if (reading !== null && !polling && !viewDirty && !statusSlot.dirty && !sessionsSlot.dirty && !workspacesSlot.dirty) return reading
    const status = pull(statusSlot)
    const sessions = pull(sessionsSlot)
    const workspaces = pull(workspacesSlot)
    const view = currentViewSnapshot()
    reading = createReading(workspaces, sessions, status, viewStore, view)
    return reading
  }

  function dispose(): void {
    release(statusSlot)
    release(sessionsSlot)
    release(workspacesSlot)
    stopRegistrations?.()
    stopRegistrations = null
    watchedSlots = null
    forgetView()
    reading = null
  }

  return { read, dispose }
}
