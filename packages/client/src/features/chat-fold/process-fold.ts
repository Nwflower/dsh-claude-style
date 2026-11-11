import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { beginChatFoldToggle, endChatFoldToggle, isChatFoldToggle, subscribeFoldReaderEvents } from './fold-toggle'
import { writeScroll } from '@dsh-claude-style/engine/scroll-owner'
import { captureComposerCaret, composerComposing, focusKeepingComposerCaret } from '../../shared/composer-caret'
import { CHAT_FLOW_SELECTOR, CHAT_TURN_ATTRIBUTE, CONVERSATION_SCROLL_SELECTOR, FOLLOW_THRESHOLD_PX, PROCESS_ACTIVITY_SELECTOR, PROCESS_BODY_SELECTOR, PROCESS_EXPANDED_MODE_ATTRIBUTE, PROCESS_GROUP_SELECTOR, RUNNING_STATE, SHIMMER_ATTRIBUTE, SHIMMER_SELECTOR, STREAMING_ATTRIBUTE, ASSISTANT_STEP_KIND, FLOW_KIND_ATTRIBUTE, TURN_PROCESS_MEMBER_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'

/* Host header shimmer marks a running group; hidden="until-found" marks its folded body.
   Reader overrides last for the current phase. Expanded tiers are left untouched, and a stopped
   turn's last group reopens because it has no answer to replace the work. */
const PROCESS_CLOSED = 'closed'
/* The host's answer mark is absent while the latest turn stays open, so identify the answer by
   its assistant-step kind and exclusion from process members. Stopped turns have no answer row. */
const ANSWER_ROW_SELECTOR = `[${FLOW_KIND_ATTRIBUTE}="${ASSISTANT_STEP_KIND}"]:not([${TURN_PROCESS_MEMBER_ATTRIBUTE}])`

export function createProcessFold() {
  /** The phase a group was in when the reader last touched it. */
  const touchedIn = new WeakMap<Element, string>()
  /** The state a group's body stood in when it was last pressed, so a press that changed nothing is not retried. */
  const attemptedIn = new WeakMap<Element, string>()
  /** Whether a scan is already queued. */
  let scanQueued = false
  /** The groups this batch of mutations touched. */
  const touchedGroups = new Set<Element>()
  /**
   * Each flow's process groups by turn, for the batch being handled: one whole
   * column query per flow replaces one per touched node, which on a session
   * mount is one per group.
   */
  let turnGroups: Map<Element, Map<string, Element[]>> | null = null

  /** Stream and answer changes occur outside the group, so settle all groups in that turn. */
  const settleTurnOf = (node: Element) => {
    const flow = node.closest(CHAT_FLOW_SELECTOR)
    const turn = node.closest(`[${CHAT_TURN_ATTRIBUTE}]`)?.getAttribute(CHAT_TURN_ATTRIBUTE) ?? null
    if (flow === null || turn === null) return
    turnGroups ??= new Map()
    let byTurn = turnGroups.get(flow)
    if (byTurn === undefined) {
      byTurn = new Map()
      // Document order: a turn's groups keep the order the host wrote them in.
      for (const group of flow.querySelectorAll(PROCESS_GROUP_SELECTOR)) {
        const key = group.getAttribute(CHAT_TURN_ATTRIBUTE) ?? ''
        const list = byTurn.get(key)
        if (list === undefined) byTurn.set(key, [group])
        else list.push(group)
      }
      turnGroups.set(flow, byTurn)
    }
    const groups = byTurn.get(turn)
    if (groups === undefined) return
    for (const group of groups) touchedGroups.add(group)
  }


  const syncGroups = (groups: Iterable<Element>) => {
    /** The turns carrying an answer row, per flow, read once for this scan. */
    const answered = new Map<Element, Set<string>>()
    /** A stopped turn has no answer, so its last process remains visible. */
    const showsAnswer = (group: Element, flow: Element) => {
      const turn = group.getAttribute(CHAT_TURN_ATTRIBUTE)
      if (turn === null) return true
      let turns = answered.get(flow)
      if (turns === undefined) {
        turns = new Set([...flow.querySelectorAll(ANSWER_ROW_SELECTOR)].map(row => row.getAttribute(CHAT_TURN_ATTRIBUTE) ?? ''))
        answered.set(flow, turns)
      }
      return turns.has(turn)
    }
    /** Each turn's last process group, per flow, read once for this scan. */
    const lastGroups = new Map<Element, Map<string, Element>>()
    /** Whether a later process group of the same turn stands below this one. */
    const followedInTurn = (group: Element, flow: Element) => {
      const turn = group.getAttribute(CHAT_TURN_ATTRIBUTE)
      if (turn === null) return false
      let last = lastGroups.get(flow)
      if (last === undefined) {
        last = new Map()
        // Document order: the turn's last group is the one written last.
        for (const each of flow.querySelectorAll(PROCESS_GROUP_SELECTOR)) last.set(each.getAttribute(CHAT_TURN_ATTRIBUTE) ?? '', each)
        lastGroups.set(flow, last)
      }
      return last.get(turn) !== group
    }
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
      const closed = phase === PROCESS_CLOSED
      // The reader has decided this group's state in this phase: leave it.
      if (touchedIn.get(group) === phase) continue
      // A closed group folds once a later group of its turn or the turn's answer
      // takes its place. The last group of a stopped turn has neither, and the
      // host folds it itself at the end; this is the press that opens it again,
      // so the work stays on screen.
      const flow = group.closest(CHAT_FLOW_SELECTOR)
      const desiredHidden = closed && (flow === null || followedInTurn(group, flow) || showsAnswer(group, flow))
      if (body.hasAttribute('hidden') === desiredHidden) continue
      // A group the reader folded by hand stays folded.
      if (!desiredHidden && touchedIn.has(group)) continue
      // A press that changed nothing will not change anything next time either.
      // Both sides name the state the body stands in, so the host's own fold
      // later in the turn is a state this module has not pressed from.
      const standing = `${phase}:${body.hasAttribute('hidden') ? 'shut' : 'open'}`
      if (attemptedIn.get(group) === standing) continue
      // The reader is part-way through an input-method composition. The press
      // below takes the focus off the editor and hands it back, and a focus or
      // selection moved under an uncommitted composition makes the browser drop
      // the letters typed so far: the pinyin reverts to its raw keys and the
      // candidate window opens again. Left unrecorded, so the group is settled
      // once the composition has landed (compositionend below).
      if (composerComposing()) continue
      // The host's header onClick focuses the control, which is meant for a
      // real press. A programmatic one must not take the focus away from the
      // reader, or the browser draws a focus ring on the header that just
      // opened, as if someone had pressed Tab.
      const previousFocus = document.activeElement
      // The composer's selection is the reader's caret, and the restore below
      // is a bare focus: it would take the caret back to the start of the draft.
      // The range travels across the focus instead (shared/composer-caret.ts).
      const composerCaret = captureComposerCaret()
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
      // A press that landed is forgotten: a fold the host makes later from the
      // same state is a new moment and gets its own press. One that changed
      // nothing is recorded against the state it was made from, so it is never
      // repeated.
      if (body.hasAttribute('hidden') === desiredHidden) attemptedIn.delete(group)
      else attemptedIn.set(group, standing)
      // The position goes back, but not to a place short of the end for a
      // reader who was at the end: that write is a scroll too, and the host
      // would read it as the reader moving and switch its follow off. At the
      // bottom it is pinned there.
      if (scroller !== null && scrollTop !== null && scroller.scrollTop !== scrollTop) {
        writeScroll(scroller, wasAtBottom ? scroller.scrollHeight : scrollTop, 'fold')
      }
      // With the reader already on the header this puts the focus back where
      // it was and changes nothing.
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) focusKeepingComposerCaret(previousFocus, composerCaret)
      if (document.activeElement === header) header.blur()
    }
  }

  /** Wait for the mounting task to paint before pressing group headers. */
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
    // One batch, one reading of each flow's groups: the cache below lives no
    // longer than this call.
    turnGroups = null
    const known = touchedGroups.size
    for (const record of records) {
      if (record.type === 'attributes' && record.attributeName === STREAMING_ATTRIBUTE) {
        // The stream ended: the turn's answer is in place, or its work was stopped.
        if (record.target instanceof Element && !record.target.hasAttribute(STREAMING_ATTRIBUTE)) settleTurnOf(record.target)
        continue
      }
      if (record.type === 'attributes' && record.attributeName === TURN_PROCESS_MEMBER_ATTRIBUTE) {
        // The turn ended and its answer left the process: the fold is due.
        if (record.target instanceof Element && record.target.matches(ANSWER_ROW_SELECTOR)) settleTurnOf(record.target)
        continue
      }
      const target = record.target
      const element = target instanceof Element ? target : target.parentElement
      const group = element?.closest(PROCESS_GROUP_SELECTOR) ?? null
      if (group !== null) touchedGroups.add(group)
      for (const node of record.addedNodes) {
        if (!(node instanceof HTMLElement)) continue
        // A new group takes the place of the ones before it in its turn. A group
        // already queued came in with its turn, so a whole session mounting at
        // once walks each turn one time.
        const added = node.matches(PROCESS_GROUP_SELECTOR) ? [node] : node.querySelectorAll(PROCESS_GROUP_SELECTOR)
        for (const found of added) {
          if (touchedGroups.has(found)) continue
          touchedGroups.add(found)
          settleTurnOf(found)
        }
        // The answer row the group waits for: its arrival is when the fold is due.
        const answer = node.matches(ANSWER_ROW_SELECTOR) ? node : node.querySelector(ANSWER_ROW_SELECTOR)
        if (answer !== null) settleTurnOf(answer)
      }
    }
    turnGroups = null
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
  /** Composition may have suppressed the final scan; settle again when it ends. */
  const onCompositionEnd = () => {
    requestFrame({ write() { syncEveryGroup() } })
  }
  const stopMutations = subscribeMutations(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    // The group root's expand-mode attribute is in range too: switching tiers
    // adds or removes it, and that batch has to be scanned again.
    attributeFilter: [SHIMMER_ATTRIBUTE, 'hidden', PROCESS_EXPANDED_MODE_ATTRIBUTE, STREAMING_ATTRIBUTE, TURN_PROCESS_MEMBER_ATTRIBUTE],
  }, onRecords)
  const stopReaderEvents = subscribeFoldReaderEvents(rememberReaderTouched, onCompositionEnd)
  requestFrame({ write() { syncEveryGroup() } })

  return () => {
    stopMutations()
    stopReaderEvents()
  }
}
