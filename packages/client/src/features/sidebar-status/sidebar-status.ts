import { SIDEBAR_SLOT_SELECTOR, SESSION_PHASE_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import { RightSessionStatus } from './row-status'
import type manifest from './sidebar-status.manifest'

/** Repaint the native indicator at the trailing edge; the host remains its state owner (D43). */
export function install(_ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const schedule = () => ui.schedule?.()
  const rows = observeMatches<HTMLElement>(`${SIDEBAR_SLOT_SELECTOR} [data-dsh-claude-part~="session-row"]`, schedule)
  const tracked = new Map<HTMLElement, { view: RightSessionStatus, stop(): void }>()
  function sync() {
    const present = new Set(rows.all())
    for (const row of present) {
      let item = tracked.get(row)
      if (item === undefined) {
        item = { view: new RightSessionStatus(row), stop: subscribeMutations(row, {
          childList: true, subtree: true, attributeFilter: [SESSION_PHASE_ATTRIBUTE],
        }, schedule) }
        tracked.set(row, item)
      }
      item.view.sync()
    }
    for (const [row, item] of tracked) if (present.has(row) === false) {
      item.stop(); item.view.dispose(); tracked.delete(row)
    }
  }
  function teardown() {
    rows.release()
    for (const item of tracked.values()) { item.stop(); item.view.dispose() }
    tracked.clear()
  }
  ui.sidebarStatus = { sync, skipOnContentOnly: true, teardown }
  return teardown
}
