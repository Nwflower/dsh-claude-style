/**
 * Host-owned DOM contract (D3); hashed class names and localized text are excluded.
 * Every literal needs a packages/contracts/src/table.ts entry, enforced by the build.
 */

/* ---------- the chat area ---------- */

/** One per flow block: a new block means this piece of the stream moved on. */
export const FLOW_BLOCK_SELECTOR = '[data-chat-flow-key]'
/** The chat column. */
export const CHAT_FLOW_SELECTOR = '[data-chat-flow]'
/**
 * The node a flow item renders its one message into. The host's flow rules
 * collapse an item whose node is empty, and the sodium rewrite keeps that
 * verdict as an attribute (D78).
 */
export const CHAT_NODE_SELECTOR = '[data-slot="conversation.chat.node"]'
/** The slot the chat column renders its flow into; its children and the column's are what the host's flow rules space (D78). */
export const CHAT_FLOW_SLOT_SELECTOR = '[data-slot="conversation.chat.flow"]'
/**
 * On every row of a turn's process: all of a running turn's rows, and once the
 * turn ends, every row but its answer, whether or not the turn stands folded.
 */
export const TURN_PROCESS_MEMBER_ATTRIBUTE = 'data-turn-process-member'
/**
 * One tool call's row. It lives inside the assistant block, so it does not
 * have to arrive as a new flow block of its own.
 */
export const CHAT_CALL_SELECTOR = '[data-chat-call-id]'
/**
 * The tool a call row runs, on the tool view the host renders inside that row.
 * Its name is what the statistics' estimate prices the call's own output by.
 */
export const CHAT_CALL_TOOL_SELECTOR = '[data-tool]'
/** The same contract as an attribute name: the tool a call row runs. */
export const CHAT_CALL_TOOL_ATTRIBUTE = 'data-tool'
/**
 * One row of a tool body's output. Two of the bodies the host draws mark their
 * rows themselves — a diff's `data-diff-line`, and the rows of a diff review's
 * two sides under the same mark — while the terminal, the read card and the
 * single-column diff mark only the body, so there a row is one of the children
 * of the body's last child, the layer that scrolls. Each row is a box of its
 * own, so a batch of them can arrive one chunk at a time
 * (features/chat-tool-lines).
 */
export const TOOL_OUTPUT_ROW_SELECTOR = '[data-diff-line], [data-diff] > *:last-child > div, [data-terminal][data-body] > *:last-child > div, [data-read] > *:last-child > div'
/** One thinking row; its phase is its data-state attribute. */
export const THINK_ROW_SELECTOR = '[data-variant="think"]'
/**
 * The rendered reasoning text inside a thinking row, whatever the host's body
 * wrapper is called: the module slides it inside the window it gives that body.
 */
export const REASONING_TEXT_SELECTOR = '[data-markdown-variant]'
/**
 * The phase of a thinking row or a tool call's own view (the page's phase is
 * `data-phase`, D3); `running` while that piece of work is under way.
 */
export const ROW_PHASE_ATTRIBUTE = 'data-state'
/** The phase value while the model is still thinking, or a call is still running. */
export const RUNNING_STATE = 'running'
/** The markdown layer marks the container with this while an assistant message streams. */
export const STREAMING_SELECTOR = '[data-streaming]'
/** The same contract as an attribute name: the reveal watches it appearing and going. */
export const STREAMING_ATTRIBUTE = 'data-streaming'
/**
 * TextShimmer's swept element: while it is attached, that piece of content
 * is still moving.
 */
export const SHIMMER_ATTRIBUTE = 'data-shimmer'
/** The shimmer attribute in selector form. */
export const SHIMMER_SELECTOR = `[${SHIMMER_ATTRIBUTE}]`
/** The chat column's scroller; the host hangs its own follow off it. */
export const CONVERSATION_SCROLL_SELECTOR = '[data-conversation-scroll]'
/** The conversation body: the scroller and the width handles stand under it, and the two widths below are declared on it. */
export const CONVERSATION_CONTENT_SELECTOR = '[data-conversation-content]'
/** The conversation column's width, from the reader's handles or the host's own share of the window. */
export const CHAT_CONTENT_WIDTH_PROPERTY = '--dsh-chat-content-width'
/** The composer card's widest: the column's width plus the card's own margin. */
export const COMPOSER_CARD_MAX_WIDTH_PROPERTY = '--dsh-composer-card-max-width'
/** Present while the host's follow is on; its absence is how the follow reads as off. */
export const FOLLOWING_TAIL_ATTRIBUTE = 'data-chat-following-tail'
/** The same contract in selector form. */
export const FOLLOWING_TAIL_SELECTOR = '[data-chat-following-tail]'
/** How close to the end counts as reading the tail: the host's own threshold. */
export const FOLLOW_THRESHOLD_PX = 25
/**
 * The live turn's status line, the host's "deep diving" row: the chat flow's
 * last row while the session runs, with its own label and ticking clock.
 */
export const CHAT_RUNNING_SELECTOR = '[data-chat-running]'
/**
 * On the running row while it only holds its slot: kept hidden after the turn
 * stops until the actions row replaces it. It still matches CHAT_RUNNING_SELECTOR
 * and holds its content span, so anything drawn into it sits beside the live row's.
 */
export const CHAT_RUNNING_HOLDING_ATTRIBUTE = 'data-holding'
/** The composer area: a pointer or key inside it is the reader typing, not taking the scroll over. */
export const COMPOSER_SELECTOR = '[data-composer-seat]'
/** The composer's editable surface (contenteditable); the caret motion is drawn for it. */
export const COMPOSER_INPUT_SELECTOR = '[data-composer-input]'
/**
 * Host composition state. Never move focus or rewrite selection while set:
 * doing so cancels uncommitted input in the contenteditable editor.
 */
export const COMPOSER_COMPOSING_ATTRIBUTE = 'data-composer-composing'
/** The card the input sits in; the send flight lifts a copy of the whole card. */
export const COMPOSER_CARD_SELECTOR = '[data-composer-card]'
/** Host overlay slot for `@` and `/` menus; positioned above the card and outside its layout. */
export const COMPOSER_OVERLAY_SELECTOR = '[data-composer-overlay]'
/** The draft's own scroll area inside that card. */
export const COMPOSER_SCROLL_SELECTOR = '[data-input-scroll]'
/** The echo bubble the host mounts the moment a submission goes through. */
export const SUBMISSION_ECHO_SELECTOR = '[data-submission-echo]'
/** The bubble the host mounts for a steering message until the turn takes it in. */
export const PENDING_STEERING_SELECTOR = '[data-pending-steering]'
/**
 * The bubble the host draws around a reader's message, marked on the bubble
 * itself: the reader's own message is told from the answer's without its text.
 */
export const MESSAGE_BUBBLE_SELECTOR = '[data-message-bubble]'
/**
 * The row of controls under a message, carrying the host's clock and copy
 * button. The value says which side the clock stands on: `start` on the
 * reader's message, `end` under an answer.
 */
export const MESSAGE_ACTION_ROW_ATTRIBUTE = 'data-clock'
/** The same contract in selector form. */
export const MESSAGE_ACTION_ROW_SELECTOR = '[data-clock]'
/**
 * The key of the chat node a flow row renders, the same key the loaded
 * timeline's node carries: how a row is matched to its node, whose `seq` is the
 * event the message arrived in.
 */
export const CHAT_NODE_KEY_ATTRIBUTE = 'data-chat-node-key'
/**
 * A textarea in the composer seat: a question card's answer box (under
 * [data-question-key]) or a queued message's inline editor (under
 * [data-queue-dock]), in the main session and the sidebar's subagent sessions alike.
 */
export const COMPOSER_TEXTAREA_SELECTOR = '[data-composer-seat] textarea'
/**
 * The question card the host mounts for a question it asks the reader: the
 * question, the options it offers and the box the answer is written in.
 */
export const QUESTION_CARD_SELECTOR = '[data-question-key]'
/** The scrolling body of a question card: its question heading and answer choices. */
export const QUESTION_BODY_SELECTOR = '[data-question-scroll]'
/**
 * One option row of a question card: the row the reader picks from, and the
 * button in it that carries the mark of the option taken.
 */
export const QUESTION_OPTION_ROW_SELECTOR = '[data-option-row]'
/**
 * The settled reply: the bubble the host mounts for the answer the reader
 * chose, with the question it answers and the answer itself.
 */
export const QUESTION_REPLY_SELECTOR = '[data-question-reply]'
/** The host puts this on every process group. */
export const PROCESS_GROUP_SELECTOR = '[data-step-process]'
/** The host puts this on every process group's body. */
export const PROCESS_BODY_SELECTOR = '[data-step-process-body]'
/** The content layer inside a process group's body; that layer is the one that scrolls. */
export const PROCESS_CONTENT_SELECTOR = '[data-step-process-content]'
/** On a process group's root while this tier does not cap the body (detailed, fully expanded). */
export const PROCESS_EXPANDED_MODE_ATTRIBUTE = 'data-group-expanded-mode'
/**
 * On the chat column while the host animates its own folds: under the next-input
 * collapse timing, while a turn runs and shortly after. There the host rolls a
 * process group's body shut itself, unless the system asks for reduced motion.
 */
export const CHAT_MOTION_SCOPE_SELECTOR = '[data-chat-motion]'
/** On every chat row: the turn the row belongs to. */
export const CHAT_TURN_ATTRIBUTE = 'data-chat-turn'
/** On a settled user row; the submission hold keys on its arrival. */
export const USER_ROW_KIND = 'user'
/** The kind attribute itself, whose values say what a flow row is. */
export const FLOW_KIND_ATTRIBUTE = 'data-chat-flow-kind'
/** The kind of an assistant step's row: its thinking or its output. */
export const ASSISTANT_STEP_KIND = 'assistant-step'
export const TOOL_CALL_KIND = 'tool-call'
/** The kind of a context injection's row: what the host put into the model's context beside the conversation. */
export const CONTEXT_ROW_KIND = 'context'
/** The kind of a turn's process group, which the host's widest flow gap follows (D78). */
export const TURN_PROCESS_ROW_KIND = 'turn-process'
/** A settled turn's tail row, which carries the answer's own action controls. */
const TURN_TAIL_KIND = 'turn-tail'
export const TURN_TAIL_SELECTOR = `[${FLOW_KIND_ATTRIBUTE}="${TURN_TAIL_KIND}"]`
/**
 * The assistant step outside the turn's process. A running turn marks its answer
 * as a process member too, so this matches the process-closing answer only after the turn ends.
 */
export const TURN_PROCESS_ANSWER_SELECTOR = `[${FLOW_KIND_ATTRIBUTE}="${ASSISTANT_STEP_KIND}"]:not([${TURN_PROCESS_MEMBER_ATTRIBUTE}])`
/**
 * The batch of steering messages a turn's steering group holds, admitted under
 * one claim and spaced from the rest of the flow by the host's own flow rules.
 */
export const CHAT_STEERING_BATCH_SELECTOR = '[data-chat-steering-batch]'
/**
 * Which part of an assistant step a row holds: the host splits a step into its
 * thinking and its output and writes the part on the row.
 */
export const CHAT_GROUP_PART_ATTRIBUTE = 'data-chat-group-part'
/** The part value of a step's thinking row. */
export const CHAT_GROUP_PART_REASONING = 'reasoning'
/** The part value of a step's output row. */
export const CHAT_GROUP_PART_RESPONSE = 'response'
/** Non-reasoning assistant row; live turns also mark this row as a process member until they close. */
export const CHAT_ANSWER_ROW_SELECTOR = `[${FLOW_KIND_ATTRIBUTE}="${ASSISTANT_STEP_KIND}"]:not([${CHAT_GROUP_PART_ATTRIBUTE}="${CHAT_GROUP_PART_REASONING}"])`
/** The header's non-decorative child; host icon and chevron are aria-hidden. */
export const PROCESS_HEADER_LABEL_SELECTOR = ':scope > :not([aria-hidden="true"])'
/** Select the shimmered text specifically; sibling plugin lines can share the content span. */
export const CHAT_RUNNING_TEXT_SELECTOR = `:scope > span > [${SHIMMER_ATTRIBUTE}]`
/** Host running icon has no stable attribute; keep the part match scoped to the running row (D3). */
export const CHAT_RUNNING_ICON_SELECTOR = '[data-dsh-claude-part~="running-icon"]'
/** TurnNavigator's rail; absent below two turns and hidden in narrow conversations. */
export const TURN_RAIL_SELECTOR = `${CONVERSATION_SCROLL_SELECTOR} nav[data-dsh-claude-part~="rail-frame"]`
/** The rail's own scroller, its first child: the marks scroll inside it. */
export const TURN_RAIL_SCROLLER_SELECTOR = ':scope > [data-dsh-claude-part~="rail-scroller"]'
/** Virtualized rails provide `data-index`; fully rendered rails use mark order as the turn index. */
export const TURN_RAIL_MARK_SELECTOR = 'button'
/** The mark of the turn at the reading position. */
export const TURN_RAIL_CURRENT_SELECTOR = 'button[aria-current="true"]'
/** TurnNavigator geometry: content height is `count × pitch + 2 × (inset − pitch / 2)`. */
export const TURN_RAIL_PITCH = 10
export const TURN_RAIL_INSET = 6
/** A process group's header control. */
export const PROCESS_ACTIVITY_SELECTOR = 'button[data-process-activity]'
/** A fold: the host's DisclosureRow, and every other control that opens and closes something. */
export const DISCLOSURE_ROW_SELECTOR = '[data-disclosure-row]'
/** Optional DisclosureRow wrapper; when present, the body is its sibling rather than the row's. */
export const DISCLOSURE_HEADER_SELECTOR = '[data-disclosure-header]'
/** A DisclosureRow that has a body to open; a row without one draws no chevron. */
export const DISCLOSURE_EXPANDABLE_SELECTOR = '[data-expandable="true"]'
/** Separator exists only for a nonempty description; shimmer copies omit it. */
export const SHIMMER_DECORATION_SELECTOR = '[data-shimmer-decoration]'
/** On a thinking row whose folded line shows the thought itself beside its title. */
export const THINK_PREVIEW_ATTRIBUTE = 'data-preview'
/** The row of a call no named tool row draws: its title is the generic word, its description the tool and its purpose. */
export const GENERIC_TOOL_ROW_SELECTOR = '[data-variant="others"]'
/**
 * On a row the host lets the reader open and fold: present while it stands
 * open. A thinking row is folded when this is absent.
 */
export const EXPANDED_ATTRIBUTE = 'data-expanded'
export const FOLD_TOGGLE_SELECTOR = '[aria-expanded]'
/** Controls whose opening is skipped whole: a turn's header and its trigger notice. */
export const FOLD_SKIPPED_CONTROL_SELECTOR = '[data-turn-process], [data-turn-trigger]'

/* ---------- the frame around the chat ---------- */

/** The shown conversation column, and the session id it carries. */
export const CONVERSATION_SESSION_SELECTOR = '[data-phase="active"] [data-conversation-session]'
export const CONVERSATION_SESSION_ATTRIBUTE = 'data-conversation-session'
/** The host's per-session store key prefix; its `view` field names the active view before React commits it. */
export const CONVERSATION_VIEW_STORAGE_PREFIX = 'dsh.conversation.'
export const CONVERSATION_VIEW_TRAJECTORY = 'trajectory'
export const CONVERSATION_VIEW_CONTEXT = 'context'
export const CONVERSATION_VIEW_STATS = 'stats'
/** The page's own phase: `hero` before a session is chosen, `active` once one is shown. */
export const PHASE_ATTRIBUTE = 'data-phase'
/** The composer card and the stack of cards above it. */
export const COMPOSER_STACK_SELECTOR = '[data-dsh-claude-part~="composer-stack"]'
/** ui-attachment's local class remains usable before part marking reaches a newly mounted rail. */
export const COMPOSER_ATTACHMENT_RAIL_SELECTOR = '[class*="_rail"]'
/** The placeholder the host's own editor draws inside the draft. */
export const COMPOSER_PLACEHOLDER_SELECTOR = '[data-composer-placeholder]'
/** The host's own sentence for the composer card's field, which the skin reads beside whether the card carries it. */
export const COMPOSER_PLACEHOLDER_ATTRIBUTE = 'data-placeholder'
/** One figure of the statistics in the composer stack; the context panel repeats the figures. */
export const COMPOSER_STAT_SELECTOR = '[data-composer-stat]'
/** dsh-remote-web-ui portrait mark; mirror it to the skin so phone rules avoid competing transforms. */
export const MOBILE_PORTRAIT_SELECTOR = 'body.dsh-remote-portrait'
/** The filled meter circle has a dash array; its track circle does not. */
export const CONTEXT_METER_FILL_SELECTOR = '[data-dsh-claude-context-meter] circle[stroke-dasharray]'
/** The composer variant the host puts on the card (`hero` / `default`). */
export const COMPOSER_VARIANT_ATTRIBUTE = 'data-composer-variant'
/** The permission slot the host mounts in a composer card's toolbar. */
export const PERMISSION_SLOT_SELECTOR = '[data-slot="conversation.input.permission"]'
/** Host access trigger only; exclude the skin's whole-token `dsh-claude-` classes (D3). */
export const PERMISSION_TRIGGER_SELECTOR = `${PERMISSION_SLOT_SELECTOR} button:not([class^="dsh-claude-"], [class*=" dsh-claude-"])`
/** Plugin entry slot beside the model seat; the host expands the seat only while an entry is live. */
export const CONVERSATION_ACTIVITY_SLOT_SELECTOR = '[data-slot="conversation.input.activity"]'
/** One model slot per composer card, including docked conversations; resolve within the target card. */
export const MODEL_SLOT_SELECTOR = '[data-slot="conversation.input.model"]'
/** A host button that opens a dialog: the model and effort pickers in the composer stack. */
export const DIALOG_TRIGGER_SELECTOR = 'button[aria-haspopup="dialog"]'
/** The sidebar footer block; the skin's account entry lives inside it. */
export const FOOT_AREA_SELECTOR = '[data-dsh-claude-part~="foot-area"]'
/** Host sidebar search slot; both replacement and click-taking `icon` styles depend on it. */
export const SIDEBAR_SEARCH_SLOT_SELECTOR = '[data-slot="sidebar"] [data-dsh-claude-part~="search-slot"]'
/** The sidebar's own column box, whose width follows the collapse and the reader's drag. */
export const SIDEBAR_ROOT_SELECTOR = '[data-slot="sidebar"] > [data-dsh-claude-part~="sidebar-root"]'
/** The wide brand in the sidebar's top row; the collapsed rail has none. */
export const SIDEBAR_BRAND_SELECTOR = '[data-slot="sidebar"] [data-dsh-claude-part~="logo-row"] > [data-dsh-claude-part~="brand-button"]'
/** The New session button; the skin's standalone search button takes the next row. */
export const SIDEBAR_NEW_SESSION_SELECTOR = '[data-slot="sidebar"] [data-dsh-claude-part~="new-session"]'
/** Desktop fixes this toggle into the caption strip; web keeps it in the top row. */
export const SIDEBAR_TOGGLE_SELECTOR = '[data-slot="sidebar"] [data-dsh-claude-part~="logo-row"] > [data-dsh-claude-part~="sidebar-toggle"]'
/** The host's own composer is replaced by a panel of its own choice; this is that panel's seat. */
export const CHAIN_OVERLAY_FALLBACK_ATTRIBUTE = 'data-chain-overlay-fallback'
/** Host modals portal to `<body>`; do not assume they remain near the invoking row. */
export const MODAL_DIALOG_SELECTOR = '[role="dialog"][aria-modal="true"]'
/** The host's own open menus and modal dialogs: the foreground the skin must not walk over. */
export const FOREGROUND_SELECTOR = `${MODAL_DIALOG_SELECTOR}, [role="menu"]`
/** The host's menu card and its list, which the skin injects a row into. */
export const MENU_ROLE_SELECTOR = '[role="menu"]'
/** The material card host menus share; account preparation must not hide unrelated cards. */
export const MENU_MATERIAL_SELECTOR = '[data-menu-material]'
export const MENU_LIST_SELECTOR = '[role="presentation"]'
/** The host's account trigger in the sidebar footer. */
export const ACCOUNT_TRIGGER_SELECTOR = '[aria-haspopup="menu"][data-signed-out]'
/** Footer popup trigger; `aria-haspopup` varies across supported hosts and is intentionally unconstrained. */
export const SETTINGS_BUTTON_SELECTOR = '[data-dsh-claude-part~="settings-area"] button[aria-haspopup]'
/** The sidebar's action list, whose entries the skin mirrors into its drawer. */
export const FOOTER_ACTIONS_SELECTOR = '[data-dsh-claude-part~="footer-actions"]'
/** A slot anchor; its children are the host's real entries. */
export const SLOT_ANCHOR_SELECTOR = '[data-slot]'
/** `dsh-client-ui-subagent` embedded conversation column, including its composer. */
export const SIDEBAR_CHAT_SELECTOR = '[data-sidebar-chat]'
/** Slot anchors delimit part-walk regions, avoiding document-wide queries (D3). */
export const SIDEBAR_SLOT_SELECTOR = '[data-slot="sidebar"]'
export const CONVERSATION_HEADER_SLOT_SELECTOR = '[data-slot="conversation.header"]'
/** The root slot: the shell frame is its own element child, and the three columns are inside. */
export const ROOT_SLOT_SELECTOR = '[data-slot="root"]'
/** The right sidebar's own column: the host marks it, and its docked panels are the skin's cards. */
export const RIGHTBAR_COLUMN_SELECTOR = '[data-rightbar-col]'
/**
 * The bottom panel `dsh-better-sidebar` mounts over the conversation's lower
 * edge: a floating surface of its own, mounted inside the frame rather than in
 * a column, so it takes the floor from every column standing above it.
 */
export const BOTTOM_PANEL_SELECTOR = '[data-dsh-bottom-panel]'
/** Host collapse control exists only while open; its transformed, clipped subtree requires a header proxy. */
export const RIGHTBAR_TOGGLE_SELECTOR = '[data-sidebar-right-open] [data-sidebar-right-toggle]'
/** The right panel's own box; the host states its width from the viewport's pixels. */
export const RIGHTBAR_PANEL_SELECTOR = '[data-sidebar-right-panel]'
/** The right column's drag handle; the host places it from the viewport's own width. */
export const RIGHTBAR_HANDLE_SELECTOR = '[data-side="rightbar"]'
/** The sidebar's drag handle; the host places it at the sidebar's own width. */
export const SIDEBAR_HANDLE_SELECTOR = '[data-side="sidebar"]'
/** Host reveals the handle's `::after` bar on hover; the skin controls that timing. */
export const WIDTH_HANDLE_SELECTOR = '[data-width-handle]'
/** Present whenever the sidebar is closed, regardless of how it was opened or closed. */
export const SIDEBAR_COLLAPSED_ATTRIBUTE = 'data-sidebar-collapsed'
/** Narrow-frame sidebar drawer replaces the grid column entirely. */
export const SIDEBAR_DRAWER_ATTRIBUTE = 'data-sidebar-drawer'
/** The frame's mark while it gives the right panel no track at all. */
export const RIGHTBAR_COLLAPSED_ATTRIBUTE = 'data-rightbar-collapsed'
/** Host drops the right track below the combined 280px sidebar, 400px centre and 300px right minima. */
export const SIDEBAR_BESIDE_RIGHTBAR_MIN_PX = 980

/* ---------- the conversation header's own row ---------- */

/** Placement measures this row; similar sidebar rows require matching title or utilities, not first match. */
export const HEADER_TITLE_ROW_SELECTOR = '[data-dsh-claude-part~="title-row"]'
/** Breadcrumb text box, not its stretching flex cluster; placement needs the actual title end. */
export const HEADER_TITLE_SELECTOR = '[data-dsh-claude-part~="header-title"]'
/** Preset/chip seat beside the title; the band moves it into the caption row after the title. */
export const HEADER_ACTIONS_SELECTOR = '[data-dsh-claude-part~="header-actions"]'
/** The host's background-work chips in that seat: the jobs count (a trigger with no popup) and the subagent catalog (a tree popup), each drawn only while its work exists. */
export const HEADER_ACTION_CHIPS_SELECTOR = '[data-dsh-claude-part~="header-actions"] button[aria-haspopup="tree"], [data-dsh-claude-part~="header-actions"] button[aria-expanded]:not([aria-haspopup])'
/** The header's utilities cluster: the workspace opener, the overflow menu, the bottom-panel toggle. */
export const HEADER_UTILITIES_SELECTOR = '[data-dsh-claude-part~="header-utilities"]'
/** The corner seat beside the utilities, carrying the right-sidebar toggle. */
export const HEADER_CORNER_SELECTOR = '[data-dsh-claude-part~="header-corner"]'
/** Resolve with `closest` from the title row; this substring also matches unrelated bars. */
export const CONVERSATION_HEADER_SELECTOR = '[data-dsh-claude-part~="conversation-header"]'
/** The view-tab strip inside the header, whose box the band placement keeps clear of. */
export const VIEW_TABS_STRIP_SELECTOR = '[data-dsh-claude-part~="view-tabs"]'
/** The tablist plate inside the host's sizing row. */
export const VIEW_TABS_LIST_SELECTOR = '[data-dsh-claude-part~="view-tabs-list"]'
/** Host-marked view tablist; plugin tablists elsewhere in the conversation are excluded. */
export const CONVERSATION_TABS_SELECTOR = '[data-conversation-tabs]'

/* ---------- the document, the shell and the browser API ---------- */

/** The shell's window marks: the Windows caption row, the platform, and fullscreen. */
export const WINDOWS_TITLEBAR_ATTRIBUTE = 'data-windows-titlebar'
/** Native-menu seat; Windows caption content starts to its right. */
export const WINDOWS_MENU_SELECTOR = '[data-windows-menu]'
export const PLATFORM_ATTRIBUTE = 'data-platform'
export const FULLSCREEN_ATTRIBUTE = 'data-fullscreen'
/** Caption content offset, declared only while the sidebar is collapsed; native menu placement reads it. */
export const WINDOWS_MENU_START_PROPERTY = '--dsh-windows-menu-start'
/** The host's declared caption-strip height, as a custom property on the document element. */
export const FRAME_TOP_CLEARANCE_PROPERTY = '--dsh-frame-top-clearance'
/** The skin center's stamp on the document element: another skin owns the page (D74). */
export const SKIN_CENTER_ATTRIBUTE = 'data-dsh-skin'
/** The host's own light/dark flip, written on `<body>`. */
export const DARK_THEME_ATTRIBUTE = 'data-ds-dark-theme'
/** A sibling plugin's stylesheet in `<head>`, read to tell that plugin is on the page. */
export const PEER_SHEET_SELECTOR = 'style[data-plugin-css="dsh-plugin-msg-nav/style.css"]'
/** Every untagged stylesheet in `<head>`: the host's claim sweep would otherwise take a sibling's. */
export const UNTAGGED_SHEET_SELECTOR = 'style:not([data-plugin])'
/** Loader tags identify package and sheet path; sodium lookup depends on both (D78). */
export const PLUGIN_SHEET_SELECTOR = 'style[data-plugin]'
export const PLUGIN_SHEET_OWNER_ATTRIBUTE = 'data-plugin'
export const PLUGIN_SHEET_PATH_ATTRIBUTE = 'data-plugin-css'

/* ---------- a plugin's footer control ---------- */
/** Plugin-owned footer naming lets the skin find update controls without hashed class names. */
export const PLUGIN_ENTRY_ATTRIBUTE = 'data-dsh-part'
export const PLUGIN_ENTRY_OWNER_ATTRIBUTE = 'data-dsh-plugin'
export const PLUGIN_ENTRY_UPDATE_SELECTOR = `button[${PLUGIN_ENTRY_OWNER_ATTRIBUTE}="update"][${PLUGIN_ENTRY_ATTRIBUTE}="entry"]`

/* ---------- ds-bot (Fei2411/DeepSeek-Bot) ---------- */

/** ds-bot writes this on `<body>` only while its Bot surface owns the page. */
export const DS_BOT_SURFACE_ATTRIBUTE = 'data-bt-motion'
/** In Agent mode, ds-bot's one control on the shell's own page: the footer button back to its Bot surface. */
export const DS_BOT_RETURN_SELECTOR = '.bt-return'
/** ds-bot's account button, which opens its menu on the Bot surface. */
export const DS_BOT_ACCOUNT_SELECTOR = '.bt-account'
/** That menu, portalled into `<body>` while open. */
export const DS_BOT_ACCOUNT_MENU_SELECTOR = '.bt-account-menu'
/** The Agent group follows the menu's first separator; signing in appends the sign-out group after it. */
export const DS_BOT_AGENT_ITEM_SELECTOR = '.bt-account-menu > .bt-menu-sep:first-of-type + [role="menuitem"]'
/** The top row of ds-bot's own sidebar: its brand, search and new buttons. */
export const DS_BOT_SIDEBAR_TOP_SELECTOR = '.bt-side-top'

/* ---------- dsh-video-skin ---------- */
/** The boot animation is a full-window layer, not a dialog card capped against the scaled page (D81). */
export const DSVS_BOOT_SELECTOR = '.dsvs-boot'

/* ---------- the sidebar's session rows ---------- */
/** `session:<id>` distinguishes session rows; their parent element remains the containing list. */
export const SESSION_ROW_KEY_ATTRIBUTE = 'data-row-key'
export const SESSION_ROW_SELECTOR = '[data-row-key^="session:"]'
/** Session phase lives on the inner dot, not the row; `ongoing` marks active work. */
export const SESSION_PHASE_ATTRIBUTE = 'data-state'
export const SESSION_ONGOING_STATE = 'ongoing'
export const SESSION_ONGOING_SELECTOR = '[data-state="ongoing"]'
/**
 * One workspace row of the grouped session list: the host keys it
 * `workspace:<workspaceId>`, and this is the row whose title stands in for the
 * session rows a closed workspace does not draw.
 */
export const WORKSPACE_ROW_SELECTOR = `[${SESSION_ROW_KEY_ATTRIBUTE}^="workspace:"]`
/** Whether a workspace row's workspace stands open; the host writes it beside the row's role. */
export const WORKSPACE_ROW_EXPANDED_ATTRIBUTE = 'aria-expanded'

/* ---------- the sidebar's session rows ---------- */
/** Idle rows render this optional third-party leading decoration outlet. */
export const SESSION_STATUS_OUTLET_SELECTOR = '[data-slot="sidebar.session.row.leading"]'

export const CONVERSATION_MAIN_SLOT_SELECTOR = '[data-slot="main.conversation"]'

export const COMPOSER_CONTROLS_SELECTOR = '[data-dsh-claude-part~="composer-controls"]'

export const CONVERSATION_INPUT_RIGHT_SLOT_SELECTOR = '[data-slot="conversation.input.right"]'
