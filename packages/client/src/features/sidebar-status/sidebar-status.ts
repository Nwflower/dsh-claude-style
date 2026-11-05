import { SIDEBAR_SLOT_SELECTOR, SESSION_PHASE_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { findSidebarRoot } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import { RightSessionStatus } from './row-status'
import type manifest from './sidebar-status.manifest'

/** Repaint the native indicator at the trailing edge; the host remains its state owner (D43). */
export function install(_ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const schedule = () => ui.schedule?.()
  const rows = observeMatches<HTMLElement>(`${SIDEBAR_SLOT_SELECTOR} [data-dsh-claude-part~="session-row"]`, schedule)
  const tracked = new Map<HTMLElement, RightSessionStatus>()
  let watchedRoot: HTMLElement | null = null
  let stopWatch: (() => void) | null = null
  function sync() {
    // One root subscription covers every row; per-row subscriptions make each
    // bus batch and every observer re-attachment grow with the session count.
    const root = findSidebarRoot()
    if (root !== watchedRoot) {
      stopWatch?.()
      watchedRoot = root
      stopWatch = root === null ? null : subscribeMutations(root, {
        childList: true, subtree: true, attributeFilter: [SESSION_PHASE_ATTRIBUTE],
      }, schedule)
    }
    const present = new Set(rows.all())
    for (const row of present) {
      let view = tracked.get(row)
      if (view === undefined) {
        view = new RightSessionStatus(row)
        tracked.set(row, view)
      }
      view.sync()
    }
    for (const [row, view] of tracked) if (present.has(row) === false) {
      view.dispose()
      tracked.delete(row)
    }
  }
  function teardown() {
    stopWatch?.()
    stopWatch = null
    watchedRoot = null
    rows.release()
    for (const view of tracked.values()) view.dispose()
    tracked.clear()
  }
  ui.sidebarStatus = { sync, skipOnContentOnly: true, teardown }
  return teardown
}
