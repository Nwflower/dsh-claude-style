import type { HostArchivedFilter, HostSessionGroupBy, HostWorkspaceViewSnapshot, HostWorkspaceViewStore } from '@dsh-claude-style/contracts/services'

/** The section's view (active / archived), as far as the host's own view store tells it. */
export type SegmentView = 'active' | 'archived'

/** The reader's 进行中 grouping, outliving a reload spent in 已归档. */
const GROUP_BY_STORAGE = 'dsh-claude-style.workspaceGroupBy'

/**
 * The grouping the reader last had in 进行中: the store's default until this browser records one.
 *
 * 三档都记：宿主的视图菜单本来就提供「单列表」（扁平），读者选过它之后，下一次打开
 * 还是这张单列表。
 */
export function storedGroupBy(): HostSessionGroupBy {
  const stored = localStorage.getItem(GROUP_BY_STORAGE)
  if (stored === 'workspace-tree' || stored === 'flat') return stored
  return 'workspace'
}

function storeGroupBy(group: HostSessionGroupBy) {
  localStorage.setItem(GROUP_BY_STORAGE, group)
}

/** The store's filter, with a snapshot older than the filter read as the host reads it. */
export function filterOf(snapshot: HostWorkspaceViewSnapshot): HostArchivedFilter {
  return snapshot.archivedFilter === 'show' || snapshot.archivedFilter === 'only' ? snapshot.archivedFilter : 'default'
}

export function groupOf(snapshot: HostWorkspaceViewSnapshot): HostSessionGroupBy {
  return snapshot.groupBy === 'workspace-tree' || snapshot.groupBy === 'flat' ? snapshot.groupBy : 'workspace'
}

/**
 * The host's view store, followed: the host's view menu and the archive notice's
 * 「筛选已归档会话」 write the same state, so a change made there moves the
 * segment with it; `show` (archived rows among the others) is the one state the
 * two halves cannot share, and it is driven to `only` for the archived segment
 * to own the list. A grouping change while 进行中 is the reader's and becomes
 * the one a later 已归档 visit puts back.
 *
 * The store is the registration the host keeps under `sidebar.workspaces`
 * (package `@dsh-claude-style/engine/host.ts` `hostWorkspaceView`), the same
 * instance its own view menu writes; the grouping the reader had before 已归档
 * is put back on the way out, and kept in this browser for a reload spent
 * inside 已归档.
 */
export function createViewStoreFollower() {
  /** The host's view store; null until its registration is on the page. */
  let store: HostWorkspaceViewStore | null = null
  let view: SegmentView = 'active'
  /**
   * The filter the store answered last: a write of the skin's own is not read
   * back as a change of the reader's, and the filter before an archived visit
   * is what tells a return from a pick.
   */
  let seenFilter: HostArchivedFilter | null = null
  /** The grouping 进行中 had before 已归档; see storedGroupBy for the reload case. */
  let activeGroupBy: HostSessionGroupBy = storedGroupBy()
  const listeners: (() => void)[] = []
  let disposed = false

  /** The host's view store, once the browser's registration is on the page. */
  function attach(next: HostWorkspaceViewStore) {
    store = next
  }

  function attached() {
    return store !== null
  }

  function currentView() {
    return view
  }

  function subscribe(listener: () => void) {
    listeners.push(listener)
    return () => {
      const at = listeners.indexOf(listener)
      if (at !== -1) listeners.splice(at, 1)
    }
  }

  function notify() {
    const current = listeners.slice()
    for (let i = 0; i < current.length; i++) current[i]()
  }

  function setView(next: SegmentView) {
    if (next === view) return
    view = next
    notify()
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
    const snapshot = followed.getSnapshot()
    const filter = filterOf(snapshot)
    const group = groupOf(snapshot)
    // 日期视图开着的时候，分组由 date-groups 那一半管（它把宿主切成扁平再按日期排）；
    // 这里若照常跟随，就会把那个扁平当成读者「进行中」的分组记下来 —— 铃铛一按，
    // 读者原本的工作区分组就被抹掉了。过滤档仍要跟随：已归档那一页与它的分段由这里
    // 说，重新装上也得以宿主的过滤为准。
    const dated = document.body.hasAttribute('data-dsh-claude-date-groups')
    const previous = seenFilter
    seenFilter = filter
    if (filter === 'default') {
      setView('active')
      if (previous === 'only' || previous === 'show') {
        if (dated === false && group !== activeGroupBy) followed.actions.setGroupBy(activeGroupBy)
      } else if (dated === false && group !== activeGroupBy) {
        // 读者在宿主视图菜单里选的任意一档（按工作区、按工作区树、单列表）都是他的分组：
        // 日期视图开着的时候这里根本走不到（上面已经让开），所以读到的扁平就是读者的选择。
        rememberGroup(group)
      }
      return
    }
    setView('archived')
    // The flat list 已归档 runs in is the skin's arrangement, not the reader's
    // grouping: only a filter that was not already the archived one tells the
    // two apart.
    if (dated === false) {
      if (previous === 'default') rememberGroup(group)
      else if (previous === null && group !== 'flat') rememberGroup(group)
    }
    if (filter !== 'only') followed.actions.setArchivedFilter('only')
    if (group !== 'flat') followed.actions.setGroupBy('flat')
  }

  /**
   * The segment's own switch: write the host's filter and grouping, then let
   * the next pass follow the store's answer. The store keeps both, so the
   * choice survives a reload without the skin persisting anything but the
   * 进行中 grouping.
   */
  function drive(next: SegmentView) {
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
  }

  /**
   * The view's listeners, run without a change: a locale switch has to reach
   * what the view already rendered (the row actions' labels).
   */
  function refresh() {
    notify()
  }

  return { attach, attached, view: currentView, subscribe, reconcile, drive, refresh, dispose() { disposed = true } }
}
