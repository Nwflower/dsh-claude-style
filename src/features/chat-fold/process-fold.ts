import { subscribeMutations } from '../../core/bus'
import { requestFrame } from '../../core/frame'
import { beginChatFoldToggle, endChatFoldToggle, isChatFoldToggle } from './fold-toggle'
import { writeScroll } from '../../shared/scroll-owner'
import { CONVERSATION_SCROLL_SELECTOR, FOLLOW_THRESHOLD_PX, PROCESS_BODY_SELECTOR, PROCESS_EXPANDED_MODE_ATTRIBUTE, PROCESS_GROUP_SELECTOR, RUNNING_STATE, SHIMMER_SELECTOR } from '../../contracts/dom'

/**
 * A running process group opens by default and folds back once the piece of
 * work ends (the final answer is due).
 *
 * The host gathers a turn's adjacent process content — reasoning, tool calls,
 * commands, file writes — into one process group, opened and closed by its own
 * inline control. In the compact and standard tiers the body starts folded,
 * so the reader has to open it to see what the model is doing. The detailed
 * and fully-expanded tiers do not cap the body (it is open throughout), and
 * this module leaves them alone entirely — the test is the group root's
 * data-group-expanded-mode.
 *
 * A group's phase is read off the shimmer in its header: the host attaches
 * data-shimmer (data-text-shimmer before its 2026-09 update) only while the
 * process section is still running. Whether the body is open is its own
 * hidden attribute — the host hides searchably, setting hidden="until-found"
 * when folded and removing it entirely when open. Both are semantic
 * attributes. Command cards inside the group use the shimmer too, so the
 * phase is only ever asked of the header.
 *
 * The group still belongs to the reader: a reader who touched a group in a
 * phase keeps it for that phase. The hand-over is per phase — folding a group
 * while its process still runs means he does not want to watch it right now,
 * and folding it back when the section ends would mean nothing.
 */
/** The header's open/close control. */
export const PROCESS_HEADER_SELECTOR = 'button[data-process-activity]'
/** The separator the host joins the header label and the live detail with (message.turnProcess.separator). */
export const PROCESS_DETAIL_SEPARATOR = ' · '
/** On a group root: this group's header carries a live detail right now (standard or detailed tier, process still running). */
export const PROCESS_LIVE_DETAIL_ATTR = 'data-dsh-claude-live-detail'
/** On a group root: this group's body is open right now. */
export const PROCESS_OPEN_ATTR = 'data-dsh-claude-open'
/** On the header control: the label half of its title, for the stylesheet to stand in with while the body is open. */
export const PROCESS_LABEL_ATTR = 'data-dsh-claude-label'
/**
 * On the header control: the stand-in label's gradient half width. The
 * host's TextShimmer inlines the same measure as characters times 8px, and
 * the stylesheet spreads the stand-in text's sweep to match.
 */
export const PROCESS_LABEL_SPREAD_PROPERTY = '--dsh-claude-label-spread'
/** The header control's accessible name. The stand-in text is pseudo-element content and never reaches the accessibility tree, and the original text gave way whole, so the name has to come from here. */
export const PROCESS_LABEL_NAME_ATTRIBUTE = 'aria-label'
/** The gradient half width the host's TextShimmer leaves per character. */
export const PROCESS_SHIMMER_PIXELS_PER_CHARACTER = 8
/** The piece of work is over and the final answer is due. */
export const PROCESS_CLOSED = 'closed'

/**
 * Watch every process group on the page and bring each to what its phase
 * asks for.
 *
 * @returns teardown: the observer and the two listeners go away.
 */
export function createProcessFold() {
  /** The phase a group was in when the reader last touched it. */
  const touchedIn = new WeakMap<Element, string>()
  /** The phase a group was in when it was last toggled, so a press that changed nothing is not retried. */
  const attemptedIn = new WeakMap<Element, string>()
  /** Whether a scan is already queued. */
  let scanQueued = false
  /** The groups this batch of mutations touched. */
  const touchedGroups = new Set<Element>()

  /**
   * Bring these groups to what their current phase asks for.
   * @param groups - this batch of groups; some may already be unattached.
   */
  const syncGroups = (groups: Iterable<Element>) => {
    for (const group of groups) {
      // A frame sits between collecting and settling, and the group may be gone by then.
      if (!group.isConnected) continue
      // The detailed and fully-expanded tiers do not cap the body, and the
      // host keeps the header in the DOM there (wrapped in a hidden shell), so
      // pressing it would only flip the host's own open state with nothing for
      // the reader to see.
      if (group.hasAttribute(PROCESS_EXPANDED_MODE_ATTRIBUTE)) continue
      const header = group.querySelector(PROCESS_HEADER_SELECTOR)
      const body = group.querySelector(PROCESS_BODY_SELECTOR)
      if (!(header instanceof HTMLElement) || body === null) continue
      const phase = header.querySelector(SHIMMER_SELECTOR) === null ? PROCESS_CLOSED : RUNNING_STATE
      // The tiers with a live detail attach this section's detail after the
      // header label, and that detail is the same text the group's thinking row
      // is streaming — both grow at once while the body is open. CSS cannot
      // split one text node, so the label half goes onto an attribute and the
      // stylesheet stands it in for the whole text while the body is open.
      const headerText = header.textContent ?? ''
      const separatorAt = headerText.indexOf(PROCESS_DETAIL_SEPARATOR)
      const detailed = separatorAt >= 0
      group.toggleAttribute(PROCESS_LIVE_DETAIL_ATTR, detailed)
      group.toggleAttribute(PROCESS_OPEN_ATTR, !body.hasAttribute('hidden'))
      if (detailed) {
        const label = headerText.slice(0, separatorAt)
        // This path runs on every scan, so a value that has not changed is not
        // written: an identical write still makes ::after resolve its content
        // again. The two attributes are guarded apart, since the other branch
        // only takes the name away.
        if (header.getAttribute(PROCESS_LABEL_ATTR) !== label) header.setAttribute(PROCESS_LABEL_ATTR, label)
        if (header.getAttribute(PROCESS_LABEL_NAME_ATTRIBUTE) !== label) header.setAttribute(PROCESS_LABEL_NAME_ATTRIBUTE, label)
        const spread = label.length * PROCESS_SHIMMER_PIXELS_PER_CHARACTER + 'px'
        if (header.style.getPropertyValue(PROCESS_LABEL_SPREAD_PROPERTY) !== spread) {
          header.style.setProperty(PROCESS_LABEL_SPREAD_PROPERTY, spread)
        }
      } else header.removeAttribute(PROCESS_LABEL_NAME_ATTRIBUTE)
      // The reader has decided this group's state in this phase: leave it.
      if (touchedIn.get(group) === phase) continue
      if (body.hasAttribute('hidden') === (phase === PROCESS_CLOSED)) continue
      // A press that changed nothing will not change anything next time either.
      if (attemptedIn.get(group) === phase) continue
      attemptedIn.set(group, phase)
      // The host's header onClick focuses the control, which is meant for a
      // real press. A programmatic one must not take the focus away from the
      // reader, or the browser draws a focus ring on the header that just
      // opened, as if someone had pressed Tab.
      const previousFocus = document.activeElement
      // The same focus() also scrolls the header into view, and that scroll
      // looks to the host exactly like the reader scrolling: its follow is
      // suspended for a 500 ms sampling window, in which a resize follows
      // nothing, and by the time it settles the content has grown past the
      // line — the follow switches off with the reader never having touched
      // the keyboard. So the position is put back after the press.
      const scroller = header.closest<HTMLElement>(CONVERSATION_SCROLL_SELECTOR)
      const scrollTop = scroller === null ? null : scroller.scrollTop
      // Whether the reader was at the bottom is read before the press: the
      // press itself changes the layout.
      const wasAtBottom = scroller !== null
        && scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= FOLLOW_THRESHOLD_PX
      // This press is ours: neither the fold glide nor the thinking row's side
      // may read it as the reader's intent.
      beginChatFoldToggle()
      try {
        header.click()
      } finally {
        endChatFoldToggle()
      }
      // The position goes back, but not to a place short of the end for a
      // reader who was at the end: that write is a scroll too, and the host
      // would read it as the reader moving and switch its follow off. At the
      // bottom it is pinned there.
      if (scroller !== null && scrollTop !== null && scroller.scrollTop !== scrollTop) {
        writeScroll(scroller, wasAtBottom ? scroller.scrollHeight : scrollTop, 'fold')
      }
      // With the reader already on the header this puts the focus back where
      // it was and changes nothing.
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true })
      if (document.activeElement === header) header.blur()
    }
  }

  /** Settle every group already on the page once, right after install. */
  const syncEveryGroup = () => {
    syncGroups(document.querySelectorAll(PROCESS_GROUP_SELECTOR))
  }

  /** Record that the reader, and not this module, just decided a group's state. */
  const rememberReaderTouched = (event: Event) => {
    if (isChatFoldToggle()) return
    const target = event.target
    if (!(target instanceof Element)) return
    const group = target.closest(PROCESS_GROUP_SELECTOR)
    if (group === null) return
    const header = group.querySelector(PROCESS_HEADER_SELECTOR)
    touchedIn.set(group, header !== null && header.querySelector(SHIMMER_SELECTOR) !== null ? RUNNING_STATE : PROCESS_CLOSED)
  }

  // Streaming changes the DOM far faster than this needs to run, so one scan
  // a frame at most. The header's live detail changes character by character,
  // so characterData is in range too: without watching it the label half would
  // sit on a stale value.
  const onRecords = (records: MutationRecord[]) => {
    const known = touchedGroups.size
    for (const record of records) {
      // The same shape as the thinking row's, with one extra step:
      // characterData's target is a text node, so it steps out to its parent
      // element first.
      const target = record.target
      const element = target instanceof Element ? target : target.parentElement
      const group = element?.closest(PROCESS_GROUP_SELECTOR) ?? null
      if (group !== null) touchedGroups.add(group)
      for (const node of record.addedNodes) {
        if (!(node instanceof HTMLElement)) continue
        if (node.matches(PROCESS_GROUP_SELECTOR)) touchedGroups.add(node)
        for (const found of node.querySelectorAll(PROCESS_GROUP_SELECTOR)) touchedGroups.add(found)
      }
    }
    // A change with no process group in it (the sidebar, the plugin page) is
    // not worth a frame.
    if (touchedGroups.size === known) return
    if (scanQueued) return
    scanQueued = true
    // The scan reads each one's state and folds it open or shut: write phase (D40).
    requestFrame({
      write() {
        scanQueued = false
        const groups = [...touchedGroups]
        touchedGroups.clear()
        syncGroups(groups)
      },
    })
  }
  const stopMutations = subscribeMutations(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    // The group root's expand-mode attribute is in range too: switching tiers
    // adds or removes it, and that batch has to be scanned again.
    attributeFilter: ['data-shimmer', 'data-text-shimmer', 'hidden', PROCESS_EXPANDED_MODE_ATTRIBUTE],
    characterData: true,
  }, onRecords)
  document.addEventListener('click', rememberReaderTouched, true)
  document.addEventListener('keydown', rememberReaderTouched, true)
  syncEveryGroup()

  return () => {
    stopMutations()
    document.removeEventListener('click', rememberReaderTouched, true)
    document.removeEventListener('keydown', rememberReaderTouched, true)
  }
}
