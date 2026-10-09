import { CHAT_PROCESS_ATTR } from '../../constants'
import { subscribeMutations } from '../../core/bus'
import { startProcessLane, syncProcessLane } from './process-lane'
import { startReasoningOpen, syncReasoningOpen } from './reasoning-open'
import { startStreamFollow } from './stream-follow'
import { stopStreamReveal, syncStreamReveal } from './stream-reveal'
import { stopStatusSwap, syncStatusSwap } from './status-swap'
import { stopThinkFollows } from './think-follow'
import type { HostContext } from '../../core/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './chat-process.manifest'

/**
 * The process lane's installer (D55): the redraw tier's presentation of a
 * turn's process.
 *
 * The entry installs this only while the reader picked "redraw" for the chat
 * area's animations and dsh-chat-ux is off the page (the manifest); uninstalled,
 * every mark comes off and the process area is the host's own again. The body
 * mark is what the stylesheet's lane rules hang off, so a switched-off feature
 * leaves no rule behind.
 *
 * The lane needs its own subscription on top of the scheduler's passes: the
 * reader opening or closing a turn changes the host's `hidden` and
 * `aria-expanded` attributes and nothing else, and the scheduler's observer
 * carries neither, so without this the lane would only ever run while content
 * streams.
 *
 * @param ctx - client context.
 * @param ui - shared handle table.
 * @returns teardown.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  document.body.setAttribute(CHAT_PROCESS_ATTR, '')
  const stopLane = startProcessLane()
  const stopReasoning = startReasoningOpen()
  const follow = startStreamFollow()
  const stopMutations = subscribeMutations(document.body, {
    subtree: true,
    childList: true,
    attributeFilter: ['hidden', 'aria-expanded', 'data-state', 'data-expanded'],
    skipQuiet: true,
  }, () => { ui.schedule?.() })
  ui.chatProcess = {
    sync: () => {
      syncProcessLane()
      // The answer's own entrance, the status line's swap and the tier's tail
      // follow ride the same pass as the lanes: one walk of the page, four
      // pieces of work (D56).
      syncReasoningOpen()
      syncStreamReveal()
      syncStatusSwap()
      follow.sync()
    },
  }
  return () => {
    delete ui.chatProcess
    stopMutations()
    stopLane()
    stopReasoning()
    follow.stop()
    stopStreamReveal()
    stopStatusSwap()
    stopThinkFollows()
    document.body.removeAttribute(CHAT_PROCESS_ATTR)
  }
}
