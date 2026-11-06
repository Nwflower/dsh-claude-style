import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { SESSION_ROW_KEY_ATTRIBUTE, SIDEBAR_SLOT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import type { HostSessionMenuProps } from '@dsh-claude-style/contracts/services'
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { writeTextInPlace } from '@dsh-claude-style/engine/dom'
import { currentSessionId, findSidebarRoot, hostSessions, hostUiSession, registerSlotEntries } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import { readPrefs, savePrefs, subscribePrefs, prefsFromForm } from '../../core/prefs'
import type { FeatureUi } from '../../core/feature'
import { createHostToast } from '../../shared/host-toast'
import { createUnreadVisitTracker, createUnreadWriter } from './state'
import { UnreadRowMark, unreadRowSessionId } from './row-mark'
import { copy } from './copy'
import type manifest from './manual-unread.manifest'

const MENU_SLOT = 'sidebar.workspaces.session.menu.item'
let descriptionSequence = 0

/** Persist a separate reminder; the host retains ownership of automatic completion-unread state. */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  let disposed = false
  const changed = () => { if (disposed === false) ui.schedule?.() }
  const rows = observeMatches<HTMLElement>(`${SIDEBAR_SLOT_SELECTOR} [data-dsh-claude-part~="session-row"]`, changed)
  const marks = new Map<HTMLElement, UnreadRowMark>()
  const tracker = createUnreadVisitTracker()
  const toast = createHostToast()
  const description = document.createElement('span')
  description.id = `dsh-claude-manual-unread-description-${++descriptionSequence}`
  description.className = 'dsh-claude-manual-unread-description'
  description.textContent = copy('description')
  document.body.append(description)
  let navigationOff: (() => void) | null = null
  let sessionsOff: (() => void) | null = null
  let watchedRoot: HTMLElement | null = null
  let stopWatch: (() => void) | null = null
  let pendingVisit: string | null = null
  let hasSessionBaseline = false

  const writer = createUnreadWriter(() => readPrefs().manualUnreadIds, async (ids) => {
    const accepted = await savePrefs({ manualUnreadIds: ids })
    return accepted === null ? null : accepted.manualUnreadIds
  })

  function failed() {
    // A refused write keeps its stored mark and reports the failure at the action.
    if (disposed === false) toast.show({ text: copy('saveFailed') })
  }

  function navigation() {
    let target: string | null = null
    for (const row of rows.all()) if (row.getAttribute('aria-selected') === 'true') {
      target = unreadRowSessionId(row)
      if (target) break
    }
    const value = currentSessionId(ctx)
    const materialized = typeof value === 'string' && value.length > 0 ? value : null
    return { target, materialized }
  }

  function activity(target: EventTarget | null) {
    // Incidental input before initial restoration is not a session visit.
    if (hasSessionBaseline === false) {
      if (!(target instanceof Element) || target.closest('button, input, textarea, select, [role="menuitem"]')) return
      const row = target.closest<HTMLElement>('[data-dsh-claude-part~="session-row"]')
      if (row === null || rows.all().includes(row) === false || unreadRowSessionId(row) === null) return
    }
    tracker.activity()
  }

  function changeMark(id: string, unread: boolean) {
    const { target, materialized } = navigation()
    if (target === id || materialized === id) tracker.baseline(id)
    if (pendingVisit === id) pendingVisit = null
    void writer.set(id, unread).catch(failed)
  }

  function ManualUnreadMenuItem(props: HostSessionMenuProps) {
    const values = React.useSyncExternalStore(subscribePrefs, readPrefs)
    const pending = React.useSyncExternalStore(writer.subscribe, writer.pending)
    const openState = typeof props.useMenuOpenState === 'function' ? props.useMenuOpenState() : null
    const unread = values.manualUnreadIds.includes(props.sessionId)
    return React.createElement(primitives.MenuItemButton, {
      icon: unread
        ? React.createElement(primitives.IconCheckOutlineRegular, { size: 14 })
        : React.createElement('span', { className: 'dsh-claude-manual-unread-icon', 'aria-hidden': 'true' }),
      disabled: pending > 0 || prefsFromForm() === false || openState === null,
      onSelect: () => {
        openState?.[1](false)
        changeMark(props.sessionId, unread === false)
      },
      children: copy(unread ? 'clearUnread' : 'markUnread'),
    })
  }

  const menu = registerSlotEntries(ctx, [{
    options: { name: MENU_SLOT, id: 'claude-style-manual-unread', order: 150 },
    component: ManualUnreadMenuItem,
  }], 'dsh-claude-style: manual unread menu')

  function sync() {
    if (sessionsOff === null) {
      const sessions = hostSessions(ctx)
      if (sessions !== null) sessionsOff = sessions.list.subscribe(changed)
    }
    if (navigationOff === null) {
      const source = hostUiSession(ctx)?.current
      if (typeof source?.subscribe === 'function') navigationOff = source.subscribe(changed)
    }
    const root = findSidebarRoot()
    if (root !== watchedRoot) {
      stopWatch?.()
      watchedRoot = root
      stopWatch = root === null ? null : subscribeMutations(root, {
        subtree: true, attributeFilter: ['aria-selected', SESSION_ROW_KEY_ATTRIBUTE],
      }, changed)
    }
    const { target, materialized } = navigation()
    // A row and binding disagree during navigation; only a settled empty view means home.
    const transitioning = target !== null && target !== materialized
    const current = target ?? materialized
    if (transitioning === false) {
      if (current !== null) hasSessionBaseline = true
      const visited = tracker.observe(current)
      if (visited) pendingVisit = visited
      if (pendingVisit && current === pendingVisit && prefsFromForm()) {
        const state = hostSessions(ctx)?.binding(pendingVisit)?.session?.getSnapshot?.()
        if (state?.openState === 'open') {
          const id = pendingVisit
          pendingVisit = null
          void writer.set(id, false).catch(failed)
        }
      }
    }
    const unread = new Set(readPrefs().manualUnreadIds)
    const visible = new Set<HTMLElement>()
    for (const row of rows.all()) {
      const id = unreadRowSessionId(row)
      if (id === null || unread.has(id) === false) continue
      visible.add(row)
      let mark = marks.get(row)
      if (mark === undefined) { mark = new UnreadRowMark(row, description.id); marks.set(row, mark) }
      mark.update(true)
    }
    for (const [row, mark] of marks) if (visible.has(row) === false) { mark.dispose(); marks.delete(row) }
  }

  function teardown() {
    disposed = true
    navigationOff?.()
    sessionsOff?.()
    stopWatch?.()
    rows.release()
    menu?.dispose()
    writer.dispose()
    for (const mark of marks.values()) mark.dispose()
    marks.clear()
    description.remove()
    toast.dispose()
  }

  ui.manualUnread = {
    sync,
    skipOnContentOnly: true,
    onPointerDown: activity,
    onKey: (event) => {
      if (hasSessionBaseline || ['Enter', ' ', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) activity(event.target)
    },
    onCopyChange() { writeTextInPlace(description, copy('description')); changed() },
    teardown,
  }
  return teardown
}
