import { FRAME_TOP_CLEARANCE_PROPERTY, FULLSCREEN_ATTRIBUTE, WINDOWS_TITLEBAR_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'

/** Resolve native caption geometry once per platform; computed style resolves Windows' aliased height token. */

/** macOS: the clearance the traffic lights need, read off the host's own leading seat. */
const MAC_TRAFFIC_LIGHTS = 88
/** macOS: the strip height the host declares, used when the token is absent. */
const MAC_BAND_HEIGHT = 48
/** Windows: the three caption buttons at their standard size, used when the overlay cannot measure them. */
const WIN_CAPTION_CONTROLS = 140
/** Windows: the strip height the host declares, used when the token is absent. */
const WIN_BAND_HEIGHT = 40

/** Read the shared host clearance token through computed style to resolve platform aliases. */
function bandHeight(fallback: number) {
  const declared = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(FRAME_TOP_CLEARANCE_PROPERTY))
  return isFinite(declared) && declared > 0 ? Math.round(declared) : fallback
}

/** The preload's Windows-only mark identifies the window regardless of fullscreen state. */
export function windowsDesktop() {
  return document.documentElement.hasAttribute(WINDOWS_TITLEBAR_ATTRIBUTE)
}

/**
 * Windows uses overlay visibility and right-side controls; macOS uses 88px left clearance.
 * Fullscreen macOS has no strip; Windows ignores `data-fullscreen` and follows overlay visibility.
 */
export function desktopBand() {
  const root = document.documentElement
  if (windowsDesktop()) {
    const overlay = navigator.windowControlsOverlay
    if (!overlay || overlay.visible !== true) return null
    const rect = typeof overlay.getTitlebarAreaRect === 'function' ? overlay.getTitlebarAreaRect() : null
    if (rect && rect.width > 0 && rect.height > 0) {
      return {
        platform: 'win32',
        height: Math.round(rect.height),
        controls: { side: 'right', size: Math.max(0, Math.round(window.innerWidth - rect.right)) },
      }
    }
    // The API is present and visible with no measurement yet: the declared
    // caption height, and Windows' three caption buttons at their standard
    // size.
    return {
      platform: 'win32',
      height: bandHeight(WIN_BAND_HEIGHT),
      controls: { side: 'right', size: WIN_CAPTION_CONTROLS },
    }
  }
  if (root.dataset.platform === 'darwin') {
    if (root.hasAttribute(FULLSCREEN_ATTRIBUTE)) return null
    return {
      platform: 'darwin',
      height: bandHeight(MAC_BAND_HEIGHT),
      controls: { side: 'left', size: MAC_TRAFFIC_LIGHTS },
    }
  }
  return null
}
