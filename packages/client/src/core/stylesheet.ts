import { UNTAGGED_SHEET_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { mountStylesheet as mountSheet, parkForeignSheets as parkSheets } from '@dsh-claude-style/engine/stylesheet'
import { STYLESHEET } from 'virtual:dsh-claude-style/generated'
import { FOREIGN_SHEET_TAG, PACKAGE_NAME, STYLE_ID, STYLE_PLUGIN_CSS } from '../constants'

/** Sibling sheets must be parked before the host's claim sweep and whenever one arrives later (D9). */
export function parkForeignSheets() {
  parkSheets(UNTAGGED_SHEET_SELECTOR, STYLE_ID, FOREIGN_SHEET_TAG)
}

/** Surface sheets use a separate id so they survive ds-bot's page ownership (D74). */
export function mountStylesheet(id = STYLE_ID, text = STYLESHEET, pluginCss = STYLE_PLUGIN_CSS) {
  return mountSheet({ id, text, packageName: PACKAGE_NAME, pluginCss })
}
