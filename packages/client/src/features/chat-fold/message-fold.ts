import { observeMatches, observeSize, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { CHAT_ROW_SELECTOR, conversationColumn, userBubble } from '@dsh-claude-style/engine/chat-dom'
import { buildElement, setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { MESSAGE_FOLD_ATTR } from '../../constants'
import { SUBMISSION_ECHO_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { copy } from './copy'

/* Fold both the submission echo and durable row: send-flight measures the echo immediately.
   Reader expansion is remembered per bubble; cap and fade come from message-fold.css so the
   threshold and clamp share one source. */

/** The toggle the skin draws under a foldable message: the stylesheet and the press route both read it. */
export const MESSAGE_FOLD_TOGGLE_CLASS = 'dsh-claude-message-fold-toggle'
/** What the cap and the fade fall back to when the stylesheet's own values cannot be read. */
const FALLBACKS = { cap: 320, fade: 40 }

/** What the reader asked for on one message. */
type FoldChoice = 'collapsed' | 'expanded'


export function createMessageFold(requestPass: () => void) {
  /** Every row a submission is recognised by, kept current by the bus (D40). */
  const rows = observeMatches<HTMLElement>(CHAT_ROW_SELECTOR, prune)
  /** The size subscription of each bubble read so far: the browser reports when its box moves. */
  const sizes = new Map<Element, () => void>()
  /** The reader's own choice per message. */
  const choices = new WeakMap<Element, FoldChoice>()
  /** The toggle standing under each bubble, while it stands. */
  const under = new WeakMap<Element, HTMLElement>()
  /** Which bubble a standing toggle belongs to, for the press route. */
  const owners = new WeakMap<HTMLElement, HTMLElement>()
  /** Row to the bubble the last walk found under it: a pass does not walk a row twice. */
  const bubbles = new WeakMap<Element, HTMLElement>()
  /** Whether a bubble's content is taller than the cap; absent until it has been read. */
  let decided = new WeakMap<Element, boolean>()
  /** The reading width the last pass was taken at; -1 until one is taken. */
  let measuredWidth = -1

  /** Forget every height read and ask for a pass: a change of copy re-wraps the words. */
  function invalidate() {
    decided = new WeakMap()
    requestPass()
  }

  /**
   * End one bubble's size subscription and the height read it carried. A bubble
   * that comes back is decided again, which subscribes it afresh.
   */
  function release(bubble: Element) {
    const stop = sizes.get(bubble)
    if (stop === undefined) return
    stop()
    sizes.delete(bubble)
    decided.delete(bubble)
  }

  /** A row the page dropped leaves its bubble behind; a detached bubble never reports a size again. */
  function prune() {
    for (const bubble of sizes.keys()) {
      if (!bubble.isConnected) release(bubble)
    }
  }

  /** The width the messages are read at: the column they stand in, or the window while there is none. */
  function columnWidth() {
    const column = conversationColumn()
    return column === null ? window.innerWidth : column.clientWidth
  }

  /** Scrolls do not rewrap text; clamped bubbles need this width check because their box stays capped. */
  function reposition() {
    const width = columnWidth()
    if (measuredWidth === width) return
    const first = measuredWidth === -1
    measuredWidth = width
    // The first call only says which width the readings already in hand were
    // taken at; nothing is read again for it.
    if (!first) invalidate()
  }

  /** The bubble under one row, walked once per row until the host replaces it. */
  function bubbleOf(row: Element) {
    const held = bubbles.get(row)
    if (held !== undefined) {
      if (held.isConnected) return held
      // The host replaced the bubble inside a row that itself stands: the row
      // set did not change, so `prune` never saw this one leave.
      release(held)
    }
    const bubble = userBubble(row)
    if (bubble !== null) bubbles.set(row, bubble)
    return bubble
  }

  /** Text may arrive after the row; box changes invalidate the earlier height decision. */
  function watchSize(bubble: HTMLElement) {
    if (sizes.has(bubble)) return
    sizes.set(bubble, observeSize(bubble, () => {
      decided.delete(bubble)
      requestPass()
    }))
  }

  /**
   * Whether this bubble's content is taller than the cap.
   *
   * scrollHeight is the content's own height, which the clamp never hides, so
   * the answer holds in both states.
   */
  function decide(bubble: HTMLElement) {
    const known = decided.get(bubble)
    if (known !== undefined) return known
    watchSize(bubble)
    if (measuredWidth === -1) measuredWidth = columnWidth()
    const style = getComputedStyle(bubble)
    const cap = Number.parseFloat(style.getPropertyValue('--dsh-claude-message-fold-cap')) || FALLBACKS.cap
    const fade = Number.parseFloat(style.getPropertyValue('--dsh-claude-message-fold-fade')) || FALLBACKS.fade
    const tall = bubble.scrollHeight >= cap + fade
    decided.set(bubble, tall)
    return tall
  }

  /** The skin's own toggle under one bubble, built the first time it is needed. */
  function buildToggle(bubble: HTMLElement) {
    const toggle = buildElement('button', MESSAGE_FOLD_TOGGLE_CLASS)
    toggle.type = 'button'
    // No aria-expanded: the chat fold's own door takes every [aria-expanded]
    // control for a host disclosure (fold-glide.ts), and this control is the
    // skin's; its label says which way the press goes.
    owners.set(toggle, bubble)
    under.set(bubble, toggle)
    // The toggle stands after the bubble, inside the host's own message stack:
    // React owns that container, so the pass puts the toggle back whenever it goes.
    bubble.after(toggle)
    return toggle
  }

  /** Take one bubble's toggle down. */
  function dropToggle(bubble: HTMLElement) {
    const toggle = under.get(bubble)
    if (toggle === undefined) return
    under.delete(bubble)
    owners.delete(toggle)
    if (toggle.isConnected) toggle.remove()
  }

  /** The toggle's words say what pressing it does. */
  function writeLabel(toggle: HTMLElement, collapsed: boolean) {
    const text = collapsed ? copy('messageFoldMore') : copy('messageFoldLess')
    if (toggle.textContent !== text) toggle.textContent = text
  }

  /** Bring one bubble to what its height and the reader's own choice ask for. */
  function apply(bubble: HTMLElement, tall = decided.get(bubble) === true) {
    const collapsed = tall && choices.get(bubble) !== 'expanded'
    if (collapsed) setAttributeIfChanged(bubble, MESSAGE_FOLD_ATTR, 'collapsed')
    else bubble.removeAttribute(MESSAGE_FOLD_ATTR)
    if (!tall) {
      dropToggle(bubble)
      return
    }
    const standing = under.get(bubble)
    const toggle = standing !== undefined && standing.isConnected ? standing : buildToggle(bubble)
    writeLabel(toggle, collapsed)
  }

  /** Stop the press before host row handlers and the host-disclosure glide see it. */
  const onPress = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const toggle = target.closest('.' + MESSAGE_FOLD_TOGGLE_CLASS)
    if (!(toggle instanceof HTMLElement)) return
    const bubble = owners.get(toggle)
    if (bubble === undefined) return
    event.preventDefault()
    event.stopPropagation()
    const expanded = choices.get(bubble) === 'expanded'
    choices.set(bubble, expanded ? 'collapsed' : 'expanded')
    apply(bubble, decide(bubble))
  }

  /**
   * Read one row and write it in the same task: what a pass does for it, for the
   * one row a pass would reach a frame too late (the echo watch below).
   */
  function settleRow(row: Element) {
    const bubble = bubbleOf(row)
    if (bubble === null) return
    decide(bubble)
    apply(bubble)
  }

  /** Read every bubble the fold has no answer for (the pass's read phase, D40). */
  function measure() {
    for (const row of rows.all()) {
      const bubble = bubbleOf(row)
      if (bubble !== null) decide(bubble)
    }
  }

  /** Use bubbles cached in the read phase; querying here would force style recalculation (D40). */
  function sync() {
    for (const row of rows.all()) {
      const bubble = bubbles.get(row)
      if (bubble !== undefined && bubble.isConnected) apply(bubble)
    }
  }

  /* This observer is installed before send-flight's, so the echo is clamped before flight measures it. */
  const stopEchoWatch = subscribeMutations(document.body, { childList: true, subtree: true, skipQuiet: true }, records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue
        if (node.matches(SUBMISSION_ECHO_SELECTOR)) settleRow(node)
        for (const echo of node.querySelectorAll(SUBMISSION_ECHO_SELECTOR)) settleRow(echo)
      }
    }
  })

  document.addEventListener('click', onPress, true)

  return {
    measure,
    sync,
    reposition,
    /** A change of copy re-wraps and relabels: the next pass reads every height again. */
    onCopyChange: invalidate,
    stop() {
      document.removeEventListener('click', onPress, true)
      stopEchoWatch()
      // The mark stands on the bubble and the toggle under it, and the registry
      // is still live at teardown: nothing else has to be remembered.
      for (const row of rows.all()) {
        const bubble = bubbles.get(row)
        if (bubble === undefined) continue
        bubble.removeAttribute(MESSAGE_FOLD_ATTR)
        dropToggle(bubble)
      }
      for (const stop of sizes.values()) stop()
      sizes.clear()
      rows.release()
    },
  }
}
