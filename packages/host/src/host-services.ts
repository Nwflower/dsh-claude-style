/**
 * The host services the plugin's routes read, declared once (D73).
 *
 * The host ships no type package for its own services, so each shape here is
 * the part this plugin actually reads. A member the host may leave out is
 * optional and its reader checks for it; a required member is one every reader
 * calls, and a route that reaches the host untyped still checks it at runtime.
 * The type says what a present member answers, not that a host must mount it.
 */

/** One session the host holds open, as the deletion route and the rewind recorder read it. */
export interface HostLiveSession<Event = unknown> {
  id: string
  /** The session header: its working directory and what started it. */
  header?: {
    cwd?: unknown
    origin?: unknown
  }
  /** The seq the live log has reached. */
  seq?: number
  /** The live log events from `fromSeq` up to `toSeqExclusive`; absent where the host publishes no tail read. */
  snapshotEvents?(fromSeq?: number, toSeqExclusive?: number): readonly Event[]
}

/** A listing entry that names its session rather than being one; some server generations list these. */
export interface HostSessionEntry {
  id?: unknown
  sessionId?: unknown
}

/**
 * The `sessions` service: the sessions the host holds open.
 *
 * `Entry` is what this reader's `list()` answers. The deletion route accepts an
 * id, an entry object or a session, while the search fold reads sessions with
 * their live event feed; the service itself is the same one.
 */
export interface HostSessionsService<Entry = HostLiveSession | string | HostSessionEntry> {
  /** One open session by id; a host generation without a lookup omits it. */
  get?(id: string): HostLiveSession | null | undefined
  /**
   * The open sessions. Every reader of this shape enumerates them; the deletion
   * route still checks that the member is callable at runtime, because the host
   * ships no type that could enforce it.
   */
  list(): readonly Entry[]
}

/** One stored session as the persistence service's listing reports it. */
export interface HostStoredSession {
  /** The stored header; a record still being written has none. */
  header?: {
    id?: unknown
    origin?: unknown
  }
  /** Changes whenever the stored log does. */
  revision?: string | number
}

/**
 * The `sessionPersistence` service: the stored sessions.
 *
 * `Snapshot` is the record this reader's `list()` answers: the search fold
 * relies on a complete header and revision, while the rewind store accepts a
 * record whose header it may not read.
 */
export interface HostSessionPersistence<Snapshot = HostStoredSession> {
  list(): Promise<readonly Snapshot[]>
}

/** The `workspaceRegistry` service: the archive and pin sets of the host's workspace domain. */
export interface HostWorkspaceRegistry {
  archivedSessionIds?: readonly string[]
  pinnedSessionIds?: readonly string[]
  archiveSession?(sessionId: string, options?: { stopActivity?: boolean }): Promise<void>
  unarchiveSession?(sessionId: string): Promise<void>
  pinSession?(sessionId: string): Promise<void>
}
