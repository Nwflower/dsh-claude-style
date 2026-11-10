import { SIDEBAR_SLOT_SELECTOR, SESSION_PHASE_ATTRIBUTE, WORKSPACE_ROW_EXPANDED_ATTRIBUTE, WORKSPACE_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { findSidebarRoot } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import { RightSessionStatus } from './row-status'
import { WorkspaceGroupStatus } from './group-status'
import { PART_ATTR } from '../../constants'
import type manifest from './sidebar-status.manifest'

/** Repaint the native indicator at the end the reader picked; the host remains its state owner (D43). */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const schedule = () => ui.schedule?.()
  const observedAttributes = new Set([SESSION_PHASE_ATTRIBUTE, WORKSPACE_ROW_EXPANDED_ATTRIBUTE, PART_ATTR, 'hidden', 'aria-hidden', 'contenteditable', 'style', 'class'])
  const rows = observeMatches<HTMLElement>(`${SIDEBAR_SLOT_SELECTOR} [data-dsh-claude-part~="session-row"]`, schedule)
  const groupRows = observeMatches<HTMLElement>(`${SIDEBAR_SLOT_SELECTOR} ${WORKSPACE_ROW_SELECTOR}`, schedule)
  const groups = new WorkspaceGroupStatus(ctx, () => groupRows.all(), schedule)
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
        childList: true, characterData: true, subtree: true, attributes: true,
      }, records => {
        // A plugin's own title attributes can switch generated content on or off.
        // Keep one root watch (D40); unrelated row attributes need no title read.
        if (records.some(record => record.type !== 'attributes'
          || observedAttributes.has(record.attributeName ?? '')
          || record.target instanceof Element && record.target.getAttribute(PART_ATTR)?.split(/\s+/).includes('row-title'))) schedule()
      })
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
    groups.measure()
  }
  function sync() {
    for (const row of present) tracked.get(row)?.sync()
    groups.sync()
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
    groups.dispose()
    groupRows.release()
    for (const view of tracked.values()) view.dispose()
    tracked.clear()
    present.clear()
  }
  ui.sidebarStatus = { measure, sync, skipOnContentOnly: true, teardown }
  return teardown
}
