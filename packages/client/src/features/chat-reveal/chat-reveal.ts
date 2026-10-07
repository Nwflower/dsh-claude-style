import { CHAT_REVEAL_ATTR } from '../../constants'
import { motionReduced, subscribePrefs } from '../../core/prefs'
import { createChatRevealEngine } from './reveal-engine'
import type { HostContext } from '../../core/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './chat-reveal.manifest'

/**
 * The token reveal's installer, ported from dsh-chat-ux: new characters fade
 * in.
 *
 * The entry installs this only while the preference is on and dsh-chat-ux,
 * whose step highlights over the same text would stack with these, is off the
 * page (the manifest); uninstalled, there are no step rules, no scan observer
 * and no paint frames. The engine's own prerequisite (the Custom Highlight
 * API) is handled inside it, and the animation choice is read here so a
 * running engine is taken down with it (D26): what comes back from the engine
 * is null, and the mark the stylesheet reads is not written either.
 *
 * @param ctx - client context.
 * @param ui - shared handle table.
 * @returns teardown.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  /** The running engine, or null while the animation choice holds it still or it cannot be drawn. */
  let engine: (() => void) | null = null

  /** Bring the engine in line with the animation choice. No reload, no pass of its own. */
  const applyReveal = () => {
    if (!motionReduced()) {
      if (engine !== null) return
      engine = createChatRevealEngine()
      if (engine !== null) document.body.setAttribute(CHAT_REVEAL_ATTR, '')
      return
    }
    document.body.removeAttribute(CHAT_REVEAL_ATTR)
    if (engine === null) return
    engine()
    engine = null
  }
  applyReveal()
  const stopPrefs = subscribePrefs(applyReveal)
  return () => {
    stopPrefs()
    document.body.removeAttribute(CHAT_REVEAL_ATTR)
    if (engine === null) return
    engine()
    engine = null
  }
}
