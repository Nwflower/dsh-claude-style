/**
 * The host contract as one table (D3): the literals in packages/contracts/src/dom.ts,
 * each with what the skin reads it for and how the contract test checks it on
 * a live host (D77).
 *
 * The table is build and test data rather than runtime data: the browser bundle
 * carries the literals alone, so the notes cost the page nothing. The build
 * holds the two lists together — every exported literal of the DOM contract has
 * to appear here, and every id has to be named by a feature manifest (D72) — so
 * a selector cannot enter the skin without a note and an owner, and a host
 * upgrade can be audited from this list alone.
 *
 * The host build these entries were checked on is the one the service shapes
 * name (packages/contracts/src/services.ts, 0.2.1-alpha.1), and the lane's
 * `contract` scenario walks every `probe` below against a live host (D3, D77).
 */
import * as dom from './dom'

/**
 * The page state an entry is checked in (D77): the empty page, the moment a
 * submission goes through, an answer streaming in, a settled conversation of two
 * turns, the host's own account menu open, or the host's dark flip. `any` holds
 * everywhere the page is served.
 */
type HostDomProbeState = 'any' | 'hero' | 'sending' | 'streaming' | 'conversation' | 'menu' | 'dark'

/**
 * How the literal is checked:
 *
 * - `selector` — it matches at least `min` elements (default 1).
 * - `attribute` — some element carries it.
 * - `property` — the element `within` names, or the document element when it
 *   names none, resolves it as a custom property.
 * - `computed` — the element `within` names, or that element's parent under
 *   `parent`, resolves `property`; the value the host snapshot holds under
 *   `record` is compared as the host's own output, so a difference is reported
 *   as an observation (D77).
 * - `global` — the dotted path resolves on the page.
 * - `value` — the string appears as the value of some attribute.
 * - `rail-geometry` — the rail's marks and its scroller's content height agree
 *   with `turn.rail-pitch` and `turn.rail-inset`.
 * - `none` — no page form: a number, a value only another platform writes, or a
 *   literal of a plugin this instance does not install. The behaviour scenarios
 *   and the unit tests hold these; the contract test reports them by id so a
 *   host upgrade still walks the whole list.
 */
type HostDomProbeKind = 'selector' | 'attribute' | 'property' | 'computed' | 'global' | 'value' | 'rail-geometry' | 'none'

/** How the contract test checks one entry against a live host. */
interface HostDomProbe {
  state: HostDomProbeState
  kind: HostDomProbeKind
  /** At least how many matches a selector needs; defaults to 1. */
  min?: number
  /** The entry a relative selector, a property or a geometry check is resolved against. */
  within?: string
  /** The computed property a `computed` probe reads, such as `padding-bottom`. */
  property?: string
  /** A `computed` probe reads the parent of the element `within` names. */
  parent?: true
  /** The host snapshot's key holding the value a `computed` probe expects. */
  record?: string
}

/**
 * One entry of the table: the literal the host writes, and what the skin reads
 * it for.
 */
interface HostDomEntry {
  /** Stable id; a feature manifest names it (D72) and the contract test reports by it. */
  id: string
  /** The literal, as the host writes it. */
  value: string
  /** How the contract test checks it (D77). */
  probe: HostDomProbe
  /**
   * A bare attribute name (`data-placeholder`) rather than a selector: what the
   * skin reads with `getAttribute`, so packages/contracts/src/dom.ts may export
   * the name alone.
   */
  name?: string
  /** What the host means by it, and what reads it. */
  use: string
  /**
   * Set on an entry no feature reads: the plugin's own shell does, through the
   * core and shared modules (the boot graph, stylesheet parking, the peer
   * verdict, the yield). Every other entry is named by a feature manifest.
   */
  owner?: 'core'
}

export const HOST_DOM: HostDomEntry[] = [
  { id: 'chat.flow-block', value: dom.FLOW_BLOCK_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'a flow block: a new one is this piece of the stream moving on, and a direct call\u2019s own block is the box its row takes in the list; the flow children the sodium rewrite buckets its gap rules on (D78)' },
  { id: 'chat.flow', value: dom.CHAT_FLOW_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the chat column: the root every chat-area behaviour scopes to' },
  { id: 'chat.flow-slot', value: dom.CHAT_FLOW_SLOT_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the slot the chat column renders its flow into; its children and the column’s are the ones the host’s flow rules space, and the slot itself is one of the column’s children the sodium rewrite buckets its gap rules on (D78)' },
  { id: 'chat.process-answer', value: dom.TURN_PROCESS_ANSWER_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'the answer a process group closes on, named in the host’s gap rule the sodium table matches whole (D78)' },
  { id: 'chat.process-member', value: dom.TURN_PROCESS_MEMBER_ATTRIBUTE, probe: { state: 'conversation', kind: 'attribute' }, use: 'a row of a turn’s process; an ended turn’s assistant step without it is the answer its process groups fold for, under either collapse timing' },
  { id: 'chat.turn-process-kind', value: dom.TURN_PROCESS_ROW_KIND, probe: { state: 'any', kind: 'none' }, use: 'the kind of a turn’s process group, named in the host’s gap rule the sodium table matches whole (D78)' },
  { id: 'chat.group-part-response', value: dom.CHAT_GROUP_PART_RESPONSE, probe: { state: 'any', kind: 'none' }, use: 'the part value of a step’s output row, named in the host’s gap rule the sodium table matches whole (D78)' },
  { id: 'chat.node', value: dom.CHAT_NODE_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the node a flow item renders its message into; an item whose node is empty is the one the host’s flow rules collapse, which the sodium rewrite keeps as an attribute (D78)' },
  { id: 'chat.call', value: dom.CHAT_CALL_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'one tool call row: structure the follow watches for, and the estimate prices the call by the tool it runs' },
  { id: 'chat.call-tool', value: dom.CHAT_CALL_TOOL_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the host’s tool view inside a call row, which names the tool the call runs' },
  { id: 'chat.call-tool-attribute', value: dom.CHAT_CALL_TOOL_ATTRIBUTE, probe: { state: 'conversation', kind: 'attribute' }, use: 'the same contract as an attribute name: the tool a call row runs' },
  { id: 'chat.think-row', value: dom.THINK_ROW_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'one thinking row, folded and quoted by its phase' },
  { id: 'chat.reasoning-text', value: dom.REASONING_TEXT_SELECTOR, probe: { state: 'streaming', kind: 'selector' }, use: 'the Markdown the host renders, which a thinking row\'s reasoning body wraps and the window slides' },
  { id: 'chat.think-running', value: dom.RUNNING_STATE, probe: { state: 'streaming', kind: 'value' }, use: 'the phase value while the model is still thinking' },
  { id: 'chat.phase', value: dom.ROW_PHASE_ATTRIBUTE, probe: { state: 'conversation', kind: 'attribute' }, use: 'the phase of a thinking row or a tool call\u2019s own view; the fold opens a thinking row while it reads `running`, and the follow notices one leaving it' },
  { id: 'chat.streaming', value: dom.STREAMING_SELECTOR, probe: { state: 'streaming', kind: 'selector' }, use: 'the markdown container while an answer streams' },
  { id: 'chat.streaming-attribute', value: dom.STREAMING_ATTRIBUTE, probe: { state: 'streaming', kind: 'attribute' }, use: 'the same mark as an attribute name, watched appearing and going' },
  { id: 'chat.shimmer', value: dom.SHIMMER_SELECTOR, probe: { state: 'streaming', kind: 'selector' }, use: 'TextShimmer still sweeping: that content is still moving' },
  { id: 'chat.shimmer-attribute', value: dom.SHIMMER_ATTRIBUTE, probe: { state: 'streaming', kind: 'attribute' }, use: 'the shimmer mark as an attribute name, in the fold\u2019s mutation filter' },
  { id: 'chat.shimmer-legacy-attribute', value: dom.SHIMMER_LEGACY_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'the shimmer mark an older host build writes; the current one writes data-shimmer' },
  { id: 'chat.scroller', value: dom.CONVERSATION_SCROLL_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the session scroller the host hangs its own follow off' },
  { id: 'chat.content', value: dom.CONVERSATION_CONTENT_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the conversation body under the phase root, which declares the two widths below; its children are the scroller and the width handles, where the column scale declares them again' },
  { id: 'chat.content-width', value: dom.CHAT_CONTENT_WIDTH_PROPERTY, probe: { state: 'conversation', kind: 'property', within: 'chat.content' }, use: 'the column width the messages, the width handles and the mascot are drawn to, which the column scale multiplies' },
  { id: 'composer.card-max-width', value: dom.COMPOSER_CARD_MAX_WIDTH_PROPERTY, probe: { state: 'conversation', kind: 'property', within: 'chat.content' }, use: 'the composer card’s widest, the column width plus the card’s margin; the column scale shrinks its column part and keeps the margin' },
  { id: 'chat.following-tail', value: dom.FOLLOWING_TAIL_SELECTOR, probe: { state: 'streaming', kind: 'selector' }, use: 'present while the host follow is on; the scroll owner hands it back through it' },
  { id: 'chat.following-tail-attribute', value: dom.FOLLOWING_TAIL_ATTRIBUTE, probe: { state: 'streaming', kind: 'attribute' }, use: 'the same mark as an attribute name' },
  { id: 'chat.follow-threshold', value: String(dom.FOLLOW_THRESHOLD_PX), probe: { state: 'any', kind: 'none' }, use: 'how close to the end counts as reading the tail, by the host\u2019s own line' },
  { id: 'chat.running', value: dom.CHAT_RUNNING_SELECTOR, probe: { state: 'streaming', kind: 'selector' }, use: 'the live turn\u2019s status line at the end of the flow, which the status feature pins while the reader is at the tail; a child of the flow the sodium rewrite buckets its gap rules on (D78)' },
  { id: 'chat.running-holding', value: dom.CHAT_RUNNING_HOLDING_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'marks the running row the host keeps after the turn stops: it still matches chat.running and still holds its content span, so the waiting line must not draw into it or a second line sits beside the live row\u2019s own (chat-wait)' },
  { id: 'composer.seat', value: dom.COMPOSER_SELECTOR, probe: { state: 'hero', kind: 'selector' }, use: 'the composer seat: a pointer or key inside it is the reader typing' },
  { id: 'composer.activity-slot', value: dom.CONVERSATION_ACTIVITY_SLOT_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the slot a plugin mounts its own entry in, beside the model seat: the built-in voice input puts its microphone there, and the seat around the slot stands down while nothing is in it' },
  { id: 'composer.input', value: dom.COMPOSER_INPUT_SELECTOR, probe: { state: 'hero', kind: 'selector' }, use: 'the editable draft: caret motion and the send flight read it' },
  { id: 'composer.composing', value: dom.COMPOSER_COMPOSING_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'the draft is part-way through an input-method composition, raised by the host\u2019s composer keymap for its span: the fold presses outside the composer wait for it to land, because a focus or selection moved under a composition makes the browser drop the letters typed but not committed' },
  { id: 'composer.card', value: dom.COMPOSER_CARD_SELECTOR, probe: { state: 'hero', kind: 'selector' }, use: 'the composer card the send flight lifts a copy of' },
  { id: 'composer.bar', value: dom.COMPOSER_CARD_SELECTOR, probe: { state: 'conversation', kind: 'computed', within: 'composer.card', parent: true, property: 'padding-bottom', record: 'composer.bar.paddingBottom' }, use: 'the host’s input bar around the composer card, which pads the room under it; the gap stops write over that padding and the default stop leaves it standing' },
  { id: 'composer.overlay', value: dom.COMPOSER_OVERLAY_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the card\u2019s overlay seat, where the host mounts its @ and / menus: the part walk does not read the composer\u2019s class names inside it, because a menu row\u2019s own trailing cluster is not the toolbar\u2019s (D3)', owner: 'core' },
  { id: 'composer.scroll', value: dom.COMPOSER_SCROLL_SELECTOR, probe: { state: 'hero', kind: 'selector' }, use: 'the draft\u2019s own scroll area inside the card' },
  { id: 'composer.textarea', value: dom.COMPOSER_TEXTAREA_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'a question card\u2019s answer box or a queued message\u2019s inline editor; neither is on the page of a plain turn' },
  { id: 'composer.question-card', value: dom.QUESTION_CARD_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the card the host mounts for a question it asks the reader: the question, the options it offers and the box the answer is written in; a plain turn mounts none' },
  { id: 'composer.question-option', value: dom.QUESTION_OPTION_ROW_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'one option row of a question card: the row the reader picks from, and the button in it that carries the mark of the option taken' },
  { id: 'chat.question-reply', value: dom.QUESTION_REPLY_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the settled reply the host mounts for the answer the reader chose, with the question it answers and the answer itself' },
  { id: 'composer.echo', value: dom.SUBMISSION_ECHO_SELECTOR, probe: { state: 'sending', kind: 'selector' }, use: 'the echo bubble mounted the moment a submission goes through; a child of the flow the sodium rewrite buckets its gap rules on (D78)' },
  { id: 'chat.pending-steering', value: dom.PENDING_STEERING_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the bubble a steering message stands as until the turn takes it in, a child of the flow the sodium rewrite buckets its gap rules on (D78); it exists only while the reader steers a live turn, which no lane state does' },
  { id: 'composer.stack', value: dom.COMPOSER_STACK_SELECTOR, probe: { state: 'hero', kind: 'selector' }, use: 'the card with the todo, goal and queue cards stacked above it' },
  { id: 'composer.placeholder', value: dom.COMPOSER_PLACEHOLDER_SELECTOR, probe: { state: 'hero', kind: 'selector' }, use: 'the placeholder the host\u2019s own editor draws inside the draft' },
  { id: 'composer.placeholder-attribute', value: dom.COMPOSER_PLACEHOLDER_SELECTOR, name: dom.COMPOSER_PLACEHOLDER_ATTRIBUTE, probe: { state: 'hero', kind: 'attribute' }, use: 'the field’s own words while the host draws no hint of its own, which the skin reads in place of the node a rebuild has just dropped' },
  { id: 'composer.attachment-rail', value: dom.COMPOSER_ATTACHMENT_RAIL_SELECTOR, probe: { state: 'hero', kind: 'none' }, use: 'the rail ui-attachment draws a draft’s files into, above the field: its local class is the one mark an attachment leaves while the parts walk has not reached the node, and the composer pass reads a card’s attachments by it; the rail is drawn only while a draft holds files, which no lane state does' },
  { id: 'composer.stats', value: dom.COMPOSER_STATS_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the container the host marked around its statistics before it marked each figure; the skin reads whichever is there' },
  { id: 'composer.mobile-portrait', value: dom.MOBILE_PORTRAIT_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the portrait adaptation a mobile remote plugin applies to the desktop GUI; the composer pass turns it into the skin\u2019s own mark, which keeps the phone rules from stacking with that layer\u2019s own transforms' },
  { id: 'composer.stat', value: dom.COMPOSER_STAT_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'one figure of the host\u2019s statistics in the composer stack, which the context panel repeats' },
  { id: 'composer.variant', value: dom.COMPOSER_VARIANT_ATTRIBUTE, probe: { state: 'hero', kind: 'attribute' }, use: 'which composer the host rendered: the hero\u2019s or the conversation\u2019s' },
  { id: 'composer.access-trigger', value: dom.PERMISSION_TRIGGER_SELECTOR, probe: { state: 'hero', kind: 'selector' }, use: 'the host\u2019s access-mode trigger inside its permission slot' },
  { id: 'composer.dialog-trigger', value: dom.DIALOG_TRIGGER_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'a host button that opens a dialog (the context meter and the statistics pills); the context panel tells a figure\u2019s own trigger by it, and the ring the skin draws presses the meter\u2019s trigger to open the host\u2019s panel. The newer host keeps none on the hero page, where the composer stands without a reading' },
  { id: 'composer.meter-fill', value: dom.CONTEXT_METER_FILL_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the filled arc of the context meter: the circle the host gives a dash array, painted with the colour the occupancy fell on where the host\u2019s ring keeps its place' },
  { id: 'composer.fallback-panel', value: dom.CHAIN_OVERLAY_FALLBACK_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'the host\u2019s panel that replaces the composer card, which the mascot stands on' },
  { id: 'process.group', value: dom.PROCESS_GROUP_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'every process group root: auto-fold and the fold glide work on it' },
  { id: 'process.body', value: dom.PROCESS_BODY_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'a group\u2019s capped body, with its own scrollbar' },
  { id: 'process.content', value: dom.PROCESS_CONTENT_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the layer inside a body that actually changes size' },
  { id: 'chat.assistant-step-kind', value: dom.ASSISTANT_STEP_KIND, probe: { state: 'conversation', kind: 'value' }, use: 'the kind of an assistant step\u2019s row; inside a process group it is a thought or an output in the header\u2019s figures' },
  { id: 'chat.tool-call-kind', value: dom.TOOL_CALL_KIND, probe: { state: 'any', kind: 'none' }, use: 'the kind of a tool call\u2019s row, counted as a tool in the header\u2019s figures; the lane\u2019s processSummary scenario holds it' },
  { id: 'chat.group-part', value: dom.CHAT_GROUP_PART_ATTRIBUTE, probe: { state: 'conversation', kind: 'attribute' }, use: 'which part of an assistant step a row holds, which tells a thought from an output' },
  { id: 'chat.group-part-reasoning', value: dom.CHAT_GROUP_PART_REASONING, probe: { state: 'conversation', kind: 'value' }, use: 'the part value of a step\u2019s thinking row' },
  { id: 'process.header-label', value: dom.PROCESS_HEADER_LABEL_SELECTOR, probe: { state: 'conversation', kind: 'selector', within: 'process.activity' }, use: 'the words of a process group\u2019s header, which the counted summary stands in for' },
  { id: 'chat.running-text', value: dom.CHAT_RUNNING_TEXT_SELECTOR, probe: { state: 'streaming', kind: 'selector', within: 'chat.running' }, use: 'the words of the live turn\u2019s running row, which the waiting line stands in for beside the host\u2019s whale' },
  { id: 'chat.running-icon', value: dom.CHAT_RUNNING_ICON_SELECTOR, probe: { state: 'streaming', kind: 'selector', within: 'chat.running' }, use: 'the host\u2019s own running indicator at the head of the live turn\u2019s row, which the waiting line hides under the Claude brand and stands its own loader in for' },
  { id: 'chat.motion-scope', value: dom.CHAT_MOTION_SCOPE_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the chat column while the host animates its own folds, where a process group’s body rolls shut on the host’s clock and the fold glide leaves the closing to it; only the next-input collapse timing sets it, and the lane runs the default timing' },
  { id: 'process.expanded-mode', value: dom.PROCESS_EXPANDED_MODE_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'on a group root while the tier does not cap the body; the lane\u2019s tiers all cap it' },
  { id: 'process.activity', value: dom.PROCESS_ACTIVITY_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'a process group\u2019s header control' },
  { id: 'chat.turn-attribute', value: dom.CHAT_TURN_ATTRIBUTE, probe: { state: 'conversation', kind: 'attribute' }, use: 'the turn a chat row belongs to' },
  { id: 'chat.user-row', value: dom.FLOW_KIND_ATTRIBUTE, probe: { state: 'conversation', kind: 'attribute' }, use: 'what a flow row is; `user` marks a settled user row' },
  { id: 'chat.user-kind', value: dom.USER_ROW_KIND, probe: { state: 'conversation', kind: 'value' }, use: 'the kind value of a settled user row, whose arrival stands the stream glide down' },
  { id: 'fold.disclosure', value: dom.DISCLOSURE_ROW_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'a DisclosureRow: the fold glide presses its own body' },
  { id: 'fold.disclosure-header', value: dom.DISCLOSURE_HEADER_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the header a host build wraps around a DisclosureRow’s row and its accessory, which the fold glide and the entrance fade step out of to reach the body; the build the CI lane pins writes none, so the page has no form to require, and the reasoningStream scenario holds the thinking row’s door on whichever shape it meets' },
  { id: 'fold.expandable', value: dom.DISCLOSURE_EXPANDABLE_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'a DisclosureRow with a body to open, which the column layout gives a trailing chevron' },
  { id: 'fold.shimmer-decoration', value: dom.SHIMMER_DECORATION_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the separator in front of a row’s description, written only when there is one: the column layout sets the title aside where it stands' },
  { id: 'chat.think-preview', value: dom.THINK_PREVIEW_ATTRIBUTE, probe: { state: 'conversation', kind: 'attribute' }, use: 'on a thinking row whose folded line shows the thought, the only kind whose title the column layout sets aside' },
  { id: 'chat.generic-tool-row', value: dom.GENERIC_TOOL_ROW_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the row of a call no named row draws, whose generic title the column layout sets aside; the lane’s scripted tools all have named rows' },
  { id: 'fold.expanded', value: dom.EXPANDED_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'present only while an expandable row stands open, so a settled page carries none of them; the fold reads it to tell a thinking row that already stands as its phase asks from one it still has to press' },
  { id: 'fold.toggle', value: dom.FOLD_TOGGLE_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'any other control that opens and closes something' },
  { id: 'fold.skipped', value: dom.FOLD_SKIPPED_CONTROL_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'a turn\u2019s header and trigger notice: skipped whole' },
  { id: 'turn.rail', value: dom.TURN_RAIL_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the host\u2019s turn rail, which the skin\u2019s navigator replaces in place' },
  { id: 'turn.rail-scroller', value: dom.TURN_RAIL_SCROLLER_SELECTOR, probe: { state: 'conversation', kind: 'selector', within: 'turn.rail' }, use: 'the rail\u2019s own scroller, whose content height gives the mark count' },
  { id: 'turn.rail-mark', value: dom.TURN_RAIL_MARK_SELECTOR, probe: { state: 'conversation', kind: 'selector', within: 'turn.rail', min: 2 }, use: 'one rail mark: the place the host states for it or, where it states none, its order in a rail that renders every mark' },
  { id: 'turn.rail-current', value: dom.TURN_RAIL_CURRENT_SELECTOR, probe: { state: 'conversation', kind: 'selector', within: 'turn.rail' }, use: 'the mark of the turn at the reading position' },
  { id: 'turn.rail-pitch', value: String(dom.TURN_RAIL_PITCH), probe: { state: 'conversation', kind: 'rail-geometry' }, use: 'the rail\u2019s fixed pitch, which the skin\u2019s own rail matches' },
  { id: 'turn.rail-inset', value: String(dom.TURN_RAIL_INSET), probe: { state: 'any', kind: 'none' }, use: 'the rail\u2019s inset at each end, read by the same geometry check as turn.rail-pitch' },
  { id: 'conversation.session', value: dom.CONVERSATION_SESSION_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the shown conversation column' },
  { id: 'conversation.session-attribute', value: dom.CONVERSATION_SESSION_ATTRIBUTE, probe: { state: 'conversation', kind: 'attribute' }, use: 'the session id the column carries' },
  { id: 'header.row', value: dom.HEADER_TITLE_ROW_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the header\u2019s title row: the line the title, the utilities and the corner seat share, and what the band placement measures against' },
  { id: 'header.title', value: dom.HEADER_TITLE_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the session title\u2019s own breadcrumb; the desktop caption row lifts it when it fits' },
  { id: 'header.utilities', value: dom.HEADER_UTILITIES_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the header\u2019s utilities cluster (the workspace opener, the overflow menu, the bottom-panel toggle), lifted with it' },
  { id: 'header.corner', value: dom.HEADER_CORNER_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the corner seat beside the utilities, carrying the right-sidebar toggle' },
  { id: 'header.element', value: dom.CONVERSATION_HEADER_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the conversation header, resolved with closest() from the title row; queried document-wide the substring names a dozen other bars' },
  { id: 'header.view-tabs', value: dom.VIEW_TABS_STRIP_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the view-tab strip inside the header, whose box the band placement keeps clear of' },
  { id: 'header.view-tabs-list', value: dom.VIEW_TABS_LIST_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the tablist inside the strip where the host wraps it in a row: the plate the skin draws, and the box the placements read there instead of the row' },
  { id: 'header.conversation-tabs', value: dom.CONVERSATION_TABS_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the conversation’s own view tablist; the composer stands down while a tab other than its first is selected, and a tablist any plugin renders elsewhere in the conversation root is no view switch' },
  { id: 'shell.phase', value: dom.PHASE_ATTRIBUTE, probe: { state: 'any', kind: 'attribute' }, use: 'the page\u2019s phase: hero before a session is chosen, active once one is shown' },
  { id: 'shell.foot-area', value: dom.FOOT_AREA_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the sidebar footer block the account entry lives in' },
  { id: 'shell.sidebar-search', value: dom.SIDEBAR_SEARCH_SLOT_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the host\u2019s own sidebar search: the skin\u2019s box stands in for it, and the `icon` style leaves the host\u2019s button in place and takes its click over' },
  { id: 'shell.sidebar-root', value: dom.SIDEBAR_ROOT_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the sidebar column\u2019s own box, whose right edge the surface switch lines up with in the desktop caption strip' },
  { id: 'shell.sidebar-logo-row', value: dom.SIDEBAR_LOGO_ROW_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the sidebar\u2019s top row: the wide brand and the toggle, and the seat the collapsed rail keeps for its own mark; the search box\u2019s rail row goes under it' },
  { id: 'shell.sidebar-brand', value: dom.SIDEBAR_BRAND_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the wide brand in the sidebar\u2019s top row, which the collapsed rail lacks: the search box and the web\u2019s surface switch follow it' },
  { id: 'shell.sidebar-toggle', value: dom.SIDEBAR_TOGGLE_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the collapse toggle at the top row\u2019s end; the surface switch goes before it on the web and clears it in the desktop caption strip' },
  { id: 'shell.menu', value: dom.MENU_ROLE_SELECTOR, probe: { state: 'menu', kind: 'selector' }, use: 'an open host menu: the foreground, and where the account rows go' },
  { id: 'shell.menu-list', value: dom.MENU_LIST_SELECTOR, probe: { state: 'menu', kind: 'selector' }, use: 'the host menu\u2019s own list element' },
  { id: 'shell.foreground', value: dom.FOREGROUND_SELECTOR, probe: { state: 'menu', kind: 'selector' }, use: 'everything that counts as foreground: a modal dialog or an open menu' },
  { id: 'shell.account-trigger', value: dom.ACCOUNT_TRIGGER_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the host\u2019s own account trigger in the footer, marked with the sign-in state; the web build mounts no account menu there, so the skin\u2019s account surface builds itself' },
  { id: 'shell.settings-button', value: dom.SETTINGS_BUTTON_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the host\u2019s settings button the account menu rows open' },
  { id: 'shell.footer-actions', value: dom.FOOTER_ACTIONS_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the footer\u2019s action list the drawer mirrors' },
  { id: 'shell.slot-anchor', value: dom.SLOT_ANCHOR_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'a slot anchor; its children are the host\u2019s real entries' },
  { id: 'shell.root-slot', value: dom.ROOT_SLOT_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the root slot: the shell frame is its own element child, and the three columns are what the part walk reads inside it (D3)', owner: 'core' },
  { id: 'shell.sidebar-slot', value: dom.SIDEBAR_SLOT_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the sidebar\u2019s slot anchor: the region the part walk reads the sidebar\u2019s own class names in (D3)', owner: 'core' },
  { id: 'shell.header-slot', value: dom.CONVERSATION_HEADER_SLOT_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the conversation header\u2019s slot anchor: the region the part walk reads the header\u2019s class names in (D3)', owner: 'core' },
  { id: 'shell.rightbar-column', value: dom.RIGHTBAR_COLUMN_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the right sidebar\u2019s own column, marked by the host; the docked panels the skin draws as cards are read here (D3)', owner: 'core' },
  { id: 'shell.rightbar-toggle', value: dom.RIGHTBAR_TOGGLE_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the right panel\u2019s own collapse control, present only while that panel is open; the skin\u2019s own button in the header\u2019s row presses it, because its own subtree is transformed and clipped and it cannot be placed there' },
  { id: 'shell.rightbar-panel', value: dom.RIGHTBAR_PANEL_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the right panel\u2019s own box, mounted only once that panel has been opened: the host states its width from the viewport\u2019s pixels, which the page\u2019s zoom scales a second time' },
  { id: 'shell.rightbar-handle', value: dom.RIGHTBAR_HANDLE_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the right column\u2019s drag handle: the host places it from the viewport\u2019s own width, so it leaves the panel\u2019s visible edge under the page\u2019s zoom' },
  { id: 'shell.sidebar-handle', value: dom.SIDEBAR_HANDLE_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the sidebar\u2019s drag handle, mounted only while the sidebar is expanded: the host places it at the sidebar\u2019s width, which the page\u2019s zoom scales a second time', owner: 'core' },
  { id: 'shell.sidebar-collapsed', value: dom.SIDEBAR_COLLAPSED_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'the frame\u2019s collapse marker, written only while the sidebar is closed: the peek opens only from it, and its return is when the peek gives the column back to the grid' },
  { id: 'shell.rightbar-collapsed', value: dom.RIGHTBAR_COLLAPSED_ATTRIBUTE, probe: { state: 'any', kind: 'attribute' }, use: 'the frame gives the right panel no track; while it is absent on a narrow frame, opening the sidebar would take that panel away, so the peek stays shut' },
  { id: 'shell.sidebar-beside-rightbar', value: String(dom.SIDEBAR_BESIDE_RIGHTBAR_MIN_PX), probe: { state: 'any', kind: 'none' }, use: 'the narrowest frame the host keeps an open right panel on beside an open sidebar; below it the peek stays shut, since opening the sidebar would take that panel away' },
  { id: 'shell.windows-titlebar', value: dom.WINDOWS_TITLEBAR_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'the Windows caption row is on this page: only the desktop shell writes it' },
  { id: 'shell.windows-menu', value: dom.WINDOWS_MENU_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the desktop shell\u2019s own seat in the Windows caption row, where its native menu draws; the row\u2019s content starts after it, and only the desktop shell mounts it' },
  { id: 'shell.platform', value: dom.PLATFORM_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'which platform the shell runs on; the host marks `darwin` on the desktop and plain web never sets it' },
  { id: 'shell.fullscreen', value: dom.FULLSCREEN_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'the macOS window is fullscreen, so its traffic lights are away; only the desktop shell writes it' },
  { id: 'shell.windows-menu-start', value: dom.WINDOWS_MENU_START_PROPERTY, probe: { state: 'any', kind: 'none' }, use: 'where the Windows caption row’s content starts, declared by the host only while the sidebar is collapsed; the peek holds it at that value so the native menu stays put while the sidebar is open over the page' },
  { id: 'shell.top-clearance', value: dom.FRAME_TOP_CLEARANCE_PROPERTY, probe: { state: 'any', kind: 'none' }, use: 'the caption strip\u2019s height, which the band layout reads; only the desktop shell declares it' },
  { id: 'shell.skin-center', value: dom.SKIN_CENTER_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'another skin owns the page; this theme yields (D74). The host\u2019s skin center writes it, and the web profile mounts none', owner: 'core' },
  { id: 'shell.dark-theme', value: dom.DARK_THEME_ATTRIBUTE, probe: { state: 'dark', kind: 'attribute' }, use: 'the host flipped its own light/dark theme' },
  { id: 'boot.graph', value: '__DSH_BOOT__', probe: { state: 'any', kind: 'global' }, use: 'the boot graph, naming every client entry before any of them runs', owner: 'core' },
  { id: 'boot.peer-entry', value: 'dsh-chat-ux', probe: { state: 'any', kind: 'none' }, use: 'the peer plugin\u2019s entry id inside the boot graph, read to stand the chat features down (D74); this instance does not install it', owner: 'core' },
  { id: 'boot.peer-sheet', value: dom.PEER_SHEET_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the peer plugin\u2019s own stylesheet, the other half of that verdict; this instance does not install it' },
  { id: 'ds-bot.entry', value: 'ds-bot', probe: { state: 'any', kind: 'none' }, use: 'ds-bot\u2019s entry id inside the boot graph: the page has its Bot surface to give way to (D74); this instance does not install it', owner: 'core' },
  { id: 'ds-bot.surface', value: dom.DS_BOT_SURFACE_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'ds-bot\u2019s Bot surface is painted, so this theme gives the page way (D74); this instance does not install it', owner: 'core' },
  { id: 'ds-bot.saved-mode', value: 'ds-bot:surface', probe: { state: 'any', kind: 'none' }, use: 'the local storage key holding ds-bot\u2019s mode, read before its browser half runs so the first frame already belongs to the right owner (D74); this instance does not install it', owner: 'core' },
  { id: 'ds-bot.global', value: 'dshBot', probe: { state: 'any', kind: 'none' }, use: 'the registry ds-bot puts on `window` while its browser half runs; from then on its own attribute answers the verdict, before then its saved mode does (D74)', owner: 'core' },
  { id: 'ds-bot.return', value: dom.DS_BOT_RETURN_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'ds-bot\u2019s button back to its Bot surface, which the switch\u2019s Chat side presses; this instance does not install it' },
  { id: 'ds-bot.account', value: dom.DS_BOT_ACCOUNT_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'ds-bot\u2019s account button, which the switch\u2019s Code side opens to reach the Agent mode item; this instance does not install it' },
  { id: 'ds-bot.account-menu', value: dom.DS_BOT_ACCOUNT_MENU_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'ds-bot\u2019s account menu, kept out of sight while the switch presses its item; this instance does not install it' },
  { id: 'ds-bot.agent-item', value: dom.DS_BOT_AGENT_ITEM_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the one item after the account menu\u2019s last separator, ds-bot\u2019s switch to Agent mode; this instance does not install it' },
  { id: 'ds-bot.sidebar-top', value: dom.DS_BOT_SIDEBAR_TOP_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the top row of ds-bot\u2019s own sidebar, where the switch sits on the web while the Bot surface is painted; this instance does not install it' },
  { id: 'head.plugin-sheets', value: dom.PLUGIN_SHEET_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'every stylesheet a plugin module injected, which the sodium rewrite searches for the sheets its table lists (D78)' },
  { id: 'head.plugin-sheet-owner', value: dom.PLUGIN_SHEET_OWNER_ATTRIBUTE, probe: { state: 'any', kind: 'attribute' }, use: 'the package a plugin stylesheet belongs to, as the loader tags it' },
  { id: 'head.plugin-sheet-path', value: dom.PLUGIN_SHEET_PATH_ATTRIBUTE, probe: { state: 'any', kind: 'attribute' }, use: 'a plugin stylesheet’s own path inside its package, which names one sheet of the sodium table' },
  { id: 'footer.plugin-entry-part', value: dom.PLUGIN_ENTRY_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'the part a plugin control plays inside its footer entry; `entry` names the control the sidebar footer shows, which the skin keeps in the account row (constants.ts, FOOTER_SEATS)' },
  { id: 'footer.plugin-entry-owner', value: dom.PLUGIN_ENTRY_OWNER_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'the package a plugin’s footer control belongs to, so the update control is recognised by name rather than by a class the build hashes' },
  { id: 'footer.plugin-entry-update', value: dom.PLUGIN_ENTRY_UPDATE_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the update plugin’s own footer control, the button a reader presses to check for a newer build; this instance does not install it, and the account-menu behaviour spec mounts its own naming and holds the seat' },
  { id: 'boot.release', value: '__DSH_BOOT__.release.version', probe: { state: 'any', kind: 'global' }, use: 'the host release the boot graph was composed for, which the built-in plugins share: the version the sodium table reads for the host itself (D78)' },
  { id: 'head.untagged-sheets', value: dom.UNTAGGED_SHEET_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'every untagged stylesheet, which the host\u2019s claim sweep would otherwise take; read in the boot sweep, before the host tags its sheets, and the smoke\u2019s sibling cases hold it', owner: 'core' },
  { id: 'api.highlight', value: 'CSS.highlights', probe: { state: 'any', kind: 'global' }, use: 'the swept-text registry the token reveal needs; a browser without it gets no engine' },
  { id: 'api.highlight-constructor', value: 'Highlight', probe: { state: 'any', kind: 'global' }, use: 'the constructor that registry is built from' },
  { id: 'api.window-controls', value: 'navigator.windowControlsOverlay', probe: { state: 'any', kind: 'none' }, use: 'the desktop caption-button overlay, read to place the title bar band; a web page never has it' },
]
