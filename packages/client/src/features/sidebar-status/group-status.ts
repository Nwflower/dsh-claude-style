import { SESSION_ROW_KEY_ATTRIBUTE, WORKSPACE_ROW_EXPANDED_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import type { HostContext } from '@dsh-claude-style/engine/host'
import { readPrefs } from '../../core/prefs'
import { createWorkspaceRunning } from '../../shared/workspace-running'
import type { WorkspaceRunningReader, WorkspaceRunningReading } from '../../shared/workspace-running'
import { WorkspaceRunningMark } from './group-mark'
import { runningWorkspaces } from './running-groups'

/** The host keys a workspace row `workspace:` and the Workspace id. */
const KEY_PREFIX = 'workspace:'

/** The mark set a reading without an answer stands for. */
const NO_MARKS: ReadonlySet<string> = new Set()

/**
 * The mark a closed workspace row carries while a session under it runs.
 *
 * The session rows are not on the page while their workspace stands closed, so
 * the reading comes from the host's own lists: the sessions running now
 * (`uiSession.sessionStatus`, with the list's summary behind it) and the
 * workspace each one belongs to (`workspaces.list`). The shared reader
 * (shared/workspace-running.ts) keeps those lists and their subscriptions for
 * this generation; the mark set it answers with is rebuilt only when one of
 * them moves. The rows are written in the pass's write phase, after the measure
 * has taken the whole reading.
 */
export class WorkspaceGroupStatus {
  /** 按行: the mark each marked row owns, dropped when the row leaves the document. */
  private readonly marks = new Map<HTMLElement, WorkspaceRunningMark>()
  /** 按行: the rows that carry a mark after the last measure, rebuilt from the page's rows. */
  private wanted = new Set<HTMLElement>()
  /** The host reading this mark follows, owned by this generation and dropped with dispose. */
  private readonly running: WorkspaceRunningReader
  /** Per generation: the reading the mark set was built from; a new reading means its sources moved. */
  private markedFor: WorkspaceRunningReading | null = null
  /** Per generation: the workspace ids the last reading marked, reused while that reading stands. */
  private marked: ReadonlySet<string> = NO_MARKS

  /**
   * @param ctx - the host context the lists are read from.
   * @param rows - the workspace rows on the page.
   * @param schedule - asks for the pass that writes what a moving status means.
   */
  constructor(ctx: HostContext, private readonly rows: () => HTMLElement[], schedule: () => void) {
    this.running = createWorkspaceRunning(ctx, schedule)
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

  /**
   * The rows that should carry a mark now: closed workspaces holding a running
   * session. The workspace ids come from the shared reading and are rebuilt only
   * when one of its sources moved; the page rows are walked every pass because
   * they change without a host list moving.
   */
  private read(): Set<HTMLElement> {
    // 按行: one measure's wanted rows, all still on the page.
    const wanted = new Set<HTMLElement>()
    try {
      const reading = this.running.read()
      if (reading !== this.markedFor) {
        this.markedFor = reading
        this.marked = reading.answered && reading.workspaces !== null
          ? runningWorkspaces(reading.workspaces.items, reading.running, reading.nested)
          : NO_MARKS
      }
    } catch {
      // A service the host tore down still hands out its old source, and that
      // source throws. The native row status the feature exists for stands
      // without the group mark, so the throw stops at this addition.
      return wanted
    }
    for (const row of this.rows()) {
      const key = row.getAttribute(SESSION_ROW_KEY_ATTRIBUTE)
      if (key === null || !key.startsWith(KEY_PREFIX)) continue
      if (row.getAttribute(WORKSPACE_ROW_EXPANDED_ATTRIBUTE) === 'true') continue
      if (!this.marked.has(key.slice(KEY_PREFIX.length))) continue
      wanted.add(row)
    }
    return wanted
  }

  dispose() {
    this.running.dispose()
    for (const mark of this.marks.values()) mark.dispose()
    this.marks.clear()
    this.wanted.clear()
    this.markedFor = null
    this.marked = NO_MARKS
  }
}
