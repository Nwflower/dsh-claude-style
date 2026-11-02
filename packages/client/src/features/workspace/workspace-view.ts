import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { SESSION_DELETE_ROUTE } from '../../constants'
import { hostSessions, hostWorkspaceView, registerSlotEntries } from '@dsh-claude-style/engine/host'
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import type { MatchList } from '@dsh-claude-style/engine/bus'
import { buildElement, closestFrom, createStamp } from '@dsh-claude-style/engine/dom'
import { markPartsWithin } from '@dsh-claude-style/engine/parts'
import { createHostToast } from '../../shared/host-toast'
import { VIEW_SWITCH_CLASS } from '../../shared/segment-control'
import type { HostAnswer } from '@dsh-claude-style/engine/resource'
import { createSlidingPill } from '../../shared/sliding-pill'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostArchivedFilter, HostSessionsService, HostSessionGroupBy, HostWorkspaceViewSnapshot, HostWorkspaceViewStore } from '@dsh-claude-style/contracts/services'
import type { FeatureUi } from '../../core/feature'
import type manifest from './workspace-view.manifest'
import { copy } from './copy'
import type { CopyKey } from './copy'

/** The row-action list the host's session rows render; the skin's delete button stands beside unarchive. */
const SESSION_ROW_ACTION_SLOT = 'sidebar.workspaces.session.row.action'
/** The reader's 进行中 grouping, outliving a reload spent in 已归档. */
const GROUP_BY_STORAGE = 'dsh-claude-style.workspaceGroupBy'
/** 宿主的视图记录（分组和它一起存），形如 `dsh.workspace.view.v5`。 */
const VIEW_RECORD_KEY = /^dsh\.workspace\.view\./
/** 已经为重载修分组跑过一次的标记：一个标签页只重载一次，免得转圈。 */
const HEAL_MARK = 'dsh-claude-group-healed'

/**
 * The grouping the reader last had in 进行中: the store's default until this browser records one.
 *
 * 扁平不算读者选过的分组：宿主的界面上没有这一档，只有日期视图写进来过。读到它
 * 就当没有记录 —— 否则早先那次「日期视图把扁平留在存储里」会被当成读者的选择，
 * 从此每次打开都是一条没有工作区分组的列表。
 */
function storedGroupBy(): HostSessionGroupBy {
  const stored = localStorage.getItem(GROUP_BY_STORAGE)
  return stored === 'workspace-tree' ? stored : 'workspace'
}

function storeGroupBy(group: HostSessionGroupBy) {
  localStorage.setItem(GROUP_BY_STORAGE, group)
}

/** The store's filter, with a snapshot older than the filter read as the host reads it. */
function filterOf(snapshot: HostWorkspaceViewSnapshot): HostArchivedFilter {
  return snapshot.archivedFilter === 'show' || snapshot.archivedFilter === 'only' ? snapshot.archivedFilter : 'default'
}

function groupOf(snapshot: HostWorkspaceViewSnapshot): HostSessionGroupBy {
  return snapshot.groupBy === 'workspace-tree' || snapshot.groupBy === 'flat' ? snapshot.groupBy : 'workspace'
}

/**
 * The sidebar's workspace section, re-cut as a two-state view of the host's own
 * browser.
 *
 * The host's view store is the state: 进行中 is its 隐藏已归档 filter and
 * 已归档 its 仅显示已归档 filter over the one flat list, so both segments show
 * the host's own tree — its rows, its unarchive button, its archived-row notice
 * — rather than a list of the skin's. The store is reached through the
 * registration the host keeps under `sidebar.workspaces` (package
 * `@dsh-claude-style/engine/host.ts` `hostWorkspaceView`), the same instance its
 * own view menu writes; the grouping the reader had before 已归档 is put back on
 * the way out, and kept in this browser for a reload spent inside 已归档.
 *
 * The archived list carries no delete action of the host's, so the skin
 * registers one in the host's row-action seat (`sidebar.workspaces.session.row.action`),
 * rendered only while the archived filter stands. Deleting goes through the
 * host half's route (D75) as it did on the skin's own rows.
 *
 * The filter is the store's: a change made through the host's view menu, or the
 * archive notice's 「筛选已归档会话」, lands in the segment too — the notice asks
 * to see the archived conversations, which is the archived segment. The two
 * archived-showing filters both mean that segment, so `show` is driven to
 * `only`; `default` is 进行中.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  /** The host's Toast and icons, reached through the plugin loader's `require` — the same packages its UI uses. */
  const toast = createHostToast()
  /** The section's view (active / archived), its heading, marked for workspace.css. */
  const viewStamp = createStamp('data-dsh-claude-ws-view')
  const labelStamp = createStamp('data-dsh-claude-ws-label')
  const SEGMENTS: { id: string, key: CopyKey }[] = [
    { id: 'active', key: 'archiveActive' },
    { id: 'archived', key: 'archiveArchived' }
  ]
  let view: 'active' | 'archived' = 'active'
  let control: HTMLElement | null = null
  /** The control's sliding highlight (packages/client/src/shared/sliding-pill.ts). */
  const segmentPill = createSlidingPill('[aria-checked="true"]')
  /** The host's view store; null until its registration is on the page. */
  let store: HostWorkspaceViewStore | null = null
  /** The session list, pulled after a delete so the removed summary leaves. */
  let sessions: HostSessionsService | null = null
  /**
   * The filter the store answered last: a write of the skin's own is not read
   * back as a change of the reader's, and the filter before an archived visit
   * is what tells a return from a pick.
   */
  let seenFilter: HostArchivedFilter | null = null
  /** The grouping 进行中 had before 已归档; see storedGroupBy for the reload case. */
  let activeGroupBy: HostSessionGroupBy = storedGroupBy()
  /** The archived row action's listeners (React's external-store subscription). */
  const viewListeners: (() => void)[] = []
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
  /** The slot service's injected scope, released with this install. */
  let slotsFiber: { dispose?: () => void } | null = null
  let disposed = false

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

  /** The archived row action's subscription: the host renders it, the skin only re-renders it. */
  function subscribeView(listener: () => void) {
    viewListeners.push(listener)
    return () => {
      const at = viewListeners.indexOf(listener)
      if (at !== -1) viewListeners.splice(at, 1)
    }
  }

  function archivedView() {
    return view === 'archived'
  }

  function notifyView() {
    const listeners = viewListeners.slice()
    for (let i = 0; i < listeners.length; i++) listeners[i]()
  }

  function setView(next: 'active' | 'archived') {
    if (next === view) return
    view = next
    notifyView()
  }

  /** The reader's grouping, kept for the way back and across a reload inside 已归档. */
  function rememberGroup(group: HostSessionGroupBy) {
    activeGroupBy = group
    storeGroupBy(group)
  }

  /**
   * Follow the host's store. Its view menu and the archive notice's
   * 「筛选已归档会话」 write the same state, so a change made there moves the
   * segment with it; `show` (archived rows among the others) is the one state
   * the two halves cannot share, and it is driven to `only` for the archived
   * segment to own the list. A grouping change while 进行中 is the reader's and
   * becomes the one a later 已归档 visit puts back.
   */
  function reconcile() {
    const followed = store
    if (followed === null || disposed) return
    // 日期视图开着的时候，分组由 date-groups 那一半管（它把宿主切成扁平再按日期排）；
    // 这里若照常跟随，就会把那个扁平当成读者「进行中」的分组记下来 —— 铃铛一按，
    // 读者原本的工作区分组就被抹掉了，关掉应用也回不来。
    if (document.body.hasAttribute('data-dsh-claude-date-groups')) return
    const snapshot = followed.getSnapshot()
    const filter = filterOf(snapshot)
    const group = groupOf(snapshot)
    const previous = seenFilter
    seenFilter = filter
    if (filter === 'default') {
      setView('active')
      if (previous === 'only' || previous === 'show') {
        if (group !== activeGroupBy) followed.actions.setGroupBy(activeGroupBy)
      } else if (group === 'flat') {
        // 扁平不是读者能选的分组（宿主的界面上没有这一档），只可能是日期视图写的：
        // 还回读者原来的分组，不要把它记成读者的选择。
        if (group !== activeGroupBy) followed.actions.setGroupBy(activeGroupBy)
      } else if (group !== activeGroupBy) {
        rememberGroup(group)
      }
      return
    }
    setView('archived')
    // The flat list 已归档 runs in is the skin's arrangement, not the reader's
    // grouping: only a filter that was not already the archived one tells the
    // two apart.
    if (previous === 'default') rememberGroup(group)
    else if (previous === null && group !== 'flat') rememberGroup(group)
    if (filter !== 'only') followed.actions.setArchivedFilter('only')
    if (group !== 'flat') followed.actions.setGroupBy('flat')
  }

  /**
   * The segment's own switch: write the host's filter and grouping, then let
   * the next pass follow the store's answer. The store keeps both, so the
   * choice survives a reload without the skin persisting anything but the
   * 进行中 grouping.
   */
  function drive(next: 'active' | 'archived') {
    const followed = store
    if (followed === null) return
    if (next === 'archived') {
      const snapshot = followed.getSnapshot()
      if (filterOf(snapshot) === 'default') rememberGroup(groupOf(snapshot))
      followed.actions.setArchivedFilter('only')
      followed.actions.setGroupBy('flat')
      seenFilter = 'only'
    } else {
      followed.actions.setArchivedFilter('default')
      followed.actions.setGroupBy(activeGroupBy)
      seenFilter = 'default'
    }
    setView(next)
    sync()
  }

  /**
   * The host's Toast, warning glyph included, rendered by the skin itself: the
   * host's notice channel is private to ui-workspace. The Toast portals to the
   * body, and a new key restarts it the way the host re-shows it.
   */
  function notifyToast(text: string) {
    toast.show({ text, icon: React.createElement(primitives.IconWarningOutlineRegular) })
  }

  /**
   * Delete one stored session through the host half's own route.
   *
   * The harness gives the browser half no deletion API of its own (the
   * workspace controller archives and unarchives; the agent protocol's
   * session delete is the host delegating to an ACP agent that owns the
   * storage), so the skin's host half removes the session's stored
   * directory and drops the id from the registry's archive set before it
   * answers. A stored-directory miss answers success too — an archive
   * entry whose directory is already gone is the ghost this buries — and
   * a 404 that still carries the host's own "session not found" JSON is
   * the same miss from an older host half without that branch: the storage
   * is gone all the same, so the row leaves too. Every other refusal keeps
   * the row and raises the host's Toast: the "session is open" answer (the
   * app still holds the session's agent attached, and only a restart
   * releases it) carries its own copy, everything else names the refusal
   * the route sent.
   */
  function removeArchived(id: string) {
    fetch(SESSION_DELETE_ROUTE, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: id }),
    }).then(response => response.json().then((result: HostAnswer) => ({ status: response.status, result }))).then(({ status, result }) => {
      if (result?.ok === true || (status === 404 && result?.error === 'session not found')) {
        refreshSessions()
        return
      }
      const refusal: Error & { status?: number } = new Error(String(result?.error || `HTTP ${status}`))
      refusal.status = status
      throw refusal
    }).catch((reason: { status?: number, message?: string }) => {
      console.warn('dsh-claude-style: session delete rejected:', reason)
      notifyToast(reason?.status === 409
        ? copy('archiveDeleteOpen')
        : copy('archiveDeleteFailed', { detail: reason?.message ?? String(reason) }))
    })
  }

  /**
   * Re-pull the host's session baseline right after a delete.
   *
   * The full list is what the projection prunes by: the host's fresh list
   * answer no longer carries the removed id, so its stale summary — the
   * one that kept a deleted session looking alive — leaves `sessions.list`
   * at this pull instead of at the next reconnect, and the host's own tree
   * drops the row with it. The pull is the sessions service's single-flight
   * refresh, so a pull already under way is reused.
   */
  function refreshSessions() {
    const followed = sessions
    if (followed === null || typeof followed.refresh !== 'function') return
    // Best effort against the host's sessions service: a rejection leaves the list as it stands (D12).
    followed.refresh().catch((reason: unknown) => {
      console.warn('dsh-claude-style: session baseline refresh rejected:', reason)
    })
  }

  /**
   * The archived row's delete action. The host renders its own row actions on
   * every session row, so this renders nothing unless the archived segment
   * stands; the host's unarchive button is the entry beside it in the same
   * seat. Its box is the host's own row-action button (workspace.css).
   */
  function DeleteArchivedSession({ sessionId }: { sessionId: string }) {
    const archived = React.useSyncExternalStore(subscribeView, archivedView)
    if (!archived) return null
    const label = copy('archiveDelete')
    return React.createElement(primitives.Tooltip, {
      label,
      side: 'bottom',
      align: 'end',
      delayMs: 500,
      portal: true,
      children: React.createElement('button', {
        type: 'button',
        className: 'dsh-claude-ws-delete',
        'aria-label': label,
        title: label,
        onClick: (event: React.MouseEvent) => {
          event.stopPropagation()
          removeArchived(sessionId)
        },
      }, React.createElement(primitives.IconTrashOutlineRegular, { size: 14 })),
    })
  }

  /** Register the delete action in the host's row-action list, once its declaration is on the ledger. */
  function registerDeleteAction() {
    slotsFiber = registerSlotEntries(ctx, [{
      options: { name: SESSION_ROW_ACTION_SLOT, id: 'claude-style-delete', order: 300 },
      component: DeleteArchivedSession,
    }], 'dsh-claude-style: archived delete')
  }

  /**
   * The host's view store, once the browser's registration is on the page; the
   * section keeps its plain label until then, since a segment that cannot drive
   * the host would lie about the list.
   */
  /**
   * 把宿主记着的「扁平」还成工作区。
   *
   * 宿主会把这一档写进它自己的存储，所以早先那一版在日期视图里留下的扁平，读者
   * 重启之后仍然看得见 —— 看到的是一条没有工作区分组的列表。只在宿主确实是扁平、
   * 而读者的分组记忆不是扁平时动手，读者自己选的「工作区树」不会被改掉。
   */
  function healGrouping() {
    const followed = store
    if (followed === null) return
    if (typeof followed.getSnapshot !== 'function' || typeof followed.actions?.setGroupBy !== 'function') return
    // 日期视图开着时分组归 date-groups 管，这里不插手。
    if (document.body.hasAttribute('data-dsh-claude-date-groups')) return
    if (groupOf(followed.getSnapshot()) !== 'flat') return
    const want = storedGroupBy()
    activeGroupBy = want
    followed.actions.setGroupBy(want)
    // 宿主是照着存储里那条视图记录搭列表的：只改 store，这一趟已经搭成扁平了。
    // 所以存储一并改掉，再重载一次 —— 读者下一次看到的才是工作区分组。
    if (!patchStoredGroup(want)) return
    try {
      if (sessionStorage.getItem(HEAL_MARK) === '1') return
      sessionStorage.setItem(HEAL_MARK, '1')
      location.reload()
    } catch {
      // 存储不可用：不冒重载转圈的风险，这一趟先这样。
    }
  }

  /**
   * 把宿主存储里那条视图记录的分组改成 want。
   *
   * 宿主自己的写入是这条记录，改它等于替读者把「扁平」还回去；返回有没有真的改动，
   * 没改动就不值得为它重载页面。
   */
  function patchStoredGroup(want: HostSessionGroupBy): boolean {
    let changed = false
    try {
      for (let at = 0; at < localStorage.length; at += 1) {
        const key = localStorage.key(at)
        if (key === null || !VIEW_RECORD_KEY.test(key)) continue
        const raw = localStorage.getItem(key)
        if (raw === null) continue
        const parsed: unknown = JSON.parse(raw)
        if (parsed === null || typeof parsed !== 'object') continue
        const record = parsed as { groupBy?: string }
        if (record.groupBy !== 'flat') continue
        record.groupBy = want
        localStorage.setItem(key, JSON.stringify(record))
        changed = true
      }
    } catch {
      // 存储不可用或记录不是这个形状：当作没改，交给下一次开门。
    }
    return changed
  }

  function watch() {
    if (store !== null) return true
    const next = hostWorkspaceView(ctx)
    if (next === null) return false
    store = next
    sessions = hostSessions(ctx)
    healGrouping()
    reconcile()
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

  function buildControl() {
    // The shared small segment look (shared/segment-control.css); the feature
    // class stays for the placement and label crossfade in workspace.css.
    const group = buildElement('div', `${VIEW_SWITCH_CLASS} dsh-claude-ws-segments`)
    group.setAttribute('role', 'radiogroup')
    for (let i = 0; i < SEGMENTS.length; i++) {
      const item = buildElement('button', 'dsh-claude-ws-segment', '')
      item.type = 'button'
      item.setAttribute('role', 'radio')
      item.setAttribute('data-view', SEGMENTS[i].id)
      group.appendChild(item)
    }
    group.addEventListener('click', event => {
      const item = closestFrom(event.target, '.dsh-claude-ws-segment')
      if (item === null) return
      event.stopPropagation()
      event.preventDefault()
      const next = item.getAttribute('data-view')
      if (next === 'active' || next === 'archived') drive(next)
    })
    return group
  }

  /**
   * Stand the feature down: the control leaves the page and the section's marks
   * go with it.
   *
   * The host renders the section's heading only while the sidebar is wide
   * (ui-sidebar's SidebarRoot unmounts it in the rail), while the header and
   * the list area's own boxes stay mounted: with no heading to lay it over, an
   * absolutely placed control would paint on the rail's own section buttons.
   */
  function dropSection() {
    segmentPill.release()
    if (control !== null && control.parentElement !== null) control.parentElement.removeChild(control)
    control = null
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
    reconcile()
    const root = sectionRoot(label)
    if (root === null) return
    watchAdditions(root)
    const header = label.parentElement
    labelStamp.mark(label)
    if (control === null || control.parentElement !== header) {
      if (control !== null && control.parentElement !== null) control.parentElement.removeChild(control)
      control = buildControl()
      header.insertBefore(control, header.firstChild)
    }
    for (let i = 0; i < control.children.length; i++) {
      const item = control.children[i]
      const id = item.getAttribute('data-view')
      for (let s = 0; s < SEGMENTS.length; s++) {
        if (SEGMENTS[s].id !== id) continue
        const text = copy(SEGMENTS[s].key)
        if (item.textContent !== text) item.textContent = text
      }
      const on = id === view
      if (item.getAttribute('aria-checked') !== (on ? 'true' : 'false')) item.setAttribute('aria-checked', on ? 'true' : 'false')
    }
    segmentPill.sync(control)
    viewStamp.mark(root, view)
  }

  /**
   * The pass's read phase: the segment control's own box, taken before this
   * frame's writes. A pass that builds the control measures it in the write
   * phase instead (sliding-pill).
   */
  function measure() {
    if (control !== null && control.parentElement !== null) segmentPill.measure(control)
  }

  registerDeleteAction()
  ui.workspace = {
    measure,
    sync,
    // The host's row action reads its label from the skin's copy; a locale
    // change has to reach the entries the host already rendered.
    onCopyChange() { notifyView() },
  }

  return () => {
    disposed = true
    toast.dispose()
    if (slotsFiber !== null && typeof slotsFiber.dispose === 'function') slotsFiber.dispose()
    slotsFiber = null
    stopAdditions?.()
    stopAdditions = null
    additionsRoot = null
    dropSection()
    delete ui.workspace
  }
}
