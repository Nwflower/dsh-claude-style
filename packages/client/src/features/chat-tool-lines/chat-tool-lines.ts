import { CHAT_TOOL_LINES_ATTR } from '../../constants'
import { keepMotionEngine } from '../../shared/motion-engine'
import { createToolLineReveal } from './tool-line-reveal'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './chat-tool-lines.manifest'

/**
 * The arrival of a tool body's output rows: a body the reader opens sweeps from
 * its first row, two rows at a time, and a line streaming in on its own is drawn
 * at once. A conversation the page mounts by itself is never replayed
 * (tool-line-reveal.ts).
 *
 * Installed only while the chat animations are on and the page is not asked to
 * hold still: under the Reduced choice there is no arrival to play, so the
 * engine is taken down with the choice and the stylesheet's rule stops matching
 * with the attribute the engine carries (shared/motion-engine.ts).
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  return keepMotionEngine(CHAT_TOOL_LINES_ATTR, createToolLineReveal)
}
