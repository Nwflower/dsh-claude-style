import { CHAT_REVEAL_ATTR } from '../../constants'
import { keepMotionEngine } from '../../shared/motion-engine'
import { createChatRevealEngine } from './reveal-engine'
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
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  return keepMotionEngine(CHAT_REVEAL_ATTR, createChatRevealEngine)
}
