/**
 * The host contract as one table (D44): the literals in packages/contracts/src/dom.ts,
 * each with what the skin reads it for and how the contract test checks it on
 * a live host (D45).
 *
 * The table is build and test data rather than runtime data: the browser bundle
 * carries the literals alone, so the notes cost the page nothing. The build
 * holds the two lists together — every exported literal of the DOM contract has
 * to appear here, and every id has to be named by a feature manifest (D42) — so
 * a selector cannot enter the skin without a note and an owner, and a host
 * upgrade can be audited from this list alone.
 */
import { ACCOUNT_TRIGGER_SELECTOR, CHAIN_OVERLAY_FALLBACK_ATTRIBUTE, CHAT_CALL_SELECTOR, EXPANDED_ATTRIBUTE, ROW_PHASE_ATTRIBUTE, CHAT_FLOW_SELECTOR, CHAT_RUNNING_SELECTOR, CHAT_TURN_ATTRIBUTE, COMPOSER_CARD_SELECTOR, COMPOSER_INPUT_SELECTOR, COMPOSER_PLACEHOLDER_SELECTOR, COMPOSER_SCROLL_SELECTOR, COMPOSER_SELECTOR, COMPOSER_STACK_SELECTOR, COMPOSER_STATS_SELECTOR, COMPOSER_STAT_SELECTOR, COMPOSER_TEXTAREA_SELECTOR, COMPOSER_VARIANT_ATTRIBUTE, CONVERSATION_HEADER_SELECTOR, CONVERSATION_SCROLL_SELECTOR, CONVERSATION_SESSION_ATTRIBUTE, CONVERSATION_SESSION_SELECTOR, DARK_THEME_ATTRIBUTE, DIALOG_TRIGGER_SELECTOR, DISCLOSURE_ROW_SELECTOR, FLOW_BLOCK_SELECTOR, FLOW_KIND_ATTRIBUTE, FOLLOWING_TAIL_ATTRIBUTE, FOLLOWING_TAIL_SELECTOR, FOLLOW_THRESHOLD_PX, FOLD_SKIPPED_CONTROL_SELECTOR, FOLD_TOGGLE_SELECTOR, FOOTER_ACTIONS_SELECTOR, FOOT_AREA_SELECTOR, FOREGROUND_SELECTOR, FRAME_TOP_CLEARANCE_PROPERTY, FULLSCREEN_ATTRIBUTE, HEADER_CORNER_SELECTOR, HEADER_TITLE_ROW_SELECTOR, HEADER_TITLE_SELECTOR, HEADER_UTILITIES_SELECTOR, MENU_LIST_SELECTOR, MENU_ROLE_SELECTOR, PEER_SHEET_SELECTOR, PERMISSION_TRIGGER_SELECTOR, PHASE_ATTRIBUTE, PLATFORM_ATTRIBUTE, PROCESS_ACTIVITY_SELECTOR, PROCESS_BODY_SELECTOR, PROCESS_CONTENT_SELECTOR, PROCESS_EXPANDED_MODE_ATTRIBUTE, PROCESS_GROUP_SELECTOR, RUNNING_STATE, SETTINGS_BUTTON_SELECTOR, SHIMMER_ATTRIBUTE, SHIMMER_LEGACY_ATTRIBUTE, SHIMMER_SELECTOR, SKIN_CENTER_ATTRIBUTE, SLOT_ANCHOR_SELECTOR, STREAMING_ATTRIBUTE, STREAMING_SELECTOR, SUBMISSION_ECHO_SELECTOR, THINK_ROW_SELECTOR, TURN_PROCESS_SELECTOR, TURN_RAIL_CURRENT_SELECTOR, TURN_RAIL_INSET, TURN_RAIL_MARK_SELECTOR, TURN_RAIL_PITCH, TURN_RAIL_SCROLLER_SELECTOR, TURN_RAIL_SELECTOR, UNTAGGED_SHEET_SELECTOR, USER_ROW_KIND, VIEW_TABLIST_SELECTOR, VIEW_TABS_STRIP_SELECTOR, WINDOWS_MENU_SELECTOR, WINDOWS_TITLEBAR_ATTRIBUTE } from './dom'

/**
 * The page state an entry is checked in (D45): the empty page, the moment a
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
 * - `property` — the document element resolves it as a custom property.
 * - `global` — the dotted path resolves on the page.
 * - `value` — the string appears as the value of some attribute.
 * - `rail-geometry` — the rail's marks and its scroller's content height agree
 *   with `turn.rail-pitch` and `turn.rail-inset`.
 * - `none` — no page form: a number, a value only another platform writes, or a
 *   literal of a plugin this instance does not install. The behaviour scenarios
 *   and the unit tests hold these; the contract test reports them by id so a
 *   host upgrade still walks the whole list.
 */
type HostDomProbeKind = 'selector' | 'attribute' | 'property' | 'global' | 'value' | 'rail-geometry' | 'none'

/** How the contract test checks one entry against a live host. */
interface HostDomProbe {
  state: HostDomProbeState
  kind: HostDomProbeKind
  /** At least how many matches a selector needs; defaults to 1. */
  min?: number
  /** The entry a relative selector or a geometry check is resolved against. */
  within?: string
}

/**
 * One entry of the table: the literal the host writes, and what the skin reads
 * it for.
 */
interface HostDomEntry {
  /** Stable id; a feature manifest names it (D42) and the contract test reports by it. */
  id: string
  /** The literal, as the host writes it. */
  value: string
  /** How the contract test checks it (D45). */
  probe: HostDomProbe
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
  { id: 'chat.flow-block', value: FLOW_BLOCK_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'a new flow block: this piece of the stream moved on; the redraw tier\u2019s reading view writes it on its own rows too (D57)' },
  { id: 'chat.flow', value: CHAT_FLOW_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the chat column: the root every chat-area behaviour scopes to; the redraw tier\u2019s reading view writes it on its own column too (D57)' },
  { id: 'chat.call', value: CHAT_CALL_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'one tool call row: structure the follow watches for' },
  { id: 'chat.think-row', value: THINK_ROW_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'one thinking row, folded and quoted by its phase' },
  { id: 'chat.think-running', value: RUNNING_STATE, probe: { state: 'streaming', kind: 'value' }, use: 'the phase value while the model is still thinking' },
  { id: 'chat.phase', value: ROW_PHASE_ATTRIBUTE, probe: { state: 'conversation', kind: 'attribute' }, use: 'the phase of a thinking row or a tool call\u2019s own view; the fold opens a thinking row while it reads `running`, and the follow notices one leaving it' },
  { id: 'chat.streaming', value: STREAMING_SELECTOR, probe: { state: 'streaming', kind: 'selector' }, use: 'the markdown container while an answer streams' },
  { id: 'chat.streaming-attribute', value: STREAMING_ATTRIBUTE, probe: { state: 'streaming', kind: 'attribute' }, use: 'the same mark as an attribute name, watched appearing and going' },
  { id: 'chat.shimmer', value: SHIMMER_SELECTOR, probe: { state: 'streaming', kind: 'selector' }, use: 'TextShimmer still sweeping: that content is still moving' },
  { id: 'chat.shimmer-attribute', value: SHIMMER_ATTRIBUTE, probe: { state: 'streaming', kind: 'attribute' }, use: 'the shimmer mark as an attribute name, in the fold\u2019s mutation filter' },
  { id: 'chat.shimmer-legacy-attribute', value: SHIMMER_LEGACY_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'the shimmer mark an older host build writes; the current one writes data-shimmer' },
  { id: 'chat.scroller', value: CONVERSATION_SCROLL_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the session scroller the host hangs its own follow off' },
  { id: 'chat.following-tail', value: FOLLOWING_TAIL_SELECTOR, probe: { state: 'streaming', kind: 'selector' }, use: 'present while the host follow is on; the scroll owner hands it back through it' },
  { id: 'chat.following-tail-attribute', value: FOLLOWING_TAIL_ATTRIBUTE, probe: { state: 'streaming', kind: 'attribute' }, use: 'the same mark as an attribute name' },
  { id: 'chat.follow-threshold', value: String(FOLLOW_THRESHOLD_PX), probe: { state: 'any', kind: 'none' }, use: 'how close to the end counts as reading the tail, by the host\u2019s own line' },
  { id: 'chat.running', value: CHAT_RUNNING_SELECTOR, probe: { state: 'streaming', kind: 'selector' }, use: 'the live turn\u2019s status line at the end of the flow, which the status feature pins while the reader is at the tail; the reading view writes it on its live status line while the model or the turn is at work (D57)' },
  { id: 'composer.seat', value: COMPOSER_SELECTOR, probe: { state: 'hero', kind: 'selector' }, use: 'the composer seat: a pointer or key inside it is the reader typing' },
  { id: 'composer.input', value: COMPOSER_INPUT_SELECTOR, probe: { state: 'hero', kind: 'selector' }, use: 'the editable draft: caret motion and the send flight read it' },
  { id: 'composer.card', value: COMPOSER_CARD_SELECTOR, probe: { state: 'hero', kind: 'selector' }, use: 'the composer card the send flight lifts a copy of' },
  { id: 'composer.scroll', value: COMPOSER_SCROLL_SELECTOR, probe: { state: 'hero', kind: 'selector' }, use: 'the draft\u2019s own scroll area inside the card' },
  { id: 'composer.textarea', value: COMPOSER_TEXTAREA_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'a question card\u2019s answer box or a queued message\u2019s inline editor; neither is on the page of a plain turn' },
  { id: 'composer.echo', value: SUBMISSION_ECHO_SELECTOR, probe: { state: 'sending', kind: 'selector' }, use: 'the echo bubble mounted the moment a submission goes through; the reading view writes it on its own echo (D57)' },
  { id: 'composer.stack', value: COMPOSER_STACK_SELECTOR, probe: { state: 'hero', kind: 'selector' }, use: 'the card with the todo, goal and queue cards stacked above it' },
  { id: 'composer.placeholder', value: COMPOSER_PLACEHOLDER_SELECTOR, probe: { state: 'hero', kind: 'selector' }, use: 'the placeholder the host\u2019s own editor draws inside the draft' },
  { id: 'composer.stats', value: COMPOSER_STATS_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the container the host marked around its statistics before it marked each figure; the skin reads whichever is there' },
  { id: 'composer.stat', value: COMPOSER_STAT_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'one figure of the host\u2019s statistics in the composer stack, which the context panel repeats (D27)' },
  { id: 'composer.variant', value: COMPOSER_VARIANT_ATTRIBUTE, probe: { state: 'hero', kind: 'attribute' }, use: 'which composer the host rendered: the hero\u2019s or the conversation\u2019s' },
  { id: 'composer.access-trigger', value: PERMISSION_TRIGGER_SELECTOR, probe: { state: 'hero', kind: 'selector' }, use: 'the host\u2019s access-mode trigger inside its permission slot' },
  { id: 'composer.dialog-trigger', value: DIALOG_TRIGGER_SELECTOR, probe: { state: 'hero', kind: 'selector' }, use: 'a host button that opens a dialog (the model and effort pickers); the context panel tells a figure\u2019s own trigger by it' },
  { id: 'composer.fallback-panel', value: CHAIN_OVERLAY_FALLBACK_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'the host\u2019s panel that replaces the composer card, which the mascot stands on' },
  { id: 'process.group', value: PROCESS_GROUP_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'every process group root: auto-fold and the fold glide work on it' },
  { id: 'process.body', value: PROCESS_BODY_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'a group\u2019s capped body, with its own scrollbar' },
  { id: 'process.content', value: PROCESS_CONTENT_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the layer inside a body that actually changes size' },
  { id: 'process.expanded-mode', value: PROCESS_EXPANDED_MODE_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'on a group root while the tier does not cap the body; the lane\u2019s tiers all cap it' },
  { id: 'process.activity', value: PROCESS_ACTIVITY_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'a process group\u2019s header control' },
  { id: 'chat.turn-attribute', value: CHAT_TURN_ATTRIBUTE, probe: { state: 'conversation', kind: 'attribute' }, use: 'the turn a chat row belongs to; the reading view writes it on each turn (D57)' },
  { id: 'chat.user-row', value: FLOW_KIND_ATTRIBUTE, probe: { state: 'conversation', kind: 'attribute' }, use: 'what a flow row is; `user` marks a settled user row; the redraw tier\u2019s reading view writes it on its own rows too (D57)' },
  { id: 'chat.user-kind', value: USER_ROW_KIND, probe: { state: 'conversation', kind: 'value' }, use: 'the kind value of a settled user row, whose arrival stands the stream glide down' },
  { id: 'turn.process', value: TURN_PROCESS_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the host\u2019s turn-process control the status line moves' },
  { id: 'fold.disclosure', value: DISCLOSURE_ROW_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'a DisclosureRow: the fold glide presses its own body' },
  { id: 'fold.expanded', value: EXPANDED_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'present only while an expandable row stands open, so a settled page carries none of them; the fold reads it to tell a thinking row that already stands as its phase asks from one it still has to press' },
  { id: 'fold.toggle', value: FOLD_TOGGLE_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'any other control that opens and closes something' },
  { id: 'fold.skipped', value: FOLD_SKIPPED_CONTROL_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'a turn\u2019s header and trigger notice: skipped whole' },
  { id: 'turn.rail', value: TURN_RAIL_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the host\u2019s turn rail, which the skin\u2019s navigator replaces in place' },
  { id: 'turn.rail-scroller', value: TURN_RAIL_SCROLLER_SELECTOR, probe: { state: 'conversation', kind: 'selector', within: 'turn.rail' }, use: 'the rail\u2019s own scroller, whose content height gives the mark count' },
  { id: 'turn.rail-mark', value: TURN_RAIL_MARK_SELECTOR, probe: { state: 'conversation', kind: 'selector', within: 'turn.rail', min: 2 }, use: 'one rail mark, keyed by position in the rail\u2019s list' },
  { id: 'turn.rail-current', value: TURN_RAIL_CURRENT_SELECTOR, probe: { state: 'conversation', kind: 'selector', within: 'turn.rail' }, use: 'the mark of the turn at the reading position' },
  { id: 'turn.rail-pitch', value: String(TURN_RAIL_PITCH), probe: { state: 'conversation', kind: 'rail-geometry' }, use: 'the rail\u2019s fixed pitch, which the skin\u2019s own rail matches' },
  { id: 'turn.rail-inset', value: String(TURN_RAIL_INSET), probe: { state: 'any', kind: 'none' }, use: 'the rail\u2019s inset at each end, read by the same geometry check as turn.rail-pitch' },
  { id: 'conversation.session', value: CONVERSATION_SESSION_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the shown conversation column' },
  { id: 'conversation.session-attribute', value: CONVERSATION_SESSION_ATTRIBUTE, probe: { state: 'conversation', kind: 'attribute' }, use: 'the session id the column carries' },
  { id: 'header.row', value: HEADER_TITLE_ROW_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the header\u2019s title row: the line the title, the utilities and the corner seat share, and what the band placement measures against' },
  { id: 'header.title', value: HEADER_TITLE_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the session title\u2019s own breadcrumb; the desktop caption row lifts it when it fits' },
  { id: 'header.utilities', value: HEADER_UTILITIES_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the header\u2019s utilities cluster (the workspace opener, the overflow menu, the bottom-panel toggle), lifted with it' },
  { id: 'header.corner', value: HEADER_CORNER_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the corner seat beside the utilities, carrying the right-sidebar toggle' },
  { id: 'header.element', value: CONVERSATION_HEADER_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the conversation header, resolved with closest() from the title row; queried document-wide the substring names a dozen other bars' },
  { id: 'header.view-tabs', value: VIEW_TABS_STRIP_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the view-tab strip inside the header, whose box the band placement keeps clear of' },
  { id: 'header.view-tablist', value: VIEW_TABLIST_SELECTOR, probe: { state: 'conversation', kind: 'selector' }, use: 'the view-tab strip by its own mark, one `role="tab"` button per registered view in registry order; the reading view hides the tab of the Chat registration it shadows (D57)' },
  { id: 'shell.phase', value: PHASE_ATTRIBUTE, probe: { state: 'any', kind: 'attribute' }, use: 'the page\u2019s phase: hero before a session is chosen, active once one is shown' },
  { id: 'shell.foot-area', value: FOOT_AREA_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the sidebar footer block the account entry lives in' },
  { id: 'shell.menu', value: MENU_ROLE_SELECTOR, probe: { state: 'menu', kind: 'selector' }, use: 'an open host menu: the foreground, and where the account rows go' },
  { id: 'shell.menu-list', value: MENU_LIST_SELECTOR, probe: { state: 'menu', kind: 'selector' }, use: 'the host menu\u2019s own list element' },
  { id: 'shell.foreground', value: FOREGROUND_SELECTOR, probe: { state: 'menu', kind: 'selector' }, use: 'everything that counts as foreground: a modal dialog or an open menu' },
  { id: 'shell.account-trigger', value: ACCOUNT_TRIGGER_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the host\u2019s own account trigger in the footer, marked with the sign-in state; the web build mounts no account menu there, so the skin\u2019s account surface builds itself' },
  { id: 'shell.settings-button', value: SETTINGS_BUTTON_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the host\u2019s settings button the account menu rows open' },
  { id: 'shell.footer-actions', value: FOOTER_ACTIONS_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'the footer\u2019s action list the drawer mirrors' },
  { id: 'shell.slot-anchor', value: SLOT_ANCHOR_SELECTOR, probe: { state: 'any', kind: 'selector' }, use: 'a slot anchor; its children are the host\u2019s real entries' },
  { id: 'shell.windows-titlebar', value: WINDOWS_TITLEBAR_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'the Windows caption row is on this page: only the desktop shell writes it' },
  { id: 'shell.windows-menu', value: WINDOWS_MENU_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the desktop shell\u2019s own seat in the Windows caption row, where its native menu draws; the row\u2019s content starts after it, and only the desktop shell mounts it' },
  { id: 'shell.platform', value: PLATFORM_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'which platform the shell runs on; the host marks `darwin` on the desktop and plain web never sets it' },
  { id: 'shell.fullscreen', value: FULLSCREEN_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'the macOS window is fullscreen, so its traffic lights are away; only the desktop shell writes it' },
  { id: 'shell.top-clearance', value: FRAME_TOP_CLEARANCE_PROPERTY, probe: { state: 'any', kind: 'none' }, use: 'the caption strip\u2019s height, which the band layout reads; only the desktop shell declares it' },
  { id: 'shell.skin-center', value: SKIN_CENTER_ATTRIBUTE, probe: { state: 'any', kind: 'none' }, use: 'another skin owns the page; this theme yields (D49). The host\u2019s skin center writes it, and the web profile mounts none', owner: 'core' },
  { id: 'shell.dark-theme', value: DARK_THEME_ATTRIBUTE, probe: { state: 'dark', kind: 'attribute' }, use: 'the host flipped its own light/dark theme' },
  { id: 'boot.graph', value: '__DSH_BOOT__', probe: { state: 'any', kind: 'global' }, use: 'the boot graph, naming every client entry before any of them runs', owner: 'core' },
  { id: 'boot.peer-entry', value: 'dsh-chat-ux', probe: { state: 'any', kind: 'none' }, use: 'the peer plugin\u2019s entry id inside the boot graph, read to stand the chat features down (D32); this instance does not install it', owner: 'core' },
  { id: 'boot.peer-sheet', value: PEER_SHEET_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'the peer plugin\u2019s own stylesheet, the other half of that verdict; this instance does not install it' },
  { id: 'head.untagged-sheets', value: UNTAGGED_SHEET_SELECTOR, probe: { state: 'any', kind: 'none' }, use: 'every untagged stylesheet, which the host\u2019s claim sweep would otherwise take; read in the boot sweep, before the host tags its sheets, and the smoke\u2019s sibling cases hold it', owner: 'core' },
  { id: 'api.highlight', value: 'CSS.highlights', probe: { state: 'any', kind: 'global' }, use: 'the swept-text registry the token reveal needs; a browser without it gets no engine' },
  { id: 'api.highlight-constructor', value: 'Highlight', probe: { state: 'any', kind: 'global' }, use: 'the constructor that registry is built from' },
  { id: 'api.window-controls', value: 'navigator.windowControlsOverlay', probe: { state: 'any', kind: 'none' }, use: 'the desktop caption-button overlay, read to place the title bar band; a web page never has it' },
]
