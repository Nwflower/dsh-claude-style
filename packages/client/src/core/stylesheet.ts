import { UNTAGGED_SHEET_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { adoptPartClasses, finishSheet, onPartClasses } from '@dsh-claude-style/engine/part-classes'
import type { SheetTemplate } from '@dsh-claude-style/engine/part-classes'
import { mountStylesheet as mountSheet, parkForeignSheets as parkSheets, rewriteStylesheet } from '@dsh-claude-style/engine/stylesheet'
import { STYLESHEET } from 'virtual:dsh-claude-style/generated'
import { ABSENT_NAME, ACCOUNT_MENU_ATTR, FOREIGN_SHEET_TAG, HERO_MENU_ATTR, MORE_MENU_ATTR, PACKAGE_NAME, PART_ATTR, STAMPED_PARTS, STAMPED_PART_ATTR, STYLE_ID, STYLE_PLUGIN_CSS } from '../constants'

/** Sibling sheets must be parked before the host's claim sweep and whenever one arrives later (D9). */
export function parkForeignSheets() {
  parkSheets(UNTAGGED_SHEET_SELECTOR, STYLE_ID, FOREIGN_SHEET_TAG)
}

/** Whether this bundle has handed its vocabulary over. */
let handedOver = false

/**
 * Hand the engine the vocabulary a template is finished in (D101, D73), once.
 * The entry does this before the marking pass's first walk, so the host class
 * names that walk meets are known when the sheet is mounted; a sheet mounted
 * on a page the theme has not taken does it for itself.
 */
export function adoptPartVocabulary() {
  if (handedOver) return
  handedOver = true
  adoptPartClasses({
    part: PART_ATTR,
    regions: { account: ACCOUNT_MENU_ATTR, hero: HERO_MENU_ATTR, more: MORE_MENU_ATTR },
    absent: ABSENT_NAME,
    stamp: STAMPED_PART_ATTR,
    stamped: STAMPED_PARTS,
  })
}

/** The templates standing on the page, by sheet id, each with the text it was last finished as. */
const templates = new Map<string, { template: SheetTemplate, text: string }>()
/** Stops hearing about new class names; set while a template stands. */
let stopClasses: (() => void) | null = null

/** Finish every standing template again: the marking pass met a class name the page had not shown (D101). */
function refinish() {
  for (const [id, standing] of templates) {
    const text = finishSheet(standing.template)
    if (rewriteStylesheet(id, standing.text, text)) standing.text = text
  }
}

/**
 * Mount one of this package's sheets. A template the build left open is
 * finished with the host class names the page shows, and again whenever a new
 * one arrives (D101); plain text is mounted as it is. Surface sheets use a
 * separate id so they survive ds-bot's page ownership (D74).
 */
export function mountStylesheet(id = STYLE_ID, sheet: SheetTemplate | string = STYLESHEET, pluginCss = STYLE_PLUGIN_CSS) {
  if (typeof sheet === 'string') return mountSheet({ id, text: sheet, packageName: PACKAGE_NAME, pluginCss })
  adoptPartVocabulary()
  const standing = { template: sheet, text: finishSheet(sheet) }
  templates.set(id, standing)
  if (stopClasses === null) stopClasses = onPartClasses(refinish)
  const stop = mountSheet({ id, text: standing.text, packageName: PACKAGE_NAME, pluginCss })
  return () => {
    stop()
    if (templates.get(id) === standing) templates.delete(id)
    if (templates.size > 0 || stopClasses === null) return
    stopClasses()
    stopClasses = null
  }
}
