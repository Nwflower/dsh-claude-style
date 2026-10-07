import { UNTAGGED_SHEET_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { STYLESHEET } from 'virtual:dsh-claude-style/generated'
import { FOREIGN_SHEET_TAG, PACKAGE_NAME, STYLE_ID, STYLE_PLUGIN_CSS } from '../constants'

/** The generation whose stylesheet is mounted; 0 before the first mount. */
let sheetGeneration = 0

/**
 * Park a sibling's untagged stylesheet so no package's bookkeeping can take it.
 *
 * The client module system claims every untagged `<style>` in the document
 * for the package whose factory has just materialized (`claimStyles`, reading
 * `style:not([data-plugin])`), and that package's next reload removes every
 * tag carrying its id (`removeOwnedStyles`). A sibling that mounts its sheet
 * from `apply()` — after its own materialization — leaves it untagged, so the
 * next package to materialize would take it into custody and delete it at
 * that package's next reload, stripping the sibling's rules off a page that
 * keeps running. Every untagged sheet that is not this package's own is
 * therefore parked under a resting tag: the tag carries a slash, can never
 * equal a package name, and matches no removal step, so the sibling keeps its
 * sheet — and its own teardown still removes that sheet by reference when its
 * generation ends. Two moments call this, because a sweep never waits for the
 * skin: the module scope of packages/client/src/entry.ts, the only code of ours that runs
 * before the sweep of our own materialization, and the head watch, which sees
 * a sheet arriving after it.
 */
export function parkForeignSheets() {
  const untagged = document.querySelectorAll<HTMLStyleElement>(UNTAGGED_SHEET_SELECTOR)
  for (const el of untagged) {
    if (el.id !== STYLE_ID) el.dataset.plugin = FOREIGN_SHEET_TAG
  }
}

/**
 * Mount the skin's stylesheet, once per generation.
 *
 * The sheet wears this package's own `data-plugin` and its own
 * `data-plugin-css` from the moment it exists — the claim sweep reads
 * untagged tags alone — so no sibling package's bookkeeping can take it, and
 * it is refreshed in place rather than replaced, so a stale generation's
 * stop can never take a newer generation's sheet away (D33).
 *
 * @returns this generation's stop function: it unmounts the sheet unless a
 *          newer generation mounted after it.
 */
export function mountStylesheet() {
  const generation = ++sheetGeneration
  let sheet = document.getElementById(STYLE_ID)
  if (sheet === null) {
    sheet = document.createElement('style')
    sheet.id = STYLE_ID
    document.head.appendChild(sheet)
  }
  sheet.dataset.plugin = PACKAGE_NAME
  sheet.dataset.pluginCss = STYLE_PLUGIN_CSS
  sheet.dataset.skinChrome = STYLE_ID
  if (sheet.textContent !== STYLESHEET) sheet.textContent = STYLESHEET
  return () => {
    if (sheetGeneration === generation) sheet.remove()
  }
}
