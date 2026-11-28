import { SESSION_ROW_KEY_ATTRIBUTE, WORKSPACE_ROW_EXPANDED_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { isNonPrimarySessionOrigin } from '@dsh-claude-style/contracts/services'
import { hostSessionStatus, hostSessions, hostSnapshot, hostWorkspaceView, hostWorkspaces } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import { readPrefs } from '../../core/prefs'
import { createIdentityMemo } from '../../shared/identity-memo'
import { createSourceFollow } from '../../shared/source-follow'
import { WorkspaceRunningMark } from './group-mark'
import { runningWorkspaces } from './running-groups'

/** The host keys a workspace row `workspace:` and the Workspace id. */
const KEY_PREFIX = 'workspace:'

/**
 * The mark a closed workspace row carries while a session under it runs.
 *
 * The session rows are not on the page while their workspace stands closed, so
 * the reading comes from the host's own lists: the sessions running now
 * (`uiSession.sessionStatus`, with the list's summary behind it) and the
 * workspace each one belongs to (`workspaces.list`). The workspace ids are
 * rebuilt only when one of those snapshots moved; the page rows are walked every
 * pass because they change without a host list moving. The rows are written in
 * the pass's write phase, after the measure has taken the whole reading.
 */
export class WorkspaceGroupStatus {
  /** 按行: the mark each marked row owns, dropped when the row leaves the document. */
  private readonly marks = new Map<HTMLElement, WorkspaceRunningMark>()
  /** 按行: the rows that carry a mark after the last measure, rebuilt from the page's rows. */
  private wanted = new Set<HTMLElement>()
  /** The three lists this mark reads, followed so a status change with no page node asks for a pass. */
  private readonly sources: ReturnType<typeof createSourceFollow>
  /** The workspace ids holding a running session, kept while the snapshots they came from stand. */
  private readonly marked = createIdentityMemo<ReadonlySet<string> | null>()

  /**
   * @param ctx - the host context the lists are read from.
   * @param rows - the workspace rows on the page.
   * @param schedule - asks for the pass that writes what a moving status means.
   */
  constructor(private readonly ctx: HostContext, private readonly rows: () => HTMLElement[], schedule: () => void) {
    this.sources = createSourceFollow(schedule)
  }

  measure() {
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

  /** The workspace ids a closed row is marked for, or null while the lists have not answered. */
  private runningIds(): ReadonlySet<string> | null {
    const statusSource = hostSessionStatus(this.ctx)
    const sessionsSource = hostSessions(this.ctx)?.list ?? null
    const workspacesSource = hostWorkspaces(this.ctx)?.list ?? null
    this.sources.follow([statusSource, sessionsSource, workspacesSource])
    const workspaces = hostSnapshot(workspacesSource)
    const sessions = hostSnapshot(sessionsSource)
    const status = hostSnapshot(statusSource)
    const view = hostWorkspaceView(this.ctx)
    const nested = view !== null && view.getSnapshot().groupBy === 'workspace-tree'
    return this.marked.get([workspaces, sessions, status, nested], () => {
      // A list that has not answered says nothing about who runs; no mark is
      // drawn from a guess, and a mark already standing is taken away.
      if (workspaces === null || sessions === null || workspaces.phase === 'pending' || !Array.isArray(workspaces.items)) return null
      const running = new Set<string>()
      for (const id of sessions.ids) {
        const summary = sessions.byId?.[id]
        if (summary === undefined || summary === null || isNonPrimarySessionOrigin(summary.origin)) continue
        const live = typeof status?.get === 'function' ? status.get(id)?.running : undefined
        if ((live ?? summary.running) === true) running.add(id)
      }
      return runningWorkspaces(workspaces.items, running, nested)
    })
  }

  /** The rows that should carry a mark now: closed workspaces holding a running session. */
  private read(): Set<HTMLElement> {
    // 按行: one measure's wanted rows, all still on the page.
    const wanted = new Set<HTMLElement>()
    let marked: ReadonlySet<string> | null
    try {
      marked = this.runningIds()
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
    this.sources.release()
    this.marked.clear()
    for (const mark of this.marks.values()) mark.dispose()
    this.marks.clear()
    this.wanted.clear()
  }
}
