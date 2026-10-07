import { CHAT_REVEAL_ATTR } from '../../constants'
import { motionReduced, readPrefs, subscribePrefs } from '../../core/prefs'
import { createChatRevealEngine } from './reveal-engine'
import { dshChatUxPresent } from '../../shared/peer-plugin'
import type { HostContext } from '../../core/host'
import type { Ui } from '../../core/scheduler'

/**
 * The token reveal's installer, ported from dsh-chat-ux: new characters fade
 * in, and the preference installs and withdraws the whole engine.
 *
 * With the preference off nothing at all is installed — no step rules, no
 * scan observer, no paint frames — so the page shows no trace of this feature
 * anywhere; switching it back on installs it as it was. The engine's own
 * prerequisite (the Custom Highlight API) is handled inside it, and the
 * animation choice is read here so a running engine is taken down with it
 * (D26): what comes back from the engine is null, and the mark the
 * stylesheet reads is not written either.
 *
 * @param ctx - client context.
 * @param ui - shared handle table.
 * @returns teardown.
 */
export function installChatReveal(ctx: HostContext, ui: Ui) {
  /** The running engine, or null while it is off or cannot be drawn. */
  let engine: (() => void) | null = null

  /** Bring the engine in line with the preference, the animation choice and the other plugin. No reload, no pass of its own. */
  const applyReveal = () => {
    // dsh-chat-ux registers its own step highlights over the same text; the
    // two sets do not merge, they stack (src/shared/peer-plugin.ts). The
    // animation choice is read here rather than inside the engine: a change
    // to it has to take an engine that is already running down with it
    // (D26).
    if (!dshChatUxPresent() && readPrefs().chatAnimations !== false && !motionReduced()) {
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
