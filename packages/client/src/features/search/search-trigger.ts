import * as React from 'react'
import { SEARCH_STYLE_ICON } from '../../constants'
import { hostLayout, registerSlotEntries } from '@dsh-claude-style/engine/host'
import { readPrefs } from '../../core/prefs'
import type { HostContext, HostFiber } from '@dsh-claude-style/engine/host'
import { copy } from './copy'

const SEARCH_PANEL_ID = 'dsh-claude-style.search'

/**
 * The host-owned sidebar entry and its main-panel target. Selecting the row
 * opens the palette and restores the previous panel before the browser paints.
 * The `icon` style leaves the host's own workspace search in place instead.
 */
export function createSearchTrigger(ctx: HostContext, options: { open(): void }) {
  const layout = hostLayout(ctx)
  let slotFiber: HostFiber | null = null
  let selectedPanel = layout?.panelInfo.getSnapshot().activePanelId ?? null
  let previousPanel: string | null = null

  function SearchIcon(props: { size?: number }) {
    const size = props.size ?? 16
    return React.createElement('svg', {
      className: 'dsh-claude-search-trigger-icon',
      width: size,
      height: size,
      viewBox: '0 0 16 16',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.3,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': true,
    },
    React.createElement('circle', { cx: 7, cy: 7, r: 4.5 }),
    React.createElement('path', { d: 'M10.4 10.4 13.5 13.5' }))
  }

  function SearchPanel() {
    React.useLayoutEffect(() => {
      options.open()
      leavePanel()
    }, [])
    return null
  }

  const unsubscribe = layout?.panelInfo.subscribe(() => {
    const active = layout.panelInfo.getSnapshot().activePanelId as string | null
    if (active === SEARCH_PANEL_ID && selectedPanel !== SEARCH_PANEL_ID) previousPanel = selectedPanel
    selectedPanel = active
  }) as (() => void) | undefined

  /** Return only while the search target still owns the main column. */
  function leavePanel() {
    if (layout?.panelInfo.getSnapshot().activePanelId !== SEARCH_PANEL_ID) return
    layout.selectPanel(previousPanel)
  }

  function dropSlots() {
    if (slotFiber !== null) {
      slotFiber.dispose()
      slotFiber = null
    }
    leavePanel()
  }

  function sync() {
    if (readPrefs().searchStyle === SEARCH_STYLE_ICON) {
      dropSlots()
      return
    }
    if (slotFiber !== null) return
    slotFiber = registerSlotEntries(ctx, [
      {
        options: {
          name: 'sidebar.panellist',
          id: SEARCH_PANEL_ID,
          order: -1,
          label: () => copy('searchPlaceholder'),
        },
        component: SearchIcon,
      },
      {
        options: { name: 'main', key: SEARCH_PANEL_ID },
        component: SearchPanel,
      },
    ], 'dsh-claude-style: sidebar search')
  }

  return {
    sync,
    leave: leavePanel,
    drop() {
      dropSlots()
      if (typeof unsubscribe === 'function') unsubscribe()
    },
  }
}
