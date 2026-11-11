import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { copy } from './copy'
import { railOpen, subscribeRail, toggleRail } from './session-panel-state'

/**
 * The header's own control for the details rail (D94).
 *
 * The rail opens itself when the conversation column is wide enough; this
 * control puts it away, or brings it back in a frame too narrow for the auto
 * rule. It wears the host's ghost button, as the header's other icon buttons
 * do, and carries the rail's open state on `aria-pressed`.
 */
export function SessionPanelButton() {
  const label = copy('detailsToggle')
  const open = React.useSyncExternalStore(subscribeRail, railOpen, railOpen)
  return React.createElement(primitives.Tooltip, {
    label,
    side: 'bottom',
    delayMs: 500,
    // The tooltip's child is typed as an anchor element, while the host's
    // forward-ref button carries a LegacyRef; the tooltip clones the element it
    // is handed either way.
    children: React.createElement(primitives.Button, {
      variant: 'ghost',
      size: 'sm',
      className: 'dsh-claude-session-panel-button',
      'aria-label': label,
      'aria-pressed': open ? 'true' : 'false',
      icon: React.createElement(primitives.IconFlatListOutlineRegular, { size: 16 }),
      onClick() { toggleRail() },
    }) as unknown as React.ReactElement,
  })
}
