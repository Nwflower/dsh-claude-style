import { SIDEBAR_SLOT_SELECTOR, SESSION_PHASE_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { findSidebarRoot } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import { RightSessionStatus } from './row-status'
import { PART_ATTR } from '../../constants'
import type manifest from './sidebar-status.manifest'

/** Repaint the native indicator at the end the reader picked; the host remains its state owner (D43). */
export function install(_ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const schedule = () => ui.schedule?.()
  const rows = observeMatches<HTMLElement>(`${SIDEBAR_SLOT_SELECTOR} [data-dsh-claude-part~="session-row"]`, schedule)
  const tracked = new Map<HTMLElement, RightSessionStatus>()
  let present = new Set<HTMLElement>()
  let watchedRoot: HTMLElement | null = null
  let stopWatch: (() => void) | null = null
  function measure() {
    // One root subscription covers every row; title mutations still invalidate
    // the next read phase without adding subscriptions as the session list grows.
    const root = findSidebarRoot()
    if (root !== watchedRoot) {
      stopWatch?.()
      watchedRoot = root
      stopWatch = root === null ? null : subscribeMutations(root, {
        childList: true, characterData: true, subtree: true,
        attributeFilter: [SESSION_PHASE_ATTRIBUTE, PART_ATTR, 'hidden', 'aria-hidden', 'contenteditable', 'style', 'class'],
      }, schedule)
    }
    present = new Set(rows.all())
    for (const row of present) {
      let view = tracked.get(row)
      if (view === undefined) {
        view = new RightSessionStatus(row, schedule)
        tracked.set(row, view)
      }
      view.measure()
    }
  }
  function sync() {
    for (const row of present) tracked.get(row)?.sync()
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
    present.clear()
  }
  ui.sidebarStatus = { measure, sync, skipOnContentOnly: true, teardown }
  return teardown
}
