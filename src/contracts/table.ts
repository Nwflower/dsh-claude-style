/**
 * The host contract as one table (D44): the literals in src/contracts/dom.ts,
 * each with what the skin reads it for and the host build it was verified
 * against.
 *
 * The table is build and test data rather than runtime data: the browser bundle
 * carries the literals alone, so the notes cost the page nothing. The build
 * holds the two lists together — every exported literal of the DOM contract has
 * to appear here, and every id has to be named by a feature manifest (D42) — so
 * a selector cannot enter the skin without a note and an owner, and a host
 * upgrade can be audited from this list alone.
 */
import { ACCOUNT_TRIGGER_SELECTOR, CHAIN_OVERLAY_FALLBACK_ATTRIBUTE, CHAT_CALL_SELECTOR, CHAT_FLOW_SELECTOR, CHAT_TURN_ATTRIBUTE, COMPOSER_CARD_SELECTOR, COMPOSER_INPUT_SELECTOR, COMPOSER_PLACEHOLDER_SELECTOR, COMPOSER_SCROLL_SELECTOR, COMPOSER_SELECTOR, COMPOSER_STACK_SELECTOR, COMPOSER_TEXTAREA_SELECTOR, COMPOSER_VARIANT_ATTRIBUTE, CONVERSATION_SCROLL_SELECTOR, CONVERSATION_SESSION_ATTRIBUTE, CONVERSATION_SESSION_SELECTOR, DARK_THEME_ATTRIBUTE, DISCLOSURE_ROW_SELECTOR, FLOW_BLOCK_SELECTOR, FLOW_KIND_ATTRIBUTE, FOLLOWING_TAIL_ATTRIBUTE, FOLLOWING_TAIL_SELECTOR, FOLLOW_THRESHOLD_PX, FOLD_SKIPPED_CONTROL_SELECTOR, FOLD_TOGGLE_SELECTOR, FOOTER_ACTIONS_SELECTOR, FOOT_AREA_SELECTOR, FOREGROUND_SELECTOR, FRAME_TOP_CLEARANCE_PROPERTY, FULLSCREEN_ATTRIBUTE, MENU_LIST_SELECTOR, MENU_ROLE_SELECTOR, PEER_SHEET_SELECTOR, PERMISSION_TRIGGER_SELECTOR, PHASE_ATTRIBUTE, PLATFORM_ATTRIBUTE, PROCESS_ACTIVITY_SELECTOR, PROCESS_BODY_SELECTOR, PROCESS_CONTENT_SELECTOR, PROCESS_EXPANDED_MODE_ATTRIBUTE, PROCESS_GROUP_SELECTOR, RUNNING_STATE, SETTINGS_BUTTON_SELECTOR, SHIMMER_SELECTOR, SKIN_CENTER_ATTRIBUTE, SLOT_ANCHOR_SELECTOR, STREAMING_ATTRIBUTE, STREAMING_SELECTOR, SUBMISSION_ECHO_SELECTOR, THINK_ROW_SELECTOR, TURN_PROCESS_SELECTOR, TURN_RAIL_CURRENT_SELECTOR, TURN_RAIL_INSET, TURN_RAIL_MARK_SELECTOR, TURN_RAIL_PITCH, TURN_RAIL_SCROLLER_SELECTOR, TURN_RAIL_SELECTOR, UNTAGGED_SHEET_SELECTOR, USER_ROW_KIND, WINDOWS_TITLEBAR_ATTRIBUTE } from './dom'

/** The host build every entry below was verified against. */
export const HOST_VERIFIED = '0.2.1-alpha.1'

/**
 * One entry of the table: the literal the host writes, and what the skin reads
 * it for.
 */
export interface HostDomEntry {
  /** Stable id; a feature manifest names it (D42) and the contract test reports by it. */
  id: string
  /** The literal, as the host writes it. */
  value: string
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
  { id: 'chat.flow-block', value: FLOW_BLOCK_SELECTOR, use: 'a new flow block: this piece of the stream moved on' },
  { id: 'chat.flow', value: CHAT_FLOW_SELECTOR, use: 'the chat column: the root every chat-area behaviour scopes to' },
  { id: 'chat.call', value: CHAT_CALL_SELECTOR, use: 'one tool call row: structure the follow watches for' },
  { id: 'chat.think-row', value: THINK_ROW_SELECTOR, use: 'one thinking row, folded and quoted by its phase' },
  { id: 'chat.think-running', value: RUNNING_STATE, use: 'the phase value while the model is still thinking' },
  { id: 'chat.streaming', value: STREAMING_SELECTOR, use: 'the markdown container while an answer streams' },
  { id: 'chat.streaming-attribute', value: STREAMING_ATTRIBUTE, use: 'the same mark as an attribute name, watched appearing and going' },
  { id: 'chat.shimmer', value: SHIMMER_SELECTOR, use: 'TextShimmer still sweeping: that content is still moving' },
  { id: 'chat.scroller', value: CONVERSATION_SCROLL_SELECTOR, use: 'the session scroller the host hangs its own follow off' },
  { id: 'chat.following-tail', value: FOLLOWING_TAIL_SELECTOR, use: 'present while the host follow is on; the scroll owner hands it back through it' },
  { id: 'chat.following-tail-attribute', value: FOLLOWING_TAIL_ATTRIBUTE, use: 'the same mark as an attribute name' },
  { id: 'chat.follow-threshold', value: String(FOLLOW_THRESHOLD_PX), use: 'how close to the end counts as reading the tail, by the host\u2019s own line' },
  { id: 'composer.seat', value: COMPOSER_SELECTOR, use: 'the composer seat: a pointer or key inside it is the reader typing' },
  { id: 'composer.input', value: COMPOSER_INPUT_SELECTOR, use: 'the editable draft: caret motion and the send flight read it' },
  { id: 'composer.card', value: COMPOSER_CARD_SELECTOR, use: 'the composer card the send flight lifts a copy of' },
  { id: 'composer.scroll', value: COMPOSER_SCROLL_SELECTOR, use: 'the draft\u2019s own scroll area inside the card' },
  { id: 'composer.textarea', value: COMPOSER_TEXTAREA_SELECTOR, use: 'a question card\u2019s answer box or a queued message\u2019s inline editor' },
  { id: 'composer.echo', value: SUBMISSION_ECHO_SELECTOR, use: 'the echo bubble mounted the moment a submission goes through' },
  { id: 'composer.stack', value: COMPOSER_STACK_SELECTOR, use: 'the card with the todo, goal and queue cards stacked above it' },
  { id: 'composer.placeholder', value: COMPOSER_PLACEHOLDER_SELECTOR, use: 'the placeholder the host\u2019s own editor draws inside the draft' },
  { id: 'composer.variant', value: COMPOSER_VARIANT_ATTRIBUTE, use: 'which composer the host rendered: the hero\u2019s or the conversation\u2019s' },
  { id: 'composer.access-trigger', value: PERMISSION_TRIGGER_SELECTOR, use: 'the host\u2019s access-mode trigger inside its permission slot' },
  { id: 'composer.fallback-panel', value: CHAIN_OVERLAY_FALLBACK_ATTRIBUTE, use: 'the host\u2019s panel that replaces the composer card, which the mascot stands on' },
  { id: 'process.group', value: PROCESS_GROUP_SELECTOR, use: 'every process group root: auto-fold and the fold glide work on it' },
  { id: 'process.body', value: PROCESS_BODY_SELECTOR, use: 'a group\u2019s capped body, with its own scrollbar' },
  { id: 'process.content', value: PROCESS_CONTENT_SELECTOR, use: 'the layer inside a body that actually changes size' },
  { id: 'process.expanded-mode', value: PROCESS_EXPANDED_MODE_ATTRIBUTE, use: 'on a group root while the tier does not cap the body' },
  { id: 'process.activity', value: PROCESS_ACTIVITY_SELECTOR, use: 'a process group\u2019s header control' },
  { id: 'chat.turn-attribute', value: CHAT_TURN_ATTRIBUTE, use: 'the turn a chat row belongs to' },
  { id: 'chat.user-row', value: FLOW_KIND_ATTRIBUTE, use: 'what a flow row is; `user` marks a settled user row' },
  { id: 'chat.user-kind', value: USER_ROW_KIND, use: 'the kind value of a settled user row, whose arrival stands the stream glide down' },
  { id: 'turn.process', value: TURN_PROCESS_SELECTOR, use: 'the host\u2019s turn-process control the status line moves' },
  { id: 'fold.disclosure', value: DISCLOSURE_ROW_SELECTOR, use: 'a DisclosureRow: the fold glide presses its own body' },
  { id: 'fold.toggle', value: FOLD_TOGGLE_SELECTOR, use: 'any other control that opens and closes something' },
  { id: 'fold.skipped', value: FOLD_SKIPPED_CONTROL_SELECTOR, use: 'a turn\u2019s header and trigger notice: skipped whole' },
  { id: 'turn.rail', value: TURN_RAIL_SELECTOR, use: 'the host\u2019s turn rail, which the skin\u2019s navigator replaces in place' },
  { id: 'turn.rail-scroller', value: TURN_RAIL_SCROLLER_SELECTOR, use: 'the rail\u2019s own scroller, whose content height gives the mark count' },
  { id: 'turn.rail-mark', value: TURN_RAIL_MARK_SELECTOR, use: 'one rail mark, keyed by position in the rail\u2019s list' },
  { id: 'turn.rail-current', value: TURN_RAIL_CURRENT_SELECTOR, use: 'the mark of the turn at the reading position' },
  { id: 'turn.rail-pitch', value: String(TURN_RAIL_PITCH), use: 'the rail\u2019s fixed pitch, which the skin\u2019s own rail matches' },
  { id: 'turn.rail-inset', value: String(TURN_RAIL_INSET), use: 'the rail\u2019s inset at each end' },
  { id: 'conversation.session', value: CONVERSATION_SESSION_SELECTOR, use: 'the shown conversation column' },
  { id: 'conversation.session-attribute', value: CONVERSATION_SESSION_ATTRIBUTE, use: 'the session id the column carries' },
  { id: 'shell.phase', value: PHASE_ATTRIBUTE, use: 'the page\u2019s phase: hero before a session is chosen, active once one is shown' },
  { id: 'shell.foot-area', value: FOOT_AREA_SELECTOR, use: 'the sidebar footer block the account entry lives in' },
  { id: 'shell.menu', value: MENU_ROLE_SELECTOR, use: 'an open host menu: the foreground, and where the account rows go' },
  { id: 'shell.menu-list', value: MENU_LIST_SELECTOR, use: 'the host menu\u2019s own list element' },
  { id: 'shell.foreground', value: FOREGROUND_SELECTOR, use: 'everything that counts as foreground: a modal dialog or an open menu' },
  { id: 'shell.account-trigger', value: ACCOUNT_TRIGGER_SELECTOR, use: 'the host\u2019s own account trigger in the footer' },
  { id: 'shell.settings-button', value: SETTINGS_BUTTON_SELECTOR, use: 'the host\u2019s settings button the account menu rows open' },
  { id: 'shell.footer-actions', value: FOOTER_ACTIONS_SELECTOR, use: 'the footer\u2019s action list the drawer mirrors' },
  { id: 'shell.slot-anchor', value: SLOT_ANCHOR_SELECTOR, use: 'a slot anchor; its children are the host\u2019s real entries' },
  { id: 'shell.windows-titlebar', value: WINDOWS_TITLEBAR_ATTRIBUTE, use: 'the Windows caption row is on this page' },
  { id: 'shell.platform', value: PLATFORM_ATTRIBUTE, use: 'which platform the shell runs on' },
  { id: 'shell.fullscreen', value: FULLSCREEN_ATTRIBUTE, use: 'the macOS window is fullscreen, so its traffic lights are away' },
  { id: 'shell.top-clearance', value: FRAME_TOP_CLEARANCE_PROPERTY, use: 'the caption strip\u2019s height, which the band layout reads' },
  { id: 'shell.skin-center', value: SKIN_CENTER_ATTRIBUTE, use: 'another skin owns the page; this theme yields (D49)', owner: 'core' },
  { id: 'shell.dark-theme', value: DARK_THEME_ATTRIBUTE, use: 'the host flipped its own light/dark theme' },
  { id: 'boot.graph', value: '__DSH_BOOT__', use: 'the boot graph, naming every client entry before any of them runs', owner: 'core' },
  { id: 'boot.peer-entry', value: 'dsh-chat-ux', use: 'the peer plugin\u2019s entry id inside the boot graph, read to stand the chat features down (D32)', owner: 'core' },
  { id: 'boot.peer-sheet', value: PEER_SHEET_SELECTOR, use: 'the peer plugin\u2019s own stylesheet, the other half of that verdict' },
  { id: 'head.untagged-sheets', value: UNTAGGED_SHEET_SELECTOR, use: 'every untagged stylesheet, which the host\u2019s claim sweep would otherwise take', owner: 'core' },
  { id: 'api.highlight', value: 'CSS.highlights', use: 'the swept-text registry the token reveal needs; a browser without it gets no engine' },
  { id: 'api.highlight-constructor', value: 'Highlight', use: 'the constructor that registry is built from' },
  { id: 'api.window-controls', value: 'navigator.windowControlsOverlay', use: 'the desktop caption-button overlay, read to place the title bar band' },
]
