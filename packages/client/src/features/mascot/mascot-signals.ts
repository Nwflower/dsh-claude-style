import { findChatTarget, readTurnActivity } from '../../core/host'
import type { HostContext } from '../../core/host'
import type { HostChatSnapshot, HostChatTarget, HostFeedEntry, HostSessionEvent, HostSessionListSnapshot, HostSessionStatusSnapshot, HostSnapshotSource, HostSubagentEntry } from '@dsh-claude-style/contracts/services'

/** A state the mascot shows: its name, the animation that plays it, and how much it outranks. */
export interface MascotLevel {
  state: string
  animation: string
  priority: number
}

/** A one-off moment that ends a piece of work. */
export type MascotMoment = 'error' | 'attention'

/** What the open turn is doing (turnPhase): reasoning or not answering yet, or writing and running tools. */
export type MascotTurnPhase = 'thinking' | 'working'

/** Everything a level is read from (mascotLevel). */
export interface MascotReading {
  /** The session on its conversation page, or null for the whole workspace on the home page. */
  sessionId: string | null
  status: HostSessionStatusSnapshot | null
  list: HostSessionListSnapshot | null
  /** A compaction of the followed session runs. */
  compacting: boolean
  /** The followed session's open turn; null when none is open or nothing is followed. */
  phase: MascotTurnPhase | null
}

const IDLE: MascotLevel = { state: 'idle', animation: 'idle', priority: 1 }
const THINKING: MascotLevel = { state: 'thinking', animation: 'thinking', priority: 2 }
const NOTIFICATION: MascotLevel = { state: 'notification', animation: 'notification', priority: 7 }
const SWEEPING: MascotLevel = { state: 'sweeping', animation: 'compacting', priority: 6 }

/** The host's own reading of "running": the live status first, the list's summary behind it. */
function isRunning(id: string, status: HostSessionStatusSnapshot | null, list: HostSessionListSnapshot | null) {
  const live = status === null ? undefined : status.get(id)?.running
  return (live ?? list?.byId[id]?.running) === true
}

/** Top-level sessions running right now, across the workspace. */
function busySessions(status: HostSessionStatusSnapshot | null, list: HostSessionListSnapshot | null) {
  if (list === null) return 0
  let busy = 0
  for (let i = 0; i < list.ids.length; i++) {
    const id = list.ids[i]
    if (list.byId[id]?.origin !== 'subagent' && isRunning(id, status, list)) busy++
  }
  return busy
}

/** The subagents a session started, as the host's session list catalogues them. */
function subagentsOf(id: string, list: HostSessionListSnapshot | null): HostSubagentEntry[] {
  const catalog = list?.projectionsBySession[id]?.values?.subagentCatalog
  return Array.isArray(catalog) ? catalog as HostSubagentEntry[] : []
}

/** One working animation per crowd size, as Clawd's working tiers pick them. */
function working(busy: number): MascotLevel {
  return { state: 'working', animation: busy >= 3 ? 'building' : busy === 2 ? 'music' : 'typing', priority: 3 }
}

/**
 * The state to show: for one session on its conversation page, or for the
 * whole workspace on the home page. The reader is asked first (an interaction
 * the session, or one of its subagents, waits on), then a compaction, the
 * subagents at work, the turn's own phase and last whether the session runs.
 */
export function mascotLevel(reading: MascotReading): MascotLevel {
  const { sessionId, status, list } = reading
  const busy = busySessions(status, list)
  if (sessionId === null) {
    if (status !== null) {
      for (const entry of status.values()) {
        if (entry.pendingInteraction !== undefined) return NOTIFICATION
      }
    }
    return busy > 0 ? working(busy) : IDLE
  }
  const subagents = subagentsOf(sessionId, list)
  if (status !== null) {
    if (status.get(sessionId)?.pendingInteraction !== undefined) return NOTIFICATION
    // A subagent waiting on the reader holds its parent's work up too.
    for (let i = 0; i < subagents.length; i++) {
      if (status.get(subagents[i].id)?.pendingInteraction !== undefined) return NOTIFICATION
    }
  }
  if (reading.compacting) return SWEEPING
  let juggling = 0
  for (let i = 0; i < subagents.length; i++) {
    if (isRunning(subagents[i].id, status, list)) juggling++
  }
  if (juggling > 0) return { state: 'juggling', animation: juggling >= 2 ? 'conducting' : 'music', priority: 4 }
  if (reading.phase === 'working') return working(Math.max(1, busy))
  if (reading.phase === 'thinking' || isRunning(sessionId, status, list)) return THINKING
  return IDLE
}

/**
 * What the mascot reads off the host (packages/client/src/features/mascot/mascot-player.ts):
 * the state a session — or, on the home page, the whole workspace — is in
 * right now, and the moments that end a piece of work.
 *
 * The state is read on demand from the host's own client state: the
 * session status (`uiSession.sessionStatus`: whether a session runs, and
 * the one interaction it waits on — an approval, a question, a plan
 * review), the session list (which sessions are top level, and the
 * subagents each one has started) and the chat snapshot (`uiConversation`,
 * target `chat`, subscribed while the session is followed: the open turn,
 * the step streaming in it and the tool calls still running). The moments
 * come from the followed session's event feed
 * (`sessions.binding(id).eventSource`), whose appended events arrive live
 * and in order: a turn ending, a tool result that failed, a compaction
 * starting and ending. The chat target shows an automatic compaction only
 * once it has finished, so the feed is the one place a running one shows:
 * the feed's whole window tells which compactions run when it is loaded or
 * sent again, its appended events in between. On the home page, a session
 * that finishes out of view (the host's `completionUnread`, the sidebar's
 * green dot) is the moment.
 *
 * The names follow the Clawd on Desk themes both mascots are drawn to: a
 * state picks an animation, and its priority decides which of two states
 * shows.
 *
 * @param ctx - client context.
 * @param onMoment - `onMoment(moment)` with 'error' or 'attention'.
 * @param onChange - the state may have changed with no DOM change to wake a
 *     pass: the session status moved, the chat target published, or a
 *     compaction started or ended.
 * @returns `{ follow, read, dispose }`.
 */
export function createMascotSignals(ctx: HostContext, onMoment: (moment: MascotMoment) => void, onChange: () => void) {
  /** The session whose feed is followed; null on the home page, undefined before the first follow. */
  let followed: string | null | undefined
  let stopFeed: (() => void) | null = null
  /** The followed session's chat target (`uiConversation`, target `chat`), subscribed while followed. */
  let chat: HostChatTarget | null = null
  let stopChat: (() => void) | null = null
  /** Compactions of the followed session that started and have not ended. */
  const compactions = new Set<string>()
  /** Sessions finished out of view at the last status read; null before the first. */
  let unread: Set<string> | null = null

  /**
   * The session status source, resolved per read: uiSession can mount after
   * this feature, and a source captured once at creation would stay absent
   * for the whole generation. A newly appeared source is subscribed there
   * and then; a swapped one replaces its subscription.
   */
  let statusSource: HostSnapshotSource<HostSessionStatusSnapshot> | undefined
  let stopStatus: (() => void) | null = null

  function statusOf(): HostSessionStatusSnapshot | null {
    const source = ctx.get('uiSession')?.sessionStatus
    if (source !== statusSource) {
      if (stopStatus !== null) stopStatus()
      statusSource = source
      stopStatus = typeof source?.subscribe === 'function' ? source.subscribe(onStatus) : null
    }
    return typeof source?.getSnapshot === 'function' ? source.getSnapshot() : null
  }

  function listOf(): HostSessionListSnapshot | null {
    const list = ctx.get('sessions')?.list
    return typeof list?.getSnapshot === 'function' ? list.getSnapshot() : null
  }

  function chatSnapshot() {
    return chat === null ? null : chat.getSnapshot() ?? null
  }

  /**
   * What the open turn is doing: `thinking` while the model reasons or has
   * not answered yet, `working` while it writes an answer or a tool call
   * and while its tool calls run; null when no turn is open.
   */
  function turnPhase(snapshot: HostChatSnapshot): MascotTurnPhase | null {
    const order = snapshot.timeline.turnOrder
    const turn = order.length === 0 ? undefined : snapshot.timeline.turns.get(order[order.length - 1])
    if (turn === undefined || turn.status !== 'open') return null
    const activity = readTurnActivity(snapshot, turn)
    if (activity === null) return 'thinking'
    if (activity.kind === 'tools') return 'working'
    return activity.newest === null || activity.newest === 'reasoning' ? 'thinking' : 'working'
  }

  /**
   * The state to show: for one session on its conversation page, or for
   * the whole workspace on the home page (`sessionId` null).
   *
   * @returns `{ state, animation, priority }`.
   */
  function read(sessionId: string | null): MascotLevel {
    const snapshot = sessionId === null ? null : chatSnapshot()
    return mascotLevel({
      sessionId,
      status: statusOf(),
      list: listOf(),
      compacting: compactions.size > 0,
      phase: snapshot === null ? null : turnPhase(snapshot),
    })
  }

  /** One live event of the followed session. */
  function take(event: HostSessionEvent) {
    if (event.type === 'turn/end') {
      const kind = event.data.reason.kind
      if (kind === 'completed' || kind === 'max-tokens') onMoment('attention')
      else if (kind === 'error' || kind === 'blocked') onMoment('error')
    } else if (event.type === 'tool/result') {
      // A call cut short by a stop is not a failure the mascot reacts to.
      if (event.data.message.isError === true && event.data.error?.name !== 'AbortError') onMoment('error')
    } else if (event.type === 'compaction/start') {
      compactions.add(event.data.compactionId)
      onChange()
    } else if (event.type === 'compaction/end') {
      compactions.delete(event.data.compactionId)
      onChange()
      onMoment(event.data.error === undefined ? 'attention' : 'error')
    }
  }

  /**
   * Take the running compactions from a whole event window: the ones it
   * starts and does not end. A window the feed loads or sends again whole
   * (a reconnect does) settles the set; appended events keep it current
   * in between.
   */
  function adoptCompactions(entries: HostFeedEntry[]) {
    compactions.clear()
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (entry.type !== 'event') continue
      if (entry.event.type === 'compaction/start') compactions.add(entry.event.data.compactionId)
      else if (entry.event.type === 'compaction/end') compactions.delete(entry.event.data.compactionId)
    }
  }

  /**
   * Follow one session's feed (null: the home page, no feed). Only events
   * appended from here on are moments — the history a feed loads or
   * replaces is the past, and only tells which compactions still run. A
   * session whose binding is not up yet is followed on a later call.
   */
  function follow(sessionId: string | null) {
    if (sessionId === followed) return
    unfollow()
    followed = sessionId
    if (sessionId === null) return
    const feed = ctx.get('sessions')?.binding(sessionId)?.eventSource
    if (typeof feed?.subscribe !== 'function') {
      followed = undefined
      return
    }
    const target = findChatTarget(ctx, sessionId)
    if (target !== null) {
      // The host builds the chat target only for a subscriber (or while the
      // shell shows the chat view), and its publications are the ones that
      // tell a streaming step's progress; a bare read would see nothing on
      // the trajectory view.
      chat = target
      stopChat = chat.subscribe(onChange)
    }
    adoptCompactions(feed.getSnapshot().entries)
    stopFeed = feed.subscribe(() => {
      const latest = feed.getSnapshot()
      const change = latest.change
      if (change.kind === 'replace') {
        adoptCompactions(latest.entries)
        onChange()
        return
      }
      if (change.kind !== 'append') return
      for (let i = 0; i < change.entries.length; i++) {
        if (change.entries[i].type === 'event') take(change.entries[i].event)
      }
    })
  }

  /** The status moved: on the home page a session newly finished out of view is a moment. */
  function onStatus() {
    const status = statusOf()
    if (status === null) return
    const next = new Set<string>()
    for (const [id, entry] of status) {
      if (entry.completionUnread === true) next.add(id)
    }
    if (unread !== null && followed === null) {
      for (const id of next) {
        if (unread.has(id)) continue
        onMoment('attention')
        break
      }
    }
    unread = next
    onChange()
  }

  /** Stop following the session followed so far. */
  function unfollow() {
    if (stopFeed !== null) stopFeed()
    stopFeed = null
    if (stopChat !== null) stopChat()
    stopChat = null
    chat = null
    compactions.clear()
    followed = undefined
  }

  function dispose() {
    unfollow()
    if (stopStatus !== null) stopStatus()
  }

  onStatus()
  return { follow, read, dispose }
}
