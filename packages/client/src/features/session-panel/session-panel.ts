/**
 * The conversation's details rail (D94): the session overview beside the chat.
 *
 * The rail is the skin's own column rather than a page in the host's right
 * sidebar. The install mounts it once into a container of its own on the body;
 * the component places itself against the conversation column's edge and opens
 * and retreats with that column's width. The data comes from the host half's own
 * route (packages/host/src/session-panel.ts); this module holds the wiring
 * between that seat and the component.
 */
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { SessionPanelRail } from './session-panel-rail'
import { SessionPanelButton } from './session-panel-button'
import { copy } from './copy'
import { registerSlotEntries } from '@dsh-claude-style/engine/host'
import { clearPanelContext, setPanelContext } from './session-panel-host'
import type { HostContext } from '@dsh-claude-style/engine/host'

export function install(ctx: HostContext) {
  setPanelContext(ctx)
  // The header's control joins the conversation's utilities; a host without
  // that seat keeps the rail's own close control.
  const fiber = registerSlotEntries(ctx, [{
    options: {
      name: 'conversation.session.header.utilities',
      id: 'claude-style-session-panel',
      order: 85,
      label() { return copy('detailsToggle') },
    },
    component: SessionPanelButton,
  }], 'dsh-claude-style: details control')
  const container = document.createElement('div')
  container.className = 'dsh-claude-details-root'
  document.body.append(container)
  const root = createRoot(container)
  root.render(React.createElement(SessionPanelRail))
  return () => {
    root.unmount()
    container.remove()
    clearPanelContext(ctx)
    if (fiber !== null && fiber !== undefined && typeof fiber.dispose === 'function') fiber.dispose()
  }
}
