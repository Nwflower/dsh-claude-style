import { CHAT_REVEAL_ATTR, REVEAL_PLUGIN_CSS, REVEAL_STYLE_ID } from '../../constants'
import { mountStylesheet } from '../../core/stylesheet'
import { keepMotionEngine } from '../../shared/motion-engine'
import { createChatRevealEngine } from './reveal-engine'
import { FEATURE_STYLESHEETS } from 'virtual:dsh-claude-style/generated'
import type { HostContext } from '@dsh-claude-style/engine/host'
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
 * API) is handled inside it, and the animation choice is read by the shared
 * installer so a running engine is taken down with it (D40): what comes back
 * from the engine is null where the fade cannot be drawn, and the mark the
 * stylesheet reads is not written either.
 *
 * The step rules are mounted with the engine and go when it goes (D108): they
 * are the one part of the skin whose rules the browser re-matches over every
 * element of a streaming answer, so a page that shows no fade carries none.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const steps = FEATURE_STYLESHEETS['reveal-steps']
  if (steps === undefined) throw new Error('the build shipped no reveal step rules (D108)')
  return keepMotionEngine(CHAT_REVEAL_ATTR, () => {
    const stopSheet = mountStylesheet(REVEAL_STYLE_ID, steps, REVEAL_PLUGIN_CSS)
    const stopEngine = createChatRevealEngine()
    if (stopEngine === null) {
      stopSheet()
      return null
    }
    return () => {
      stopEngine()
      stopSheet()
    }
  })
}
