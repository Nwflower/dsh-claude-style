import { SESSION_ROW_KEY_ATTRIBUTE, WORKSPACE_ROW_EXPANDED_ATTRIBUTE, WORKSPACE_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { hostSessions, hostSnapshot, hostUiSession, hostWorkspaceView, hostWorkspaces } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostSnapshotSource } from '@dsh-claude-style/contracts/services'
import { readPrefs } from '../../core/prefs'
import { WorkspaceRunningMark } from './group-mark'
import { runningWorkspaces } from './running-groups'

/** The host keys a workspace row `workspace:` and the Workspace id. */
const KEY_PREFIX = 'workspace:'

/** One list source the mark follows, with the teardown of its subscription. */
interface Followed {
  source: HostSnapshotSource<unknown> | null
  stop: (() => void) | null
}

/**
 * Subscribe to one list source. A source the host already tore down can still
 * be handed out and throw here; that source goes unread and the mark stands
 * down for it, leaving the native row status alone (D12).
 */
function listen(source: HostSnapshotSource<unknown> | null, schedule: () => void): (() => void) | null {
  if (typeof source?.subscribe !== 'function') return null
  try {
    return source.subscribe(schedule)
  } catch {
    return null
  }
}

/**
 * The mark a closed workspace row carries while a session under it runs.
 *
 * The session rows are not on the page while their workspace stands closed, so
 * the reading comes from the host's own lists: the sessions running now
 * (`uiSession.sessionStatus`, with the list's summary behind it) and the
 * workspace each one belongs to (`workspaces.list`). The rows are written in
 * the pass's write phase, after the measure has taken the whole reading.
 */
export class WorkspaceGroupStatus {
  /** 按行: the mark each marked row owns, dropped when the row leaves the document. */
  private readonly marks = new Map<HTMLElement, WorkspaceRunningMark>()
  /** 按行: the rows that carry a mark after the last measure, rebuilt from the page's rows. */
  private wanted = new Set<HTMLElement>()
  /** sessionStatus, sessions.list and workspaces.list, in this order. */
  private readonly followed: Followed[] = []

  /**
   * @param ctx - the host context the lists are read from.
   * @param rows - the workspace rows on the page.
   * @param schedule - asks for the pass that writes what a moving status means.
   */
  constructor(private readonly ctx: HostContext, private readonly rows: () => HTMLElement[], private readonly schedule: () => void) {}

  measure() {
    this.follow()
    this.wanted = this.read()
  }

  sync() {
    const look = readPrefs().ongoingIndicator
    for (const [row, mark] of this.marks) {
      if (this.wanted.has(row) && row.isConnected) continue
      mark.dispose()
      this.marks.delete(row)
    }
    for (const row of this.wanted) {
      if (!row.isConnected) continue
      let mark = this.marks.get(row)
      if (mark === undefined) {
        mark = new WorkspaceRunningMark(row)
        this.marks.set(row, mark)
      }
      mark.update(true, look)
    }
  }

  /**
   * Subscribe to the lists once they mount and whenever the host replaces one:
   * a session starting or stopping under a closed workspace changes no page
   * node, so the pass has to be asked for from the sources themselves.
   */
  private follow() {
    const sources = [
      hostUiSession(this.ctx)?.sessionStatus ?? null,
      hostSessions(this.ctx)?.list ?? null,
      hostWorkspaces(this.ctx)?.list ?? null,
    ]
    for (let i = 0; i < sources.length; i++) {
      const entry = this.followed[i] ??= { source: null, stop: null }
      if (entry.source === sources[i]) continue
      entry.stop?.()
      entry.source = sources[i]
      entry.stop = listen(entry.source, this.schedule)
    }
  }

  /** The rows that should carry a mark now: closed workspaces holding a running session. */
  private read(): Set<HTMLElement> {
    // 按行: one measure's wanted rows, all still on the page.
    const wanted = new Set<HTMLElement>()
    let marked: Set<string> | null = null
    try {
      const workspaces = hostSnapshot(hostWorkspaces(this.ctx)?.list)
      const sessions = hostSnapshot(hostSessions(this.ctx)?.list)
      // A list that has not answered says nothing about who runs; no mark is
      // drawn from a guess, and a mark already standing is taken away below.
      if (workspaces === null || sessions === null || workspaces.phase === 'pending' || !Array.isArray(workspaces.items)) return wanted
      const status = hostSnapshot(hostUiSession(this.ctx)?.sessionStatus)
      const running = new Set<string>()
      for (const id of sessions.ids) {
        const summary = sessions.byId?.[id]
        if (summary === undefined || summary === null || summary.origin === 'subagent') continue
        const live = typeof status?.get === 'function' ? status.get(id)?.running : undefined
        if ((live ?? summary.running) === true) running.add(id)
      }
      const view = hostWorkspaceView(this.ctx)
      const nested = view !== null && view.getSnapshot().groupBy === 'workspace-tree'
      marked = runningWorkspaces(workspaces.items, running, nested)
    } catch {
      // A service the host tore down still hands out its old source, and that
      // source throws. The native row status the feature exists for stands
      // without the group mark, so the throw stops at this addition.
      return wanted
    }
    if (marked === null) return wanted
    for (const row of this.rows()) {
      const key = row.getAttribute(SESSION_ROW_KEY_ATTRIBUTE)
      if (key === null || !key.startsWith(KEY_PREFIX)) continue
      if (row.getAttribute(WORKSPACE_ROW_EXPANDED_ATTRIBUTE) === 'true') continue
      if (!marked.has(key.slice(KEY_PREFIX.length))) continue
      wanted.add(row)
    }
    return wanted
  }

  dispose() {
    for (const entry of this.followed) entry.stop?.()
    this.followed.length = 0
    for (const mark of this.marks.values()) mark.dispose()
    this.marks.clear()
    this.wanted.clear()
  }
}
