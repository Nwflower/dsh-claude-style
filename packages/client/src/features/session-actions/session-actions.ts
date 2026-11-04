import { registerSlotEntries } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import { installSessionContextMenu } from './context-menu'

/** Shadow only native shortcut cells; menu commands and unrelated row actions remain owned by their plugins. */
export function install(ctx: HostContext) {
  const shortcuts = registerSlotEntries(ctx, ['archive', 'pin'].map(id => ({
    options: { name: 'sidebar.workspaces.session.row.action', id, priority: -1 },
    component: () => null,
  })), 'dsh-claude-style: menu-only session actions')
  const stop = installSessionContextMenu()
  return () => { stop(); shortcuts?.dispose?.() }
}
