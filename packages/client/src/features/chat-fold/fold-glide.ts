import { subscribeMutations } from '../../core/bus'
import { motionReduced } from '../../core/prefs'
import { FOLD_DISCLOSURE_SELECTOR, FOLD_INTENT_TTL_MS, FOLD_POPUP_SELECTOR, FOLD_ROLL_MS, FOLD_SKIPPED_CONTROL_SELECTOR, FOLD_TOGGLE_SELECTOR, FOLD_VISIBLE_SHARE, foldBeginHeightClip, foldConfirmCollapsed, foldControlAtBottom, foldExpandedBody, foldHoldThroughStalls, foldProcessBody, foldSettleAfter, foldVisibleReach, foldWatchReader, markChatFoldBusy } from './fold-glide-parts'
import type { FoldWatch } from './fold-glide-parts'
import { isChatFoldToggle } from './fold-toggle'
import { CHAT_FLOW_SELECTOR, PROCESS_GROUP_SELECTOR, THINK_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { joinScrollOwner } from '../../shared/scroll-owner'

/** Margin past the roll's own duration for the backstop that unlocks the click. */
const FOLD_ROLL_BACKSTOP_MS = 200

/**
 * When a fold closes, the content below is pushed away and the body rolls up
 * like a door.
 *
 * The host's DisclosureRow unmounts the body whole when it closes ({open &&
 * children}), so CSS has no old value to transition from and a pure CSS
 * height animation is impossible in the chat area. This takes over outside
 * the DOM by intercepting the click: stopPropagation() in the capture phase,
 * so React never sees it and the real element stays where it is, still open,
 * and can have its height pressed down. When the press reaches the end the
 * click is handed back as it was. Pressing the real element means there is no
 * clone and none of a clone's trouble (inheritance, coordinates, scrolling,
 * node limits).
 *
 *   opening   acts after React has inserted the body — the observer callback
 *             still runs before paint, so the height can be pressed back to
 *             the start and animated to full while the layout grows frame by
 *             frame. The content below is really pushed away, with no FLIP.
 *   closing   intercepts the click and keeps the element open, so its height
 *             can be pressed to the end just as in the opening direction, and
 *             only then lets the click through: React unmounts an element
 *             that takes no space, so the collapsed layout does not jump.
 *
 * What gets pressed depends on the family:
 *
 *   a DisclosureRow    the body itself; it is a plain block with no inner scroll.
 *   a process group    the group root, not its body. The body carries its own
 *                      scrollbar and the host's use-process-scroll watches it:
 *                      pressing it would make follow.toBottom smooth-scroll the
 *                      content to the end and turn the door into a column of
 *                      text running upwards. The root is only the box around
 *                      it — the body inside keeps every pixel of its size, so
 *                      the host's follow receives no ResizeObserver notice,
 *                      while the root's height is part of the layout and still
 *                      pushes the content below away.
 *   not at all         a turn's header (the "took X seconds" button) and its
 *                      trigger notice: what they open is a whole turn's
 *                      content, nested scrolls included, and the host's own
 *                      instant toggle is the steadier answer there.
 *
 * The door only rolls what can be seen. The height has to travel from start
 * to end for the layout to really make room, but the animation's distance is
 * the full height: eight thousand pixels of reasoning would run out in 200 ms
 * and look like a pop. So the height runs in two stretches, and the boundary
 * is the visible reach foldVisibleReach measures — the stretch the reader can
 * see gets FOLD_VISIBLE_SHARE of the duration, and the height outside the
 * viewport takes the rest in one go. A door two hundred pixels tall and one
 * twenty thousand tall then move at the same speed in front of the reader,
 * and the two stretches are continuous rather than a jump.
 *
 * An intent is only taken from a reader's own click, and it only keeps one
 * number: the starting height for the opening direction. Streaming additions
 * and paging through history have no click and so no animation; this
 * feature's own automatic folding dispatches real clicks down this very
 * capture path, so those are recognised through isChatFoldToggle and let
 * through — there the content is meant to grow naturally.
 *
 * @returns teardown: the click listener and the observer go away.
 */
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
  /** A collapse is rolling: for these 200 ms no new click is taken, so two folds cannot pile up. */
  let glideShutting = false
  /** The intercepted click is being replayed to React, and that one must not be intercepted again. */
  let glideReplaying = false

  // The reader's animation choice, resolved (packages/client/src/core/prefs.ts): D26's own
  // preference, not the raw media query, so "reduced" in the settings page
  // stops the door and "always" keeps it against a system that asks for
  // reduced motion.
  const reduceMotion = () => motionReduced()

  /** Hand the intercepted click back to React as it was. No intercepting during the replay, and no collapse started. */
  const replay = (control: HTMLElement) => {
    glideShutting = false
    glideReplaying = true
    try {
      control.click()
    } finally {
      glideReplaying = false
    }
  }

  /**
   * Roll the door open: the height grows frame by frame from the starting
   * point to full, taking exactly as much room as it shows.
   *
   * There is only the height, but it runs in two stretches: the visible one
   * gets FOLD_VISIBLE_SHARE of the duration and the height outside the
   * viewport is finished with the rest.
   *
   * A rect measures border-box height while CSS height means content-box by
   * default: without switching to border-box the animation runs the padding
   * twice and then shrinks it back on cancel, which reads as the padding
   * moving.
   *
   * @param target - the element the door pulls: a body, or a process group's root.
   * @param from - the starting height. A body starts at 0; a group root starts
   *     at the header's own stretch, with the body hidden under it.
   * @returns the animation the settle waits for, or null when none started.
   */
  const rollOpen = (target: HTMLElement, from: number) => {
    markChatFoldBusy()
    const height = target.getBoundingClientRect().height
    if (height <= from) return null
    const travel = Math.max(from, foldVisibleReach(target))
    const restore = foldBeginHeightClip(target)
    const growing = target.animate(
      travel >= height
        ? [{ height: String(from) + 'px' }, { height: String(height) + 'px' }]
        : [
            { height: String(from) + 'px', offset: 0, easing: 'ease-out' },
            { height: String(travel) + 'px', offset: FOLD_VISIBLE_SHARE, easing: 'linear' },
            { height: String(height) + 'px', offset: 1 },
          ],
      { duration: FOLD_ROLL_MS, easing: 'ease-out' },
    )
    foldHoldThroughStalls(growing)
    growing.onfinish = () => {
      growing.cancel()
      restore()
    }
    return growing
  }

  /**
   * Roll the door shut: the real element is pressed, nothing is cloned.
   *
   * The click was intercepted in the capture phase, so React has not folded
   * anything and the element still stands at full height: it can be pressed
   * down just as in the opening direction, the layout shrinking frame by frame
   * and the content below really being made room. At the end of the press the
   * click is let through; React collapses then, when the element takes no
   * extra space, so the collapsed layout does not jump.
   *
   * Only the height, in two stretches again, in the opposite direction: the
   * part outside the viewport goes first and the visible stretch rolls up over
   * FOLD_VISIBLE_SHARE of the duration.
   *
   * @param fold - the element to press, the end height, and the test for
   *     "React has collapsed it".
   */
  const rollShut = (fold: { target: HTMLElement, floor: number, collapsed: () => boolean, control: HTMLElement, watch: FoldWatch }) => {
    markChatFoldBusy()
    const height = fold.target.getBoundingClientRect().height
    // A backstop: if onfinish never arrives for any reason, the click must not stay locked.
    const release = window.setTimeout(() => {
      glideShutting = false
    }, FOLD_ROLL_MS + FOLD_ROLL_BACKSTOP_MS)
    if (height <= fold.floor) {
      window.clearTimeout(release)
      replay(fold.control)
      foldSettleAfter(fold.watch)
      return
    }
    const travel = Math.max(fold.floor, foldVisibleReach(fold.target))
    const restore = foldBeginHeightClip(fold.target)
    const shrinking = fold.target.animate(
      travel >= height
        ? [{ height: String(height) + 'px' }, { height: String(fold.floor) + 'px' }]
        : [
            { height: String(height) + 'px', offset: 0, easing: 'linear' },
            { height: String(travel) + 'px', offset: 1 - FOLD_VISIBLE_SHARE, easing: 'ease-out' },
            { height: String(fold.floor) + 'px', offset: 1 },
          ],
      { duration: FOLD_ROLL_MS, easing: 'ease-out', fill: 'forwards' },
    )
    foldHoldThroughStalls(shrinking)
    shrinking.onfinish = () => {
      window.clearTimeout(release)
      replay(fold.control)
      // The DOM should have collapsed by now; if it has not, the animation
      // cannot be withdrawn — see foldConfirmCollapsed.
      foldConfirmCollapsed(fold.collapsed, () => {
        shrinking.cancel()
        restore()
      })
      foldSettleAfter(fold.watch)
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
      foldSettleAfter(watch, rollOpen(current.groupRoot, current.collapsedHeight))
      return
    }
    const body = foldExpandedBody(current.control)
    if (body === null) return
    // A DisclosureRow: the body is a plain block, and pressing its height is
    // "show as much as it has pulled down".
    foldSettleAfter(watch, rollOpen(body, 0))
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
    // A collapse is rolling: for these 200 ms no new click is taken, so two
    // folds cannot pile up.
    if (glideShutting) {
      event.stopPropagation()
      event.preventDefault()
      return
    }
    // The previous opening direction's wait is void.
    glideIntent = null
    // The control: a DisclosureRow, or any other button carrying aria-expanded
    // (a process group's header among them).
    const disclosure = target.closest<HTMLElement>(FOLD_DISCLOSURE_SELECTOR)
    const control = disclosure !== null ? disclosure : target.closest<HTMLElement>(FOLD_TOGGLE_SELECTOR)
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
        collapsedHeight: groupRoot === null ? 0 : groupRoot.getBoundingClientRect().height,
        watch: foldWatchReader(foldControlAtBottom(control)),
        takenAt: Date.now(),
      }
      return
    }
    if (reduceMotion()) return
    // The closing direction: intercept the click, let the element roll up, and
    // hand the click back when it is done.
    event.stopPropagation()
    event.preventDefault()
    glideShutting = true
    const watch = foldWatchReader(foldControlAtBottom(control))
    const collapsed = groupBody !== null
      ? () => groupBody.hasAttribute('hidden')
      : () => !body.isConnected
    rollShut({
      target: groupRoot !== null ? groupRoot : body,
      // A group root stops at the header's own stretch: once the body is
      // folded away, that is what the root's height comes to.
      floor: groupRoot === null
        ? 0
        : Math.max(0, groupRoot.getBoundingClientRect().height - body.getBoundingClientRect().height),
      collapsed,
      control,
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
    glideIntent = null
    leaveOwner()
  }
}
