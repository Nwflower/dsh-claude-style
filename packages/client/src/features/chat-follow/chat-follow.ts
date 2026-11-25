import { CHAT_FOLLOW_ATTR } from '../../constants'
import { createStamp } from '@dsh-claude-style/engine/dom'
import { observeComposerCards } from '@dsh-claude-style/engine/host'
import { submissionHolds } from '@dsh-claude-style/engine/scroll-owner'
import { createChatFollowGuard } from './follow-guard'
import { createChatProcessFollow } from './process-follow'
import { readFollowTail, writeFollowTail } from './follow-tail'
import type { FollowTailPlacement } from './follow-tail'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './chat-follow.manifest'

/*
 * The stream slide and the capped process group's follow, ported from
 * dsh-chat-ux. Both ride one preference, as they do upstream.
 *
 * The watch that drives the stream slide is in follow-guard.ts; the slide
 * itself is in slide-motion.ts and slide-sync.ts; every position write is the
 * scroll owner's (packages/engine/src/scroll-owner.ts, D40); the catch-up
 * inside a capped body is in process-follow.ts.
 */
/** The host's own back-to-end button, marked for the stylesheet that places it. */
const FOLLOW_TAIL_ATTR = 'data-dsh-claude-follow-tail'

/**
 * Install both halves of the follow behaviour and mark the page for its
 * stylesheet (the capped body's vertical-only scroll). The entry installs this
 * only while the preference is on and dsh-chat-ux, which drives the same
 * moments and writes the same scroll positions, is off the page (the
 * manifest); this teardown hands the chat area back whole.
 */
export function install(_ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const stopGuard = createChatFollowGuard({
    foldBusy: () => ui.chatFold !== undefined && ui.chatFold !== null && ui.chatFold.isBusy(),
    /**
     * Whether the reader's own message is still taking its place. The send
     * feature owns that moment — its flight and the row growing where it lands
     * both read the row's own box, which a slide's offset would move — and the
     * engine's window is the answer for a page where it is not installed: its
     * chunk has not arrived, its switch is off, or another plugin owns the
     * entrance.
     */
    submissionHeld: () => (ui.chatSend === undefined ? submissionHolds() : ui.chatSend.isEntering()),
  })
  const stopProcess = createChatProcessFollow()
  const tailStamp = createStamp<HTMLElement>(FOLLOW_TAIL_ATTR)
  const cards = observeComposerCards()
  /** What the pass's read phase measured; the pass's sync consumes it. */
  let passPlacement: FollowTailPlacement | null = null
  /** What the viewport frame's read phase measured; that frame's reposition consumes it. */
  let viewportPlacement: FollowTailPlacement | null = null
  const readPlacement = () => readFollowTail(cards.all())
  document.body.setAttribute(CHAT_FOLLOW_ATTR, '')
  ui.chatFollow = {
    measure() {
      passPlacement = readPlacement()
    },
    measureReposition() {
      viewportPlacement = readPlacement()
    },
    sync() {
      const placement = passPlacement
      passPlacement = null
      writeFollowTail(tailStamp, placement)
    },
    /**
     * A viewport change was measured in its frame's read phase; a composer card
     * resizing is reported after that layout, so it reads here and writes on.
     */
    reposition(reason) {
      const placement = reason === 'viewport' && viewportPlacement !== null ? viewportPlacement : readPlacement()
      viewportPlacement = null
      writeFollowTail(tailStamp, placement)
    },
  }
  return () => {
    passPlacement = null
    viewportPlacement = null
    document.body.removeAttribute(CHAT_FOLLOW_ATTR)
    tailStamp.release()
    cards.release()
    delete ui.chatFollow
    stopGuard()
    stopProcess()
  }
}
