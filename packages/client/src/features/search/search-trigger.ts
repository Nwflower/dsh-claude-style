import * as React from 'react'
import { SEARCH_STYLE_ICON } from '../../constants'
import { registerSlotEntries } from '@dsh-claude-style/engine/host'
import { readPrefs } from '../../core/prefs'
import type { HostContext, HostFiber } from '@dsh-claude-style/engine/host'
import { copy } from './copy'

const SEARCH_PANEL_ID = 'dsh-claude-style.search'

/**
 * The host-owned sidebar entry. Its click opens the palette without selecting
 * a main panel; the `icon` style leaves the host's workspace search in place.
 */
export function createSearchTrigger(ctx: HostContext, options: { open(): void }) {
  let slotFiber: HostFiber | null = null

  function SearchIcon(props: { size?: number }) {
    const icon = React.useRef<SVGSVGElement | null>(null)
    React.useLayoutEffect(() => {
      const button = icon.current?.closest('button')
      if (!button) return
      const open = (event: MouseEvent) => {
        event.preventDefault()
        // The panel-list owner navigates on click; search is a palette action.
        event.stopImmediatePropagation()
        options.open()
      }
      button.addEventListener('click', open, true)
      return () => button.removeEventListener('click', open, true)
    }, [])
    const size = props.size ?? 16
    return React.createElement('svg', {
      ref: icon,
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

  function dropSlots() {
    if (slotFiber === null) return
    slotFiber.dispose()
    slotFiber = null
  }

  function sync() {
    if (readPrefs().searchStyle === SEARCH_STYLE_ICON) {
      dropSlots()
      return
    }
    if (slotFiber !== null) return
    slotFiber = registerSlotEntries(ctx, [{
      options: {
        name: 'sidebar.panellist',
        id: SEARCH_PANEL_ID,
        order: -1,
        label: () => copy('searchPlaceholder'),
      },
      component: SearchIcon,
    }], 'dsh-claude-style: sidebar search')
  }

  return { sync, drop: dropSlots }
}
