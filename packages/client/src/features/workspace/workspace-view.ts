import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { hostSessions, hostWorkspaceView, registerSlotEntries } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import type { MatchList } from '@dsh-claude-style/engine/bus'
import { createStamp } from '@dsh-claude-style/engine/dom'
import { markPartsWithin } from '@dsh-claude-style/engine/parts'
import { createHostToast } from '../../shared/host-toast'
import { createViewStoreFollower } from './view-store'
import { createSegmentControl } from './segments'
import { createArchivedActions } from './archived-actions'
import type { HostSessionsService } from '@dsh-claude-style/contracts/services'
import type { FeatureUi } from '../../core/feature'
import type manifest from './workspace-view.manifest'
import { copy } from './copy'

/** The host session row's action slot, used by the archived delete button. */
const SESSION_ROW_ACTION_SLOT = 'sidebar.workspaces.session.row.action'

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
 * Both segments show the host's own tree; the archived row's delete action
 * lives in archived-actions.ts and is registered in the host's row-action seat.
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
  /** The slot service's injected scope, released with this install. */
  let slotsFiber: { dispose?: () => void } | null = null
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
  }

  /**
   * The pass's read phase: the segment control's own box, taken before this
   * frame's writes. A pass that builds the control measures it in the write
   * phase instead (sliding-pill).
   */
  function measure() {
    segments.measure()
  }

  /** The host renders this action only while the archived segment stands. */
  function DeleteArchivedSession({ sessionId }: { sessionId: string }) {
    const archived = React.useSyncExternalStore(follower.subscribe, () => follower.view() === 'archived')
    if (!archived) return null
    const label = copy('archiveDelete')
    return React.createElement('button', {
      type: 'button',
      className: 'dsh-claude-ws-delete',
      'aria-label': label,
      title: label,
      onClick: (event: React.MouseEvent) => {
        event.stopPropagation()
        actions.removeArchived(sessionId)
      },
    }, React.createElement(primitives.IconTrashOutlineRegular, { size: 14 }))
  }

  /** Register the moved delete action once its host declaration is available. */
  function registerDeleteAction() {
    slotsFiber = registerSlotEntries(ctx, [{
      options: { name: SESSION_ROW_ACTION_SLOT, id: 'claude-style-delete', order: 300 },
      component: DeleteArchivedSession,
    }], 'dsh-claude-style: archived delete')
  }

  registerDeleteAction()
  ui.workspace = {
    measure,
    sync,
    onCopyChange() { follower.refresh() },
  }

  return () => {
    toast.dispose()
    follower.dispose()
    if (slotsFiber !== null && typeof slotsFiber.dispose === 'function') slotsFiber.dispose()
    slotsFiber = null
    stopAdditions?.()
    stopAdditions = null
    additionsRoot = null
    dropSection()
    delete ui.workspace
  }
}
