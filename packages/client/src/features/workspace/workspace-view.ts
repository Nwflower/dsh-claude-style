import { currentSessionId, hostSessions, hostUiWorkspace, hostWorkspaces, hostWorkspaceView } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import type { MatchList } from '@dsh-claude-style/engine/bus'
import { createStamp } from '@dsh-claude-style/engine/dom'
import { markPartsWithin } from '@dsh-claude-style/engine/parts'
import { createHostToast } from '../../shared/host-toast'
import { createViewStoreFollower } from './view-store'
import { createSegmentControl } from './segments'
import { createArchivedActions } from './archived-actions'
import { createArchivedList } from './archived-list'
import type { HostSessionsService, HostUiWorkspaceService, HostWorkspacesService } from '@dsh-claude-style/contracts/services'
import type { FeatureUi } from '../../core/feature'
import type manifest from './workspace-view.manifest'

/**
 * The sidebar's workspace section, re-cut as a two-state view of the host's own
 * browser.
 *
 * The host's view store is the state: 进行中 is its 隐藏已归档 filter and
 * 已归档 its 仅显示已归档 filter over the one flat list, so both segments answer
 * the host's own view menu, the archive notice's 「筛选已归档会话」 and a reload
 * spent inside either segment (view-store.ts). The store is reached through the
 * registration the host keeps under `sidebar.workspaces` (package
 * `@dsh-claude-style/engine/host.ts` `hostWorkspaceView`), the same instance
 * its own view menu writes; the grouping the reader had before 已归档 is put
 * back on the way out, and kept in this browser for a reload spent inside
 * 已归档.
 *
 * What 已归档 shows, though, is the skin's own list (archived-list.ts): the
 * host's tree would mount every archived conversation at once, which is what
 * slows the section down once the archive holds hundreds (#210). The skin's
 * list takes the archive set and the session baseline off the host's own
 * snapshots, shows one page of thirty, and appends the next as the reader
 * reaches the foot. While the segment stands, the host's own list area stays
 * hidden and the section's rows are the skin's; every row's open, unarchive and
 * delete is the host's own action (uiWorkspace.openSession,
 * workspaces.unarchiveSession, the host half's session-delete route followed by
 * the sessions service's refresh), so the list behaves like the host's, page
 * by page.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  /** The host's Toast and icons, reached through the plugin loader's `require` — the same packages its UI uses. */
  const toast = createHostToast()
  /** The section's view (active / archived), its heading, marked for workspace.css. */
  const viewStamp = createStamp('data-dsh-claude-ws-view')
  const labelStamp = createStamp('data-dsh-claude-ws-label')
  const follower = createViewStoreFollower()
  const segments = createSegmentControl((next) => {
    follower.drive(next)
    sync()
  })
  /** The session list, pulled after a delete so the removed summary leaves. */
  let sessions: HostSessionsService | null = null
  /** The workspace list: the archive set the 已归档 page reads. */
  let workspaces: HostWorkspacesService | null = null
  /** The shell's workspace actions (uiWorkspace); null on a host without the seat. */
  let uiWorkspace: unknown = null
  /**
   * The section label, kept while it still stands; the section is a seat the
   * host mounts once and replaces whole, and this runs on every pass.
   */
  let sectionLabel: HTMLElement | null = null
  /** The section labels on the page, taken from the bus and released with the section. */
  let labelWatch: MatchList<HTMLElement> | null = null
  /** The list's additions, marked before the frame paints; see watchAdditions. */
  let stopAdditions: (() => void) | null = null
  let additionsRoot: Element | null = null
  const actions = createArchivedActions({ toast, sessions: () => sessions })

  const list = createArchivedList({
    host: {
      workspaces: () => workspaces,
      sessions: () => sessions,
      currentSession: () => currentSessionId(ctx, sessions) ?? null,
    },
    actions: {
      /** Open through the host's own navigation; an unavailable action fails at the press (D12). */
      open(id) {
        const seat = uiWorkspace as HostUiWorkspaceService | null
        if (seat === null || typeof seat.openSession !== 'function') throw new Error('workspace: host uiWorkspace.openSession is unavailable')
        seat.openSession(id)
      },
      /** Take the conversation back to 进行中 through the host's workspace service; the archive set's own subscription drops the row. */
      unarchive(id) {
        const service = workspaces
        if (service === null || typeof service.unarchiveSession !== 'function') throw new Error('workspace: host unarchiveSession is unavailable')
        service.unarchiveSession(id).then(() => {
          list.sync()
        }).catch((reason: unknown) => {
          console.warn('dsh-claude-style: session unarchive rejected:', reason)
        })
      },
      remove: (id) => actions.removeArchived(id),
    },
    schedule: () => {
      if (typeof ui.schedule === 'function') ui.schedule()
    },
  })

  /** The section root a label sits in: the label's header, and that header's parent. */
  function sectionRoot(label: Element) {
    const header = label.parentElement
    return header === null ? null : header.parentElement
  }
  /** The section root a label stands in, or null when that root keeps no list area. */
  function sectionOf(label: Element) {
    const root = sectionRoot(label)
    if (root === null) return null
    return root.querySelector(LIST_AREA_SELECTOR) === null ? null : root
  }
  function findSection() {
    const kept = sectionLabel
    if (kept !== null && kept.isConnected && sectionOf(kept) !== null) return kept
    // The labels of every section the sidebar holds, kept current by the bus
    // (D40): which one dresses a control is decided here per pass, but the
    // document is walked once rather than on every pass.
    labelWatch ??= observeMatches<HTMLElement>('[data-dsh-claude-part~="section-label"]')
    const labels = labelWatch.all()
    for (let i = 0; i < labels.length; i++) {
      if (sectionOf(labels[i]) === null) continue
      sectionLabel = labels[i]
      return labels[i]
    }
    sectionLabel = null
    return null
  }

  /** The section's list area, the sibling its header shares a parent with. */
  const LIST_AREA_SELECTOR = '[data-dsh-claude-part~="list-area"]'

  /**
   * The host's view store, once the browser's registration is on the page; the
   * section keeps its plain label until then, since a segment that cannot drive
   * the host would lie about the list.
   */
  function watch() {
    if (follower.attached()) return true
    const next = hostWorkspaceView(ctx)
    if (next === null) return false
    follower.attach(next)
    sessions = hostSessions(ctx)
    workspaces = hostWorkspaces(ctx)
    uiWorkspace = hostUiWorkspace(ctx)
    follower.reconcile()
    return true
  }

  /**
   * Mark the rows the host mounts as it rebuilds the list, before the frame
   * paints. The bus holds a large batch back to the task after the paint (D40),
   * so the rows of a switch would draw the host's 14px/400 title for one frame
   * where the sidebar's 13px/500 stands; this subscription asks for the paint's
   * own side of that rule.
   */
  function watchAdditions(root: Element) {
    if (additionsRoot === root) return
    stopAdditions?.()
    additionsRoot = root
    stopAdditions = subscribeMutations(root, { childList: true, subtree: true, beforePaint: true }, records => {
      for (let r = 0; r < records.length; r++) {
        const added = records[r].addedNodes
        for (let n = 0; n < added.length; n++) {
          const node = added[n]
          if (node instanceof Element) markPartsWithin(node)
        }
      }
    })
  }

  /**
   * Stand the feature down: the control and the archived list leave the page,
   * and the section's marks go with them.
   *
   * The host renders the section's heading only while the sidebar is wide
   * (ui-sidebar's SidebarRoot unmounts it in the rail), while the header and
   * the list area's own boxes stay mounted: with no heading to lay it over, an
   * absolutely placed control would paint on the rail's own section buttons.
   */
  function dropSection() {
    list.unmount()
    segments.release()
    labelStamp.release()
    viewStamp.release()
    labelWatch?.release()
    labelWatch = null
  }

  function sync() {
    const label = findSection()
    // No heading to dress: the sidebar is a rail, and the section keeps its
    // plain look until it is wide again.
    if (label === null || label.parentElement === null) {
      dropSection()
      return
    }
    // Until the host's view store is reachable the section keeps its plain label.
    if (!watch()) {
      dropSection()
      return
    }
    follower.reconcile()
    const root = sectionRoot(label)
    if (root === null) return
    watchAdditions(root)
    const header = label.parentElement
    labelStamp.mark(label)
    const view = follower.view()
    segments.sync(header, view)
    viewStamp.mark(root, view)
    // The archived segment's list stands in the section's own room; 进行中
    // hands the room back to the host's tree. sync re-reads the host's
    // snapshots each pass (the list itself writes nothing when they are
    // unchanged).
    if (view === 'archived') {
      list.mount(root)
      list.sync()
    } else {
      list.unmount()
    }
  }

  /**
   * The pass's read phase: the segment control's own box, taken before this
   * frame's writes. A pass that builds the control measures it in the write
   * phase instead (sliding-pill).
   */
  function measure() {
    segments.measure()
  }

  ui.workspace = {
    measure,
    sync,
    // The archived list reads its labels from the skin's copy; a locale change
    // has to reach the rows the page already holds.
    onCopyChange() { list.copyChanged() },
  }

  return () => {
    toast.dispose()
    follower.dispose()
    list.dispose()
    stopAdditions?.()
    stopAdditions = null
    additionsRoot = null
    dropSection()
    delete ui.workspace
  }
}
