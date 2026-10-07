import { SKIN_STAMP_ATTR } from '../constants'
import { subscribeMutations } from '../core/bus'

/**
 * Whether a skin owns this page right now: the skin center stamps
 * `html[data-dsh-skin]` while a skin is painting, and injects it into the
 * served document, so the answer holds from the first frame (D49).
 *
 * The skin center does not stamp its attribute for this theme's own row:
 * selecting this theme means the page has no skin on it, which is what
 * leaves the page free for the theme to take. A wallpaper plugin is not an
 * owner: it paints behind the shell, and the theme shares the page with it.
 */
export function externalOwnerActive() {
  return document.documentElement.hasAttribute(SKIN_STAMP_ATTR)
}

/**
 * Watch the skin stamp, and hear when a skin arrives or leaves.
 *
 * The attribute is read; nothing is written. The callback fires only on a
 * real flip: the caller reads `externalOwnerActive()` itself at boot.
 *
 * @param listener - called with the new answer.
 * @returns unsubscribe.
 */
export function subscribeExternalOwner(listener: (active: boolean) => void) {
  let last = externalOwnerActive()
  return subscribeMutations(document.documentElement, { attributeFilter: [SKIN_STAMP_ATTR] }, () => {
    const next = externalOwnerActive()
    if (next === last) return
    last = next
    listener(next)
  })
}
