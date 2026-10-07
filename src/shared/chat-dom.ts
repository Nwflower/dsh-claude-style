/**
 * The chat area's host contract, as the ported chat interactions
 * (docs/decisions D32) and the conversation navigator (D34) read it.
 *
 * Everything here is an attribute or selector the host itself writes. Its
 * class names carry a build-time hash and change with every release, so the
 * ported modules key on these instead. The whole table lives here however
 * many features read an entry — one host contract in one place, so reading
 * the two implementations side by side shows what the host offers without
 * walking six directories — and no feature keeps a second copy of anything
 * in it. What each feature writes itself stays in that feature's directory
 * (its own marks, class names, highlight and keyframe names).
 */
/** One per flow block: a new block means this piece of the stream moved on. */
export const FLOW_BLOCK_SELECTOR = '[data-chat-flow-key]'
/** The chat column. */
export const CHAT_FLOW_SELECTOR = '[data-chat-flow]'
/**
 * One tool call's row. It lives inside the assistant block, so it does not
 * have to arrive as a new flow block of its own.
 */
export const CHAT_CALL_SELECTOR = '[data-chat-call-id]'
/** One thinking row; its phase is its data-state attribute. */
export const THINK_ROW_SELECTOR = '[data-variant="think"]'
/** The phase value while the model is still thinking. */
export const RUNNING_STATE = 'running'
/** The markdown layer marks the container with this while an assistant message streams. */
export const STREAMING_SELECTOR = '[data-streaming]'
/** The same contract as an attribute name: the reveal watches it appearing and going. */
export const STREAMING_ATTRIBUTE = 'data-streaming'
/**
 * TextShimmer's swept element: while it is attached, that piece of content
 * is still moving. The host renamed the attribute (data-text-shimmer to
 * data-shimmer) in its 2026-09 update, so both names are read.
 */
export const SHIMMER_SELECTOR = '[data-shimmer], [data-text-shimmer]'
/** The chat column's scroller; the host hangs its own follow off it. */
export const CONVERSATION_SCROLL_SELECTOR = '[data-conversation-scroll]'
/** Present while the host's follow is on; its absence is how the follow reads as off. */
export const FOLLOWING_TAIL_ATTRIBUTE = 'data-chat-following-tail'
/** The same contract in selector form. */
export const FOLLOWING_TAIL_SELECTOR = '[data-chat-following-tail]'
/** How close to the end counts as reading the tail: the host's own threshold. */
export const FOLLOW_THRESHOLD_PX = 25
/** The composer area: a pointer or key inside it is the reader typing, not taking the scroll over. */
export const COMPOSER_SELECTOR = '[data-composer-seat]'
/** The composer's editable surface (contenteditable); the caret motion is drawn for it. */
export const COMPOSER_INPUT_SELECTOR = '[data-composer-input]'
/** The card the input sits in; the send flight lifts a copy of the whole card. */
export const COMPOSER_CARD_SELECTOR = '[data-composer-card]'
/** The draft's own scroll area inside that card. */
export const COMPOSER_SCROLL_SELECTOR = '[data-input-scroll]'
/** The echo bubble the host mounts the moment a submission goes through. */
export const SUBMISSION_ECHO_SELECTOR = '[data-submission-echo]'
/**
 * A plain text box inside the composer seat: a question card's answer box
 * (under [data-question-key]) and a queued message's inline editor (under
 * [data-queue-dock]). Both are textareas, in the main session and in the
 * sidebar's subagent sessions alike.
 */
export const COMPOSER_TEXTAREA_SELECTOR = '[data-composer-seat] textarea'
/** The keys that scroll the viewport; the same set the host reads. */
export const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '])
/** The host puts this on every process group. */
export const PROCESS_GROUP_SELECTOR = '[data-step-process]'
/** The host puts this on every process group's body. */
export const PROCESS_BODY_SELECTOR = '[data-step-process-body]'
/** The content layer inside a process group's body; that layer is the one that scrolls. */
export const PROCESS_CONTENT_SELECTOR = '[data-step-process-content]'
/** On a process group's root while this tier does not cap the body (detailed, fully expanded). */
export const PROCESS_EXPANDED_MODE_ATTRIBUTE = 'data-group-expanded-mode'
/** On every chat row: the turn the row belongs to. */
export const CHAT_TURN_ATTRIBUTE = 'data-chat-turn'
/**
 * The turn rail (ui-chat's TurnNavigator): a nav at the conversation's
 * right edge with one mark per turn, absent below two turns and hidden
 * when the conversation is narrow. It is the one nav in the chat frame.
 */
export const TURN_RAIL_SELECTOR = `${CONVERSATION_SCROLL_SELECTOR} nav[class*="_frame"]`
/** The rail's own scroller, its first child: the marks scroll inside it. */
export const TURN_RAIL_SCROLLER_SELECTOR = ':scope > [class*="_scroller"]'
/**
 * One mark: a button carrying its position in the rail's list, not its
 * turn number. The rail renders only the marks near its scroll position.
 */
export const TURN_RAIL_MARK_SELECTOR = 'button[data-index]'
/** The mark of the turn at the reading position. */
export const TURN_RAIL_CURRENT_SELECTOR = 'button[data-index][aria-current="true"]'
/**
 * The rail's fixed pitch and its inset at each end (TurnNavigator's
 * TURN_SPACING_PX and RAIL_INSET_PX): its scroller's content is
 * `count × pitch + 2 × (inset − pitch / 2)` pixels tall.
 */
export const TURN_RAIL_PITCH = 10
export const TURN_RAIL_INSET = 6
