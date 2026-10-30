/**
 * The DOM half of the host contract (D3): every selector or attribute the
 * host itself writes.
 *
 * The host's class names carry a build-time hash and change with every release,
 * so the skin keys on these instead; interface text changes with the language,
 * so it is never matched either (D3). What each literal means and what reads it
 * is the table in packages/contracts/src/table.ts; the build holds the two files
 * together, so a literal cannot appear here without an entry there.
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
 * The node a flow item renders its one message into. The host's flow rules
 * collapse an item whose node is empty, and the sodium rewrite keeps that
 * verdict as an attribute (D78).
 */
export const CHAT_NODE_SELECTOR = '[data-slot="conversation.chat.node"]'
/** The slot the chat column renders its flow into; its children and the column's are what the host's flow rules space (D78). */
export const CHAT_FLOW_SLOT_SELECTOR = '[data-slot="conversation.chat.flow"]'
/** The answer a turn's process group closes on. */
export const TURN_PROCESS_ANSWER_ATTRIBUTE = 'data-turn-process-answer'
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
/** One thinking row; its phase is its data-state attribute. */
export const THINK_ROW_SELECTOR = '[data-variant="think"]'
/**
 * The rendered reasoning text inside a thinking row, whatever the host's body
 * wrapper is called: the module slides it inside the window it gives that body.
 */
export const REASONING_TEXT_SELECTOR = '[data-markdown-variant]'
/**
 * The phase of a row that has one: a thinking row, and a tool call's own view
 * (the page's own phase is `data-phase`, D3). The values are the host's —
 * `running` while that piece of work is under way.
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
 * is still moving. Both names are read, because an older host build writes
 * the old one (data-text-shimmer).
 */
export const SHIMMER_ATTRIBUTE = 'data-shimmer'
export const SHIMMER_LEGACY_ATTRIBUTE = 'data-text-shimmer'
/** The two shimmer attributes in selector form. */
export const SHIMMER_SELECTOR = `[${SHIMMER_ATTRIBUTE}], [${SHIMMER_LEGACY_ATTRIBUTE}]`
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
 * The live turn's status line — the host's "deep diving" row — mounted as the
 * chat flow's last row while the session runs, with its own label and its own
 * ticking clock.
 */
export const CHAT_RUNNING_SELECTOR = '[data-chat-running]'
/**
 * On the running row while it only holds its slot: the host keeps the row after
 * the turn stops, hidden and aria-hidden, until the turn's actions row replaces
 * it. It still matches `CHAT_RUNNING_SELECTOR` and still holds its content span,
 * so anything drawn into it would sit beside the live row's own.
 */
export const CHAT_RUNNING_HOLDING_ATTRIBUTE = 'data-holding'
/** The composer area: a pointer or key inside it is the reader typing, not taking the scroll over. */
export const COMPOSER_SELECTOR = '[data-composer-seat]'
/** The composer's editable surface (contenteditable); the caret motion is drawn for it. */
export const COMPOSER_INPUT_SELECTOR = '[data-composer-input]'
/**
 * The input's own composition flag: the host's composer keymap raises it on
 * compositionstart (and while the editor reports one) and drops it at
 * compositionend. The input is a contenteditable editor, so a selection
 * rewritten or a focus moved under an in-flight composition makes the browser
 * drop what the reader has typed but not yet committed — the pinyin reverts to
 * its raw letters and the candidate window opens again.
 */
export const COMPOSER_COMPOSING_ATTRIBUTE = 'data-composer-composing'
/** The card the input sits in; the send flight lifts a copy of the whole card. */
export const COMPOSER_CARD_SELECTOR = '[data-composer-card]'
/**
 * The card's overlay seat: the box the host mounts its input overlays in (the
 * `conversation.input.overlay` slot, where the `@` and `/` menus render). It is
 * anchored above the card and out of its layout, and the host puts it in the
 * card's subtree, so what stands in it is not the composer's own box.
 */
export const COMPOSER_OVERLAY_SELECTOR = '[data-composer-overlay]'
/** The draft's own scroll area inside that card. */
export const COMPOSER_SCROLL_SELECTOR = '[data-input-scroll]'
/** The echo bubble the host mounts the moment a submission goes through. */
export const SUBMISSION_ECHO_SELECTOR = '[data-submission-echo]'
/** The bubble the host mounts for a steering message until the turn takes it in. */
export const PENDING_STEERING_SELECTOR = '[data-pending-steering]'
/**
 * A plain text box inside the composer seat: a question card's answer box
 * (under [data-question-key]) and a queued message's inline editor (under
 * [data-queue-dock]). Both are textareas, in the main session and in the
 * sidebar's subagent sessions alike.
 */
export const COMPOSER_TEXTAREA_SELECTOR = '[data-composer-seat] textarea'
/**
 * The question card the host mounts for a question it asks the reader: the
 * question, the options it offers and the box the answer is written in.
 */
export const QUESTION_CARD_SELECTOR = '[data-question-key]'
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
 * On the chat column while the host animates its own folds: under the
 * next-input collapse timing, while a turn runs and shortly after. Inside it the
 * host fades and rolls a process group's body shut itself, unless the system
 * asks for reduced motion.
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
/** The kind of a turn's process group, which the host's widest flow gap follows (D78). */
export const TURN_PROCESS_ROW_KIND = 'turn-process'
/**
 * Which part of an assistant step a row holds: the host splits a step into its
 * thinking and its output and writes the part on the row.
 */
export const CHAT_GROUP_PART_ATTRIBUTE = 'data-chat-group-part'
/** The part value of a step's thinking row. */
export const CHAT_GROUP_PART_REASONING = 'reasoning'
/** The part value of a step's output row. */
export const CHAT_GROUP_PART_RESPONSE = 'response'
/**
 * The words of a process group's header: the one child of the control the host
 * does not mark decorative (its icon and chevron sit in an aria-hidden span).
 */
export const PROCESS_HEADER_LABEL_SELECTOR = ':scope > :not([aria-hidden="true"])'
/**
 * The words of the live turn's running row: the shimmered child of its content
 * span. Reading it as the child that is not decorative would name whichever of
 * the span's children comes first, and the skin's waiting line and the lines
 * third-party plugins insert stand in that same span beside the host's whale.
 */
export const CHAT_RUNNING_TEXT_SELECTOR = `:scope > span > [${SHIMMER_ATTRIBUTE}], :scope > span > [${SHIMMER_LEGACY_ATTRIBUTE}]`
/**
 * The host's own running indicator — the whale tail it leads the row with —
 * beside the skin's waiting line. It carries no attribute of its own, so the
 * stable part of its hashed class name is matched (D3), scoped to the running
 * row so no other row's icon can be hit.
 */
export const CHAT_RUNNING_ICON_SELECTOR = '[data-dsh-claude-part~="running-icon"]'
/**
 * The turn rail (ui-chat's TurnNavigator): a nav at the conversation's
 * right edge with one mark per turn, absent below two turns and hidden
 * when the conversation is narrow. It is the one nav in the chat frame.
 */
export const TURN_RAIL_SELECTOR = `${CONVERSATION_SCROLL_SELECTOR} nav[data-dsh-claude-part~="rail-frame"]`
/** The rail's own scroller, its first child: the marks scroll inside it. */
export const TURN_RAIL_SCROLLER_SELECTOR = ':scope > [data-dsh-claude-part~="rail-scroller"]'
/**
 * One mark: a button in the rail's list, not the turn it presses. A host that
 * draws only the marks near its scroll position writes the mark's place in
 * that list as `data-index`; one that draws every mark writes nothing, and the
 * mark's order in the rail is then the place, while the rail holds as many
 * marks as the skin's list has turns (features/turn-nav).
 */
export const TURN_RAIL_MARK_SELECTOR = 'button'
/** The mark of the turn at the reading position. */
export const TURN_RAIL_CURRENT_SELECTOR = 'button[aria-current="true"]'
/**
 * The rail's fixed pitch and its inset at each end (TurnNavigator's
 * TURN_SPACING_PX and RAIL_INSET_PX): its scroller's content is
 * `count × pitch + 2 × (inset − pitch / 2)` pixels tall.
 */
export const TURN_RAIL_PITCH = 10
export const TURN_RAIL_INSET = 6
/** A process group's header control. */
export const PROCESS_ACTIVITY_SELECTOR = 'button[data-process-activity]'
/** A fold: the host's DisclosureRow, and every other control that opens and closes something. */
export const DISCLOSURE_ROW_SELECTOR = '[data-disclosure-row]'
/**
 * The header a newer host build wraps around a DisclosureRow's own row and its
 * accessory: the body then stands beside this wrapper. An older build writes
 * no wrapper and sets the body beside the row itself.
 */
export const DISCLOSURE_HEADER_SELECTOR = '[data-disclosure-header]'
/** A DisclosureRow that has a body to open; a row without one draws no chevron. */
export const DISCLOSURE_EXPANDABLE_SELECTOR = '[data-expandable="true"]'
/**
 * The separator a DisclosureRow writes between its title and a description,
 * only when the description is not empty; the shimmer copies skip it.
 */
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
/** The page's own phase: `hero` before a session is chosen, `active` once one is shown. */
export const PHASE_ATTRIBUTE = 'data-phase'
/** The composer card and the stack of cards above it. */
export const COMPOSER_STACK_SELECTOR = '[data-dsh-claude-part~="composer-stack"]'
/**
 * The rail ui-attachment draws a draft's files and images into, above the
 * field. Its local name carries no part of the host's tables, so it is the one
 * mark a card's attachment leaves while the parts walk has yet to reach it —
 * the node the host mounts in the card the restyle has just told carries none.
 * The row inside it and the tiles are the same local name with their own tail.
 */
export const COMPOSER_ATTACHMENT_RAIL_SELECTOR = '[class*="_rail"]'
/** The placeholder the host's own editor draws inside the draft. */
export const COMPOSER_PLACEHOLDER_SELECTOR = '[data-composer-placeholder]'
/** The host's own sentence for the composer card's field, which the skin reads beside whether the card carries it. */
export const COMPOSER_PLACEHOLDER_ATTRIBUTE = 'data-placeholder'
/**
 * The statistics in the composer stack. Both markers are read (D3), because an
 * older host build writes only the container; the context panel repeats the
 * figures
 */
export const COMPOSER_STATS_SELECTOR = '[data-composer-stats]'
export const COMPOSER_STAT_SELECTOR = '[data-composer-stat]'
/**
 * The portrait adaptation a mobile remote plugin applies to the desktop GUI
 * (dsh-remote-web-ui marks the body `dsh-remote-portrait`). Not the host's
 * either: its rules float the composer's controls with transforms of their
 * own, so the composer pass reads this mark and hands it to the stylesheet as
 * the skin's own attribute, and the phone rules that place those controls
 * stand aside from it.
 */
export const MOBILE_PORTRAIT_SELECTOR = 'body.dsh-remote-portrait'
/**
 * The filled arc of the context meter: the circle the host gives a dash array
 * (its track circle carries none). The skin paints it with the colour the
 * occupancy fell on
 */
export const CONTEXT_METER_FILL_SELECTOR = '[data-dsh-claude-context-meter] circle[stroke-dasharray]'
/** The composer variant the host puts on the card (`hero` / `default`). */
export const COMPOSER_VARIANT_ATTRIBUTE = 'data-composer-variant'
/**
 * The host's own access-mode trigger inside its permission slot, skipping the
 * skin's own control: the skin's elements carry the `dsh-claude-` namespace as
 * whole class tokens, so no substring match is involved (D3).
 */
export const PERMISSION_TRIGGER_SELECTOR = '[data-slot="conversation.input.permission"] button:not([class^="dsh-claude-"], [class*=" dsh-claude-"])'
/**
 * The slot the host mounts a plugin's own entry in beside the model seat: the
 * built-in voice input puts its microphone there, and the host expands the seat
 * around the slot while that plugin is live.
 */
export const CONVERSATION_ACTIVITY_SLOT_SELECTOR = '[data-slot="conversation.input.activity"]'
/** A host button that opens a dialog: the model and effort pickers in the composer stack. */
export const DIALOG_TRIGGER_SELECTOR = 'button[aria-haspopup="dialog"]'
/** The sidebar footer block; the skin's account entry lives inside it. */
export const FOOT_AREA_SELECTOR = '[data-dsh-claude-part~="foot-area"]'
/**
 * The host's own sidebar search: a button and an input in the workspace
 * section's header. The skin's box stands in for it, and the `icon` style
 * leaves the host's button in place with its click taken over, so both read
 * this slot.
 */
export const SIDEBAR_SEARCH_SLOT_SELECTOR = '[data-slot="sidebar"] [data-dsh-claude-part~="search-slot"]'
/** The sidebar's own column box, whose width follows the collapse and the reader's drag. */
export const SIDEBAR_ROOT_SELECTOR = '[data-slot="sidebar"] > [data-dsh-claude-part~="sidebar-root"]'
/**
 * The sidebar's top row: the wide brand and the collapse toggle, and the row
 * the collapsed rail keeps as its own mark's seat. The search feature reads it
 * to give the rail a row of its own under the mark.
 */
export const SIDEBAR_LOGO_ROW_SELECTOR = '[data-slot="sidebar"] [data-dsh-claude-part~="logo-row"]'
/** The wide brand in the sidebar's top row; the collapsed rail has none. */
export const SIDEBAR_BRAND_SELECTOR = '[data-slot="sidebar"] [data-dsh-claude-part~="logo-row"] > [data-dsh-claude-part~="brand-button"]'
/**
 * The sidebar's collapse toggle, inside the top row. The desktop shells fix it
 * into the caption strip; the web leaves it the row's last cell.
 */
export const SIDEBAR_TOGGLE_SELECTOR = '[data-slot="sidebar"] [data-dsh-claude-part~="logo-row"] > [data-dsh-claude-part~="sidebar-toggle"]'
/** The host's own composer is replaced by a panel of its own choice; this is that panel's seat. */
export const CHAIN_OVERLAY_FALLBACK_ATTRIBUTE = 'data-chain-overlay-fallback'
/** The host's own open menus and modal dialogs: the foreground the skin must not walk over. */
export const FOREGROUND_SELECTOR = '[role="dialog"][aria-modal="true"], [role="menu"]'
/** The host's menu card and its list, which the skin injects a row into. */
export const MENU_ROLE_SELECTOR = '[role="menu"]'
export const MENU_LIST_SELECTOR = '[role="presentation"]'
/** The host's account trigger in the sidebar footer. */
export const ACCOUNT_TRIGGER_SELECTOR = '[aria-haspopup="menu"][data-signed-out]'
/**
 * The popup-opening control in the footer's settings area, which the account
 * menu rows open. The older host puts its settings dialog trigger there
 * (`aria-haspopup="dialog"`); the newer one puts the account menu's own trigger
 * (`aria-haspopup="menu"`), so the value is not part of the contract.
 */
export const SETTINGS_BUTTON_SELECTOR = '[data-dsh-claude-part~="settings-area"] button[aria-haspopup]'
/** The sidebar's action list, whose entries the skin mirrors into its drawer. */
export const FOOTER_ACTIONS_SELECTOR = '[data-dsh-claude-part~="footer-actions"]'
/** A slot anchor; its children are the host's real entries. */
export const SLOT_ANCHOR_SELECTOR = '[data-slot]'
/**
 * The three slot anchors the skin's part walk reads as regions (D3): each names
 * a host subtree the skin restyles, and the walk enters a region where its
 * anchor matches rather than climbing to the document for every element.
 */
export const SIDEBAR_SLOT_SELECTOR = '[data-slot="sidebar"]'
export const CONVERSATION_HEADER_SLOT_SELECTOR = '[data-slot="conversation.header"]'
/** The root slot: the shell frame is its own element child, and the three columns are inside. */
export const ROOT_SLOT_SELECTOR = '[data-slot="root"]'
/** The right sidebar's own column: the host marks it, and its docked panels are the skin's cards. */
export const RIGHTBAR_COLUMN_SELECTOR = '[data-rightbar-col]'
/**
 * The right panel's own collapse control, inside the chrome strip that panel
 * draws at its top-right. It exists only while that panel is open, and it hangs
 * from a transformed, clipped subtree, where a fixed box would be measured from
 * the panel and cut at its edge: the skin draws its own control in the header's
 * row and presses this one instead.
 */
export const RIGHTBAR_TOGGLE_SELECTOR = '[data-sidebar-right-open] [data-sidebar-right-toggle]'
/** The right panel's own box; the host states its width from the viewport's pixels. */
export const RIGHTBAR_PANEL_SELECTOR = '[data-sidebar-right-panel]'
/** The right column's drag handle; the host places it from the viewport's own width. */
export const RIGHTBAR_HANDLE_SELECTOR = '[data-side="rightbar"]'
/** The sidebar's drag handle; the host places it at the sidebar's own width. */
export const SIDEBAR_HANDLE_SELECTOR = '[data-side="sidebar"]'
/**
 * The frame's collapse marker: the host writes it on the frame while the
 * sidebar is closed and takes it away while the sidebar stands open, whatever
 * opened it (the toggle, its shortcut, a search that asks for the wide list).
 */
export const SIDEBAR_COLLAPSED_ATTRIBUTE = 'data-sidebar-collapsed'
/** The frame's mark while it gives the right panel no track at all. */
export const RIGHTBAR_COLLAPSED_ATTRIBUTE = 'data-rightbar-collapsed'
/**
 * The narrowest frame on which the host keeps an open right panel beside an
 * open sidebar: its column solver drops the right track once the frame is
 * narrower than the sidebar's default width (280), the centre's minimum (400)
 * and the right track's own minimum (300) together.
 */
export const SIDEBAR_BESIDE_RIGHTBAR_MIN_PX = 980

/* ---------- the conversation header's own row ---------- */

/**
 * The header's title row: the line the title cluster, the utilities and the
 * corner seat share. The band placement measures against it, because the
 * title's own box moves with the placement. Rows of the same shape sit in the
 * sidebar's panels, so a reader takes the one carrying a title or the
 * utilities rather than the first match.
 */
export const HEADER_TITLE_ROW_SELECTOR = '[data-dsh-claude-part~="title-row"]'
/**
 * The session title's breadcrumb nav: the words themselves, not the flex
 * cluster that lays them out (the cluster stretches, so it says nothing about
 * where the title ends).
 */
export const HEADER_TITLE_SELECTOR = '[data-dsh-claude-part~="header-title"]'
/** The header's utilities cluster: the workspace opener, the overflow menu, the bottom-panel toggle. */
export const HEADER_UTILITIES_SELECTOR = '[data-dsh-claude-part~="header-utilities"]'
/** The corner seat beside the utilities, carrying the right-sidebar toggle. */
export const HEADER_CORNER_SELECTOR = '[data-dsh-claude-part~="header-corner"]'
/**
 * The conversation header itself, resolved with `closest` from the title row:
 * the same substring names a dozen other bars (the sidebar's action row, the
 * background-task chip), so it is never queried document-wide.
 */
export const CONVERSATION_HEADER_SELECTOR = '[data-dsh-claude-part~="conversation-header"]'
/** The view-tab strip inside the header, whose box the band placement keeps clear of. */
export const VIEW_TABS_STRIP_SELECTOR = '[data-dsh-claude-part~="view-tabs"]'
/**
 * The tablist the strip holds when the host wraps it in a row of its own
 * (0.2.1-rc.3): the plate the stylesheet draws, and the box a placement reads
 * where the strip's own box is kept wide for the host's count of the tabs.
 */
export const VIEW_TABS_LIST_SELECTOR = '[data-dsh-claude-part~="view-tabs-list"]'
/**
 * The conversation's own view tablist, which the host marks: a tablist a
 * plugin renders in the composer's toolbar or a popover sits inside the same
 * conversation root and is no view switch.
 */
export const CONVERSATION_TABS_SELECTOR = '[data-conversation-tabs]'

/* ---------- the document, the shell and the browser API ---------- */

/** The shell's window marks: the Windows caption row, the platform, and fullscreen. */
export const WINDOWS_TITLEBAR_ATTRIBUTE = 'data-windows-titlebar'
/**
 * The desktop shell's own seat in the Windows caption row, where its native
 * menu is drawn: the row's content starts to the right of it.
 */
export const WINDOWS_MENU_SELECTOR = '[data-windows-menu]'
export const PLATFORM_ATTRIBUTE = 'data-platform'
export const FULLSCREEN_ATTRIBUTE = 'data-fullscreen'
/**
 * Where the Windows caption row's content starts after the shell's own
 * controls: the host declares it on the document element only while the frame
 * carries the collapse marker, and the native menu is placed from it.
 */
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
/**
 * Every stylesheet a plugin's module injected into `<head>`, tagged by the
 * loader with the package that owns it and the sheet's own path in that
 * package: the sodium rewrite finds the sheets its table lists by these (D78).
 */
export const PLUGIN_SHEET_SELECTOR = 'style[data-plugin]'
export const PLUGIN_SHEET_OWNER_ATTRIBUTE = 'data-plugin'
export const PLUGIN_SHEET_PATH_ATTRIBUTE = 'data-plugin-css'

/* ---------- a plugin's footer control ---------- */
/**
 * The two attributes a plugin puts on a control it mounts into the sidebar
 * footer: the package it belongs to, and the part the control plays inside its
 * own entry — `entry` on the control the sidebar footer shows. The skin keeps
 * the update control in the sidebar rather than gathering it into the account
 * popover (constants.ts, FOOTER_SEATS), and reads it through the plugin's own
 * naming rather than a class name the build hashes.
 */
export const PLUGIN_ENTRY_ATTRIBUTE = 'data-dsh-part'
export const PLUGIN_ENTRY_OWNER_ATTRIBUTE = 'data-dsh-plugin'
export const PLUGIN_ENTRY_UPDATE_SELECTOR = `button[${PLUGIN_ENTRY_OWNER_ATTRIBUTE}="update"][${PLUGIN_ENTRY_ATTRIBUTE}="entry"]`

/* ---------- ds-bot (Fei2411/DeepSeek-Bot) ---------- */

/**
 * On `<body>` while ds-bot's Bot surface is painted: its shell group writes
 * the motion level there and deletes it when the group withdraws for the
 * shell's own interface (its Agent mode).
 */
export const DS_BOT_SURFACE_ATTRIBUTE = 'data-bt-motion'
/** In Agent mode, ds-bot's one control on the shell's own page: the footer button back to its Bot surface. */
export const DS_BOT_RETURN_SELECTOR = '.bt-return'
/** ds-bot's account button, which opens its menu on the Bot surface. */
export const DS_BOT_ACCOUNT_SELECTOR = '.bt-account'
/** That menu, portalled into `<body>` while open. */
export const DS_BOT_ACCOUNT_MENU_SELECTOR = '.bt-account-menu'
/** The menu's last group, after its last separator: the one item that switches to Agent mode. */
export const DS_BOT_AGENT_ITEM_SELECTOR = '.bt-account-menu > .bt-menu-sep:last-of-type ~ [role="menuitem"]'
/** The top row of ds-bot's own sidebar: its brand, search and new buttons. */
export const DS_BOT_SIDEBAR_TOP_SELECTOR = '.bt-side-top'
