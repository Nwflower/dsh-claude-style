import { CHAT_FOLD_ATTR } from '../../constants'
import { isChatFoldBusy } from './fold-glide-parts'
import { installChatFoldGlide } from './fold-glide'
import { createMessageFold } from './message-fold'
import { createProcessFold } from './process-fold'
import { createProcessSummary } from './process-summary'
import { createReasoningFold } from './reasoning-fold'
import { createReasoningStream } from './reasoning-stream'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureHandle } from '@dsh-claude-style/engine/scheduler'
import type { FeatureUi } from '../../core/feature'
import type manifest from './chat-fold.manifest'

/** What the follow reads off the folding (ui.chatFold): whether a door is rolling. */
export interface ChatFoldHandle extends FeatureHandle {
  isBusy(): boolean
}

/* One preference controls every fold behaviour. Install only while dsh-chat-ux is absent (D72);
   ui.chatFold lets the follow guard exclude an active glide and disappears on teardown. */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  document.body.setAttribute(CHAT_FOLD_ATTR, '')
  const stream = createReasoningStream()
  const stopReasoning = createReasoningFold(rows => {
    for (const row of rows) stream.queueRow(row)
  })
  const stopProcess = createProcessFold()
  const summary = createProcessSummary()
  const messageFold = createMessageFold(() => ui.schedule?.())
  const stopGlide = installChatFoldGlide()
  ui.chatFold = {
    isBusy: isChatFoldBusy,
    measure: () => messageFold.measure(),
    sync: () => messageFold.sync(),
    // Assistant text cannot change a user bubble; structural and size changes
    // request their own full pass from message-fold's registries.
    skipOnContentOnly: true,
    onCopyChange: () => {
      summary.rewrite()
      stream.sync()
      messageFold.onCopyChange()
    },
    // A resize can change the text's line height (the content font delta), which
    // the window's own height is measured from, and it re-wraps a message's words.
    reposition: () => {
      stream.sync()
      messageFold.reposition()
    },
  }
  return () => {
    delete ui.chatFold
    stream.stop()
    stopReasoning()
    stopProcess()
    summary.stop()
    messageFold.stop()
    stopGlide()
    document.body.removeAttribute(CHAT_FOLD_ATTR)
  }
}
