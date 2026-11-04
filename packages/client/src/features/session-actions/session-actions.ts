import { installSessionContextMenu } from './context-menu'

/**
 * The row's own menu, opened by a right click or a menu key. The host's native
 * commands, popup placement and keyboard handling stay, and the inline archive
 * and pin buttons keep the place the host gives them.
 */
export function install() {
  return installSessionContextMenu()
}
