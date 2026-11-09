/** Mount owned sheets and protect siblings from host stylesheet bookkeeping (D9). */

/** The generation whose copy of each sheet is mounted, by the sheet's element id. */
const mountedGenerations = new Map<string, number>()
/** The last generation handed out, across the sheets. */
let lastGeneration = 0

/** One sheet, as the package that owns it mounts it. */
export interface SheetRequest {
  /** The `<style>` element's id. */
  id: string
  /** The sheet's text. */
  text: string
  /** The package's own name, as its bookkeeping spells it. */
  packageName: string
  /** The sheet's key in the client module system's bookkeeping. */
  pluginCss: string
}

/**
 * The loader claims untagged sheets for the materializing package and later removes claimed tags.
 * Park siblings under a slash-containing non-package tag so their sheets survive another package's reload.
 */
export function parkForeignSheets(untaggedSelector: string, styleId: string, foreignTag: string) {
  const untagged = document.querySelectorAll<HTMLStyleElement>(untaggedSelector)
  for (const el of untagged) {
    if (el.id !== styleId) el.dataset.plugin = foreignTag
  }
}

/**
 * Tag sheets before the host claim sweep and update them in place (D9, D74).
 * The returned stop removes only its own generation, never a newer mount.
 */
export function mountStylesheet(request: SheetRequest) {
  const { id, text, packageName, pluginCss } = request
  const generation = ++lastGeneration
  mountedGenerations.set(id, generation)
  let sheet = document.getElementById(id)
  if (sheet === null) {
    sheet = document.createElement('style')
    sheet.id = id
    document.head.appendChild(sheet)
  }
  sheet.dataset.plugin = packageName
  sheet.dataset.pluginCss = pluginCss
  sheet.dataset.skinChrome = id
  if (sheet.textContent !== text) sheet.textContent = text
  return () => {
    if (mountedGenerations.get(id) === generation) sheet.remove()
  }
}
