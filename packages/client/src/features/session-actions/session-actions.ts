import { installSessionContextMenu } from './context-menu'

/** Preserve the host's native menu commands, placement and keyboard handling. */
export function install() {
  return installSessionContextMenu()
}
