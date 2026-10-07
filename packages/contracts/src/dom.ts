/**
 * The DOM half of the host contract (D44): every selector or attribute the
 * host itself writes.
 *
 * The host's class names carry a build-time hash and change with every release,
 * so the skin keys on these instead; interface text changes with the language,
 * so it is never matched either (D3). What each literal means, what reads it,
 * and the host build it was verified against is the table in
 * src/contracts/table.ts; the build holds the two files together, so a literal
 * cannot appear here without an entry there.
 *
 * Everything here is a promise the host makes today and the skin relies on.
 * What the skin itself writes stays with the feature that writes it.
 */

/* ---------- the chat area ---------- */

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
/** On a settled user row; the submission hold keys on its arrival. */
export const USER_ROW_KIND = 'user'
/** The kind attribute itself, whose values say what a flow row is. */
export const FLOW_KIND_ATTRIBUTE = 'data-chat-flow-kind'
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
/** A process group's header control, and the turn's own process control the status line moves. */
export const PROCESS_ACTIVITY_SELECTOR = 'button[data-process-activity]'
export const TURN_PROCESS_SELECTOR = 'button[data-turn-process]'
/** A fold: the host's DisclosureRow, and every other control that opens and closes something. */
export const DISCLOSURE_ROW_SELECTOR = '[data-disclosure-row]'
export const FOLD_TOGGLE_SELECTOR = '[aria-expanded]'
/** Controls whose opening is skipped whole: a turn's header and its trigger notice. */
export const FOLD_SKIPPED_CONTROL_SELECTOR = '[data-turn-process], [data-turn-trigger]'

/* ---------- the frame around the chat ---------- */

/** The shown conversation column, and the session id it carries. */
export const CONVERSATION_SESSION_SELECTOR = '[data-phase="active"] [data-conversation-session]'
export const CONVERSATION_SESSION_ATTRIBUTE = 'data-conversation-session'
/** The page's own phase: `hero` before a session is chosen, `active` once one is shown. */
export const PHASE_ATTRIBUTE = 'data-phase'
/** The composer card and the stack of cards above it. */
export const COMPOSER_STACK_SELECTOR = '[class*="_composerStack"]'
/** The placeholder the host's own editor draws inside the draft. */
export const COMPOSER_PLACEHOLDER_SELECTOR = '[data-composer-placeholder]'
/**
 * The statistics in the composer stack. The host marks each figure since its
 * 2026-09 update and marked one container around them before, so both are read
 * (D3); those figures are what the context panel repeats (D27).
 */
export const COMPOSER_STATS_SELECTOR = '[data-composer-stats]'
export const COMPOSER_STAT_SELECTOR = '[data-composer-stat]'
/** The composer variant the host puts on the card (`hero` / `default`). */
export const COMPOSER_VARIANT_ATTRIBUTE = 'data-composer-variant'
/** The host's own access-mode trigger inside its permission slot, skipping the skin's buttons. */
export const PERMISSION_TRIGGER_SELECTOR = '[data-slot="conversation.input.permission"] button:not([class*="dsh-claude"])'
/** The sidebar footer block; the skin's account entry lives inside it. */
export const FOOT_AREA_SELECTOR = '[class*="footArea"]'
/** The host's own composer is replaced by a panel of its own choice; this is that panel's seat. */
export const CHAIN_OVERLAY_FALLBACK_ATTRIBUTE = 'data-chain-overlay-fallback'
/** The host's own open menus and modal dialogs: the foreground the skin must not walk over. */
export const FOREGROUND_SELECTOR = '[role="dialog"][aria-modal="true"], [role="menu"]'
/** The host's menu card and its list, which the skin injects a row into. */
export const MENU_ROLE_SELECTOR = '[role="menu"]'
export const MENU_LIST_SELECTOR = '[role="presentation"]'
/** The host's account trigger in the sidebar footer. */
export const ACCOUNT_TRIGGER_SELECTOR = '[aria-haspopup="menu"][data-signed-out]'
/** The host's settings button in the footer. */
export const SETTINGS_BUTTON_SELECTOR = '[class*="settingsArea"] button[aria-haspopup="dialog"]'
/** The sidebar's action list, whose entries the skin mirrors into its drawer. */
export const FOOTER_ACTIONS_SELECTOR = '[class*="footerActions"]'
/** A slot anchor; its children are the host's real entries. */
export const SLOT_ANCHOR_SELECTOR = '[data-slot]'

/* ---------- the document, the shell and the browser API ---------- */

/** The shell's window marks: the Windows caption row, the platform, and fullscreen. */
export const WINDOWS_TITLEBAR_ATTRIBUTE = 'data-windows-titlebar'
export const PLATFORM_ATTRIBUTE = 'data-platform'
export const FULLSCREEN_ATTRIBUTE = 'data-fullscreen'
/** The host's declared caption-strip height, as a custom property on the document element. */
export const FRAME_TOP_CLEARANCE_PROPERTY = '--dsh-frame-top-clearance'
/** The skin center's stamp on the document element: another skin owns the page (D49). */
export const SKIN_CENTER_ATTRIBUTE = 'data-dsh-skin'
/** The host's own light/dark flip, written on `<body>`. */
export const DARK_THEME_ATTRIBUTE = 'data-ds-dark-theme'
/** A sibling plugin's stylesheet in `<head>`, read to tell that plugin is on the page. */
export const PEER_SHEET_SELECTOR = 'style[data-plugin-css="dsh-plugin-msg-nav/style.css"]'
/** Every untagged stylesheet in `<head>`: the host's claim sweep would otherwise take a sibling's. */
export const UNTAGGED_SHEET_SELECTOR = 'style:not([data-plugin])'
