import { SKIN_STAMP_ATTR } from '../constants'

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
 * real flip: the caller reads `externalOwnerActive()` itself at boot. The
 * observer is an exception to the single-scheduler rule (D40): it waits on an
 * attribute of the document element, outside this package's own subtree.
 *
 * @param listener - called with the new answer.
 * @returns unsubscribe.
 */
export function subscribeExternalOwner(listener: (active: boolean) => void) {
  let last = externalOwnerActive()
  const observer = new MutationObserver(() => {
    const next = externalOwnerActive()
    if (next === last) return
    last = next
    listener(next)
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: [SKIN_STAMP_ATTR] })
  return () => observer.disconnect()
}
