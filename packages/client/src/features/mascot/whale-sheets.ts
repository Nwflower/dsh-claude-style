import { DEEPY_SHEET_URLS } from 'virtual:dsh-claude-style/generated'

/**
 * Deepy's sheets, as the addresses the sprite paints from.
 *
 * Each sheet is the vector the build produced (packages/assets/assets.mjs, D38), served
 * by the host half under the assets route and named after its own content, so
 * the browser fetches a sheet once and caches it for good. Nothing is converted
 * here: the first time an animation is wanted its image is decoded ahead of the
 * frame that paints it, and a sheet that does not arrive leaves its animation
 * out and says so once — the host half serves the sheets, so a host that
 * predates the plugin's build answers 404.
 *
 * @param onReady - `onReady(key)`: a sheet became playable; the caller reads the
 *     state again and plays what it asks for.
 * @returns `{ ready, failed, url, dispose }`.
 */
export function createMascotWhaleSheets(onReady: (key: string) => void) {
  /** Sheet key → 'loading' | 'ready' | 'failed'. */
  const sheets = new Map<string, 'loading' | 'ready' | 'failed'>()
  /** False once disposed: a load landing after the whale left is dropped. */
  let alive = true

  /**
   * Whether a sheet is ready to paint, starting its load the first time.
   * @param key - the animation.
   */
  function ready(key: string) {
    const known = sheets.get(key)
    if (known !== undefined) return known === 'ready'
    const address = DEEPY_SHEET_URLS[key]
    // The table and the sheets are one list; a name outside it is a bug here.
    if (address === undefined) throw new Error(`dsh-claude-style: no sheet for "${key}"`)
    sheets.set(key, 'loading')
    const image = new Image()
    image.src = address
    const settle = (ok: boolean) => {
      if (sheets.get(key) !== 'loading') return
      sheets.set(key, ok ? 'ready' : 'failed')
      if (ok && alive) onReady(key)
      if (!ok) console.warn(`[dsh-claude-style] Deepy's "${key}" sheet did not load from ${address}; the host half serves it, so restart the host after an update.`)
    }
    image.decode().then(() => settle(true), () => settle(false))
    return false
  }

  /** Whether a sheet's load already failed: an animation that will never come. */
  function failed(key: string) {
    return sheets.get(key) === 'failed'
  }

  /** The address a ready sheet plays from. */
  function url(key: string) {
    return DEEPY_SHEET_URLS[key]
  }

  function dispose() {
    alive = false
    sheets.clear()
  }

  return { ready, failed, url, dispose }
}
