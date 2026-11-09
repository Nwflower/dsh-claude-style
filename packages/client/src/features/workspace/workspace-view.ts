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
import { hostTooltip } from '../../shared/host-tooltip'
import type { HostSessionsService, HostUiWorkspaceService, HostWorkspacesService } from '@dsh-claude-style/contracts/services'
import type { FeatureUi } from '../../core/feature'
import type manifest from './workspace-view.manifest'

/**
 * Recast the sidebar workspace section into active and archived segments driven
 * by the host view store. The archived segment pages the skin's own list so a
 * large archive is not mounted whole; row actions stay the host's.
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
    tooltip: hostTooltip,
    host: {
      workspaces: () => workspaces,
      sessions: () => sessions,
      currentSession: () => currentSessionId(ctx),
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

  /** Mark new rows before paint; the bus otherwise reports them after the frame (D40). */
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

  /** Remove the control and list; without the wide-sidebar heading a control would cover rail buttons. */
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
    // The archived list occupies the section; other segments restore the host tree.
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
