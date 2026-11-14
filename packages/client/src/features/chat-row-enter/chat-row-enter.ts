import { CHAT_ROW_ENTER_ATTR } from '../../constants'
import { keepMotionEngine } from '../../shared/motion-engine'
import { createRowEnter } from './row-enter'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './chat-row-enter.manifest'

/**
 * The entrance of a turn's process rows — a tool call, a thought, a context
 * injection — as the live turn writes them (row-enter.ts).
 *
 * Installed only while the chat animations are on and the page is not asked to
 * hold still: under the Reduced choice there is no entrance to play, so the
 * engine is taken down with the choice and the stylesheet's rule stops matching
 * with the attribute the engine carries (shared/motion-engine.ts).
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  return keepMotionEngine(CHAT_ROW_ENTER_ATTR, createRowEnter)
}
