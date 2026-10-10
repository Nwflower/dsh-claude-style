import { subscribeMutations } from '../../core/bus'
import { requestFrame } from '../../core/frame'
import { beginChatFoldToggle, endChatFoldToggle, isChatFoldToggle } from './fold-toggle'
import { writeScroll } from '../../shared/scroll-owner'
import { CONVERSATION_SCROLL_SELECTOR, FOLLOW_THRESHOLD_PX, PROCESS_ACTIVITY_SELECTOR, PROCESS_BODY_SELECTOR, PROCESS_EXPANDED_MODE_ATTRIBUTE, PROCESS_GROUP_SELECTOR, RUNNING_STATE, SHIMMER_ATTRIBUTE, SHIMMER_LEGACY_ATTRIBUTE, SHIMMER_SELECTOR } from '@dsh-claude-style/contracts/dom'

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
 * data-shimmer (older hosts write data-text-shimmer) only while the process
 * section is still running. Whether the body is open is its own
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
/** The piece of work is over and the final answer is due. */
const PROCESS_CLOSED = 'closed'

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
      const header = group.querySelector(PROCESS_ACTIVITY_SELECTOR)
      const body = group.querySelector(PROCESS_BODY_SELECTOR)
      if (!(header instanceof HTMLElement) || body === null) continue
      const phase = header.querySelector(SHIMMER_SELECTOR) === null ? PROCESS_CLOSED : RUNNING_STATE
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
    const header = group.querySelector(PROCESS_ACTIVITY_SELECTOR)
    touchedIn.set(group, header !== null && header.querySelector(SHIMMER_SELECTOR) !== null ? RUNNING_STATE : PROCESS_CLOSED)
  }

  // Streaming changes the DOM far faster than this needs to run, so one scan
  // a frame at most.
  const onRecords = (records: MutationRecord[]) => {
    const known = touchedGroups.size
    for (const record of records) {
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
    attributeFilter: [SHIMMER_ATTRIBUTE, SHIMMER_LEGACY_ATTRIBUTE, 'hidden', PROCESS_EXPANDED_MODE_ATTRIBUTE],
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
