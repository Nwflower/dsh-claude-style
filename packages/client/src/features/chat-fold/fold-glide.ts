import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { motionReduced, systemPrefersReducedMotion } from '../../core/prefs'
import { FOLD_INTENT_TTL_MS, FOLD_POPUP_SELECTOR, FOLD_ROLL_MS, FOLD_SKIPPED_CONTROL_SELECTOR, FOLD_VISIBLE_SHARE, foldBeginHeightClip, foldConfirmCollapsed, foldControlAt, foldControlAtBottom, foldExpandedBody, foldHoldThroughStalls, foldProcessBody, foldSettleAfter, foldVisibleReach, foldWatchReader, markChatFoldBusy } from './fold-glide-parts'
import type { FoldWatch } from './fold-glide-parts'
import { beginChatFoldToggle, chatFoldPressReading, endChatFoldToggle, isChatFoldToggle } from './fold-toggle'
import { CHAT_FLOW_SELECTOR, CHAT_MOTION_SCOPE_SELECTOR, PROCESS_GROUP_SELECTOR, THINK_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { joinScrollOwner } from '@dsh-claude-style/engine/scroll-owner'
import { motionEase } from '../../shared/motion'
import { inPageBox, inPagePixels } from '../../shared/page-zoom'

/** Margin past the roll's own duration for the backstop that unlocks the click. */
const FOLD_ROLL_BACKSTOP_MS = 200

/* DisclosureRow unmounts on close, so closing intercepts the click, animates the real body, then
   replays the click; opening animates after React inserts it. Process groups animate their root
   because resizing their scrolled body triggers host follow. Only reader clicks create intent. */
export function installChatFoldGlide() {
  /** The opening direction's intent, waiting for React to insert the body. */
  let glideIntent: {
    control: HTMLElement
    groupBody: HTMLElement | null
    groupRoot: HTMLElement | null
    collapsedHeight: number
    watch: FoldWatch
    takenAt: number
  } | null = null
  /** A collapse is rolling: for these 200 ms no new fold starts, so two folds cannot pile up. */
  let glideShutting = false
  /**
   * The click that arrived while a collapse was rolling. It is replayed once
   * the roll settles, so a quick second fold is delayed by the animation
   * instead of being dropped.
   */
  let queuedPress: Element | null = null
  /** The intercepted click is being replayed to React, and that one must not be intercepted again. */
  let glideReplaying = false
  /** These waits write scroll or click host controls; teardown and a new fold must cancel them. */
  let stopStallWatch: (() => void) | null = null
  let stopSettleWait: (() => void) | null = null
  let stopConfirmWait: (() => void) | null = null

  /** Replace one of the waits above with the next one. */
  function replaceWait(current: (() => void) | null, next: () => void) {
    if (current !== null) current()
    return next
  }

  // The reader's animation choice, resolved (packages/client/src/core/prefs.ts): D40's own
  // preference, not the raw media query, so "reduced" in the settings page
  // stops the door and "always" keeps it against a system that asks for
  // reduced motion.
  const reduceMotion = () => motionReduced()

  /** Replayed automatic presses must remain marked after the original toggle scope has ended. */
  const replay = (control: HTMLElement, own: boolean) => {
    glideShutting = false
    glideReplaying = true
    if (own) beginChatFoldToggle()
    try {
      control.click()
    } finally {
      if (own) endChatFoldToggle()
      glideReplaying = false
    }
    flushQueued()
  }

  /** Press the click held during a roll, once that roll has let go. */
  function flushQueued() {
    const target = queuedPress
    queuedPress = null
    if (!(target instanceof HTMLElement) || !target.isConnected) return
    if (glideShutting) {
      queuedPress = target
      return
    }
    target.click()
  }

  /** Animate visible and offscreen height separately; border-box prevents padding from moving twice. */
  const rollOpen = (target: HTMLElement, from: number) => {
    markChatFoldBusy()
    const height = inPagePixels(target.getBoundingClientRect().height)
    if (height <= from) return null
    const travel = Math.max(from, foldVisibleReach(target))
    const restore = foldBeginHeightClip(target)
    const growing = target.animate(
      travel >= height
        ? [{ height: String(from) + 'px' }, { height: String(height) + 'px' }]
        : [
            { height: String(from) + 'px', offset: 0, easing: motionEase('--dsh-claude-ease-out') },
            { height: String(travel) + 'px', offset: FOLD_VISIBLE_SHARE, easing: 'linear' },
            { height: String(height) + 'px', offset: 1 },
          ],
      { duration: FOLD_ROLL_MS, easing: motionEase('--dsh-claude-ease-out') },
    )
    stopStallWatch = replaceWait(stopStallWatch, foldHoldThroughStalls(growing))
    growing.onfinish = () => {
      growing.cancel()
      restore()
    }
    return growing
  }

  /** Whether the reader is at the session's end: as the scan behind this press read it, or read now. */
  const atBottomFor = (control: Element) => chatFoldPressReading()?.atBottom ?? foldControlAtBottom(control)

  /** Shrink the still-mounted element before replaying the click so React removes no visible height. */
  const rollShut = (fold: { target: HTMLElement, floor: number, collapsed: () => boolean, control: HTMLElement, own: boolean, watch: FoldWatch }) => {
    markChatFoldBusy()
    // A press this feature's own scan made carries the height its read phase took.
    const height = chatFoldPressReading()?.heights.get(fold.target) ?? inPagePixels(fold.target.getBoundingClientRect().height)
    // A backstop: if onfinish never arrives for any reason, the click must not stay locked.
    const release = window.setTimeout(() => {
      glideShutting = false
      flushQueued()
    }, FOLD_ROLL_MS + FOLD_ROLL_BACKSTOP_MS)
    if (height <= fold.floor) {
      window.clearTimeout(release)
      replay(fold.control, fold.own)
      stopSettleWait = replaceWait(stopSettleWait, foldSettleAfter(fold.watch))
      return
    }
    const travel = Math.max(fold.floor, foldVisibleReach(fold.target))
    const restore = foldBeginHeightClip(fold.target)
    const shrinking = fold.target.animate(
      travel >= height
        ? [{ height: String(height) + 'px' }, { height: String(fold.floor) + 'px' }]
        : [
            { height: String(height) + 'px', offset: 0, easing: 'linear' },
            { height: String(travel) + 'px', offset: 1 - FOLD_VISIBLE_SHARE, easing: motionEase('--dsh-claude-ease-out') },
            { height: String(fold.floor) + 'px', offset: 1 },
          ],
      { duration: FOLD_ROLL_MS, easing: motionEase('--dsh-claude-ease-out'), fill: 'forwards' },
    )
    stopStallWatch = replaceWait(stopStallWatch, foldHoldThroughStalls(shrinking))
    shrinking.onfinish = () => {
      window.clearTimeout(release)
      replay(fold.control, fold.own)
      // The DOM should have collapsed by now; if it has not, the animation
      // cannot be withdrawn — see foldConfirmCollapsed.
      stopConfirmWait = replaceWait(stopConfirmWait, foldConfirmCollapsed(fold.collapsed, () => {
        shrinking.cancel()
        restore()
      }))
      stopSettleWait = replaceWait(stopSettleWait, foldSettleAfter(fold.watch))
    }
  }

  /** React inserted the body the intent was waiting for (or this intent is dead). */
  const flush = () => {
    const current = glideIntent
    glideIntent = null
    if (current === null) return
    const watch = current.watch
    // Nothing to animate on this road.
    if (Date.now() - current.takenAt > FOLD_INTENT_TTL_MS || reduceMotion()) return
    // A process group: the root is pressed, not the body — the body carries
    // its own scrollbar and the host's follow is watching it.
    if (current.groupRoot !== null && current.groupBody !== null) {
      if (current.groupBody.hasAttribute('hidden')) return
      stopSettleWait = replaceWait(stopSettleWait, foldSettleAfter(watch, rollOpen(current.groupRoot, current.collapsedHeight)))
      return
    }
    const body = foldExpandedBody(current.control)
    if (body === null) return
    // A DisclosureRow: the body is a plain block, and pressing its height is
    // "show as much as it has pulled down".
    stopSettleWait = replaceWait(stopSettleWait, foldSettleAfter(watch, rollOpen(body, 0)))
  }

  const onClick = (event: MouseEvent) => {
    // The replay itself goes straight through to React.
    if (glideReplaying) return
    const target = event.target
    if (!(target instanceof Element)) return
    // This feature's own automatic folding dispatches real clicks down this
    // very capture path. A thinking row should roll just like the reader's own
    // click: opened and closed instantly by it, its content would appear and
    // vanish with a snap, while a tool row — only ever opened by a click —
    // always had a door. A process group is not in that list: one scan can
    // toggle several groups, and the collapse is exclusive (glideShutting), so
    // a second click arriving together would be swallowed and that group would
    // never get its turn.
    if (isChatFoldToggle() && target.closest(THINK_ROW_SELECTOR) === null) return
    // Only the chat area is taken over. aria-expanded is used page-wide — the
    // model picker, the settings dropdowns, the sidebar's rows, the task panel
    // — and their opening has nothing to do with the chat flow's movement;
    // taking them over would squash menus and delay a click by 200 ms.
    if (target.closest(CHAT_FLOW_SELECTOR) === null) return
    // A popup opens no folding body: menus and dialogs must not move the chat flow.
    if (target.closest(FOLD_POPUP_SELECTOR) !== null) return
    // A collapse is rolling: the click waits for it instead of being dropped,
    // so a quick second fold lands one animation later.
    if (glideShutting) {
      queuedPress = target
      event.stopPropagation()
      event.preventDefault()
      return
    }
    // The previous opening direction's wait is void.
    glideIntent = null
    const control = foldControlAt(target)
    if (control === null) return
    // A turn's header and its trigger notice are skipped whole: what they open
    // is a whole turn's content, neither road suits it, and the host's own
    // instant toggle is steadier there.
    if (control.closest(FOLD_SKIPPED_CONTROL_SELECTOR) !== null) return
    // A group's header controls its body, a member row does not — see foldProcessBody.
    const groupBody = foldProcessBody(control)
    const groupParent = groupBody === null ? null : groupBody.parentElement
    const groupRoot = groupParent === null ? null : groupParent.closest<HTMLElement>(PROCESS_GROUP_SELECTOR)
    const body = groupBody !== null ? groupBody : foldExpandedBody(control)
    // The opening direction: wait for React to insert the body and animate in
    // the observer callback. The starting height is measured on this side —
    // the group root is collapsed right now, and that is the stretch the door
    // will pull out.
    if (body === null || body.hasAttribute('hidden')) {
      glideIntent = {
        control,
        groupBody,
        groupRoot,
        collapsedHeight: groupRoot === null ? 0 : inPagePixels(groupRoot.getBoundingClientRect().height),
        watch: foldWatchReader(atBottomFor(control)),
        takenAt: Date.now(),
      }
      return
    }
    if (reduceMotion()) return
    // Inside its motion scope the host rolls a group's body shut on its own
    // clock, from the body's full height: a door pressed first would spring back
    // open when that roll starts.
    if (groupBody !== null && groupBody.closest(CHAT_MOTION_SCOPE_SELECTOR) !== null && !systemPrefersReducedMotion()) return
    // The closing direction: intercept the click, let the element roll up, and
    // hand the click back when it is done.
    event.stopPropagation()
    event.preventDefault()
    glideShutting = true
    const watch = foldWatchReader(atBottomFor(control))
    const collapsed = groupBody !== null
      ? () => groupBody.hasAttribute('hidden')
      : () => !body.isConnected
    rollShut({
      target: groupRoot !== null ? groupRoot : body,
      // A group root stops at the header's own stretch: once the body is
      // folded away, that is what the root's height comes to. The body's top
      // margin leaves with it (fold.css).
      floor: groupRoot === null
        ? 0
        : Math.max(0, inPageBox(groupRoot.getBoundingClientRect()).height - inPageBox(body.getBoundingClientRect()).height - parseFloat(getComputedStyle(body).marginTop)),
      collapsed,
      control,
      own: isChatFoldToggle(),
      watch,
    })
  }

  const leaveOwner = joinScrollOwner()
  document.addEventListener('click', onClick, true)
  // hidden is watched too: a process group folds with
  // setAttribute('hidden', 'until-found'), an attribute change alone, which
  // a child-list subscription never hears. Elsewhere a hidden flip usually
  // arrives with no intent pending and returns at once.
  const stopMutations = subscribeMutations(document.body, { childList: true, subtree: true, attributeFilter: ['hidden'] }, flush)

  return () => {
    document.removeEventListener('click', onClick, true)
    stopMutations()
    // The waits go before the intent does: each of them ends by writing the
    // scroll position or pressing the host's button.
    if (stopStallWatch !== null) stopStallWatch()
    stopStallWatch = null
    if (stopSettleWait !== null) stopSettleWait()
    stopSettleWait = null
    if (stopConfirmWait !== null) stopConfirmWait()
    stopConfirmWait = null
    glideIntent = null
    queuedPress = null
    leaveOwner()
  }
}
