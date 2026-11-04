import { SIDEBAR_SLOT_SELECTOR, SESSION_PHASE_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import { RightSessionStatus } from './row-status'
import { PART_ATTR } from '../../constants'
import type manifest from './sidebar-status.manifest'

/** Repaint the native indicator at the trailing edge; the host remains its state owner (D43). */
export function install(_ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const schedule = () => ui.schedule?.()
  const rows = observeMatches<HTMLElement>(`${SIDEBAR_SLOT_SELECTOR} [data-dsh-claude-part~="session-row"]`, schedule)
  const tracked = new Map<HTMLElement, { view: RightSessionStatus, stop(): void }>()
  let present = new Set<HTMLElement>()
  function measure() {
    present = new Set(rows.all())
    for (const row of present) {
      let item = tracked.get(row)
      if (item === undefined) {
        item = { view: new RightSessionStatus(row, schedule), stop: subscribeMutations(row, {
          childList: true, characterData: true, subtree: true,
          attributeFilter: [SESSION_PHASE_ATTRIBUTE, PART_ATTR, 'hidden', 'aria-hidden', 'contenteditable', 'style', 'class'],
        }, schedule) }
        tracked.set(row, item)
      }
      item.view.measure()
    }
  }
  function sync() {
    for (const row of present) tracked.get(row)?.view.sync()
    for (const [row, item] of tracked) if (present.has(row) === false) {
      item.stop(); item.view.dispose(); tracked.delete(row)
    }
  }
  function teardown() {
    rows.release()
    for (const item of tracked.values()) { item.stop(); item.view.dispose() }
    tracked.clear()
  }
  ui.sidebarStatus = { measure, sync, skipOnContentOnly: true, teardown }
  return teardown
}
