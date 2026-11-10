/** Skin-owned attributes and identities; the build checks stylesheet reads against these writes (D9, D73). */
export * from '@dsh-claude-style/contracts/prefs'
import { COMPOSER_SCOPE_ALL, COMPOSER_SCOPE_CONVERSATION, COMPOSER_SCOPE_HERO } from '@dsh-claude-style/contracts/prefs'
import { PACKAGE_NAME } from '@dsh-claude-style/contracts/package'
import { PLUGIN_ENTRY_UPDATE_SELECTOR } from '@dsh-claude-style/contracts/dom'
export { PACKAGE_NAME }

export const STYLE_ID = 'dsh-claude-style-style'
/** The surface sheets' own element, which stays while ds-bot's surface has the page (D74). */
export const SURFACE_STYLE_ID = 'dsh-claude-style-surface'
/** Optional Anthropic faces are declared only here, so absent files cause no requests. */
export const WEBFONTS_STYLE_ID = 'dsh-claude-style-webfonts'

/** Fallback profile entry id used when the running loader id is unavailable. */
export const SETTINGS_ENTRY_FALLBACK = 'ui-skin-claude-style'
/** These tags keep host and sibling stylesheet removal away from this package (D9). */
export const STYLE_PLUGIN_CSS = `${PACKAGE_NAME}/client.css`
export const SURFACE_PLUGIN_CSS = `${PACKAGE_NAME}/surface.css`
export const WEBFONTS_PLUGIN_CSS = `${PACKAGE_NAME}/webfonts.css`
/** A slash prevents the foreign-sheet tag from matching any package name (D9). */
export const FOREIGN_SHEET_TAG = `${PACKAGE_NAME}/foreign-sheet`
export const BUNDLE_CONFIG_SLOT = 'plugins.bundle.config'
export const SETTINGS_SECTION_SLOT = 'settings.section'
export const REPOSITORY_URL = 'https://github.com/Nwflower/dsh-claude-style'

/** The document attribute the stylesheet switches on. */
export const BRAND_ATTR = 'data-dsh-claude-brand'

/** The custom brand layer over either brand (D30, features/brand/brand.ts): each part stands only while the reader supplied it — CUSTOM_MARK_ATTR for a mark image, CUSTOM_WORD_ATTR as `image` or `text`, CUSTOM_TINT_ATTR while the images take an ink (`accent` or `text`, in --dsh-claude-logo-ink), CUSTOM_PALETTE_ATTR for the reader's four colours.
 * BRAND_INK_ATTR carries that `accent`/`text` choice while it repaints the brand art; the images, the name and the colours ride <body> as custom properties. */
export const CUSTOM_MARK_ATTR = 'data-dsh-claude-custom-mark'
export const CUSTOM_WORD_ATTR = 'data-dsh-claude-custom-word'
export const CUSTOM_WORD_IMAGE = 'image'
export const CUSTOM_WORD_TEXT = 'text'
export const CUSTOM_TINT_ATTR = 'data-dsh-claude-custom-tint'
export const CUSTOM_PALETTE_ATTR = 'data-dsh-claude-custom-palette'
export const BRAND_INK_ATTR = 'data-dsh-claude-brand-ink'

/** The document attribute the resolved animation answer rides. */
export const MOTION_ATTR = 'data-dsh-claude-motion'

/** The mark a page wears while off screen (core/page-visibility.ts): the stylesheet holds every animation still under it, so a hidden window pays for no frames. */
export const ASLEEP_ATTR = 'data-dsh-claude-asleep'

/** A footer entry the skin keeps in the sidebar rather than gathering into the account popover (features/account/footer-mirror.ts, footer-seats.ts): the element carries its seat, and the account row carries a copy of it. */
export const FOOTER_SEAT_ATTR = 'data-dsh-claude-footer-seat'
/** The seats a kept entry may take, matched on the naming the plugin itself writes, so the skin reaches a control it does not own without a class name the build hashes. */
export const FOOTER_SEATS = [
  { seat: 'update', selector: PLUGIN_ENTRY_UPDATE_SELECTOR },
] as const
/** A footer entry a plugin lays out as a block of its own — a `<section>` carrying its heading and its rows — which the takeover keeps above the account row instead of gathering it into the account menu (features/account/footer-mirror.ts, footer-takeover.css). */
export const FOOTER_BLOCK_ATTR = 'data-dsh-claude-footer-block'

/** The host frame's mark while the sidebar stands over the page from a hover (features/sidebar-peek): `open`, then `closing` for the slide back out.
 * The two custom properties carry the collapsed width the centre keeps clear of and the width the slide travels. */
export const SIDEBAR_PEEK_ATTR = 'data-dsh-claude-sidebar-peek'
export const SIDEBAR_PEEK_OPEN = 'open'
export const SIDEBAR_PEEK_CLOSING = 'closing'
export const SIDEBAR_PEEK_RAIL_PROPERTY = '--dsh-claude-sidebar-peek-rail'
export const SIDEBAR_PEEK_WIDTH_PROPERTY = '--dsh-claude-sidebar-peek-width'
/** A panel row the reader took off the sidebar's list (features/sidebar-entries); More still reaches it. */
export const PANEL_HIDDEN_ATTR = 'data-dsh-claude-panel-hidden'

/** The waiting line's paint rides this attribute and the stylesheets decide it (features/chat-wait/chat-wait.css): the wording, the swap and the clock stay untouched. */
export const STATUS_MOTION_ATTR = 'data-dsh-claude-status-motion'

/** The document attributes the choices below resolve onto; the values themselves are in the table (contracts/prefs.ts). */
export const PALETTE_ATTR = 'data-dsh-claude-palette'
/** The colour card the page paints, resolved from `paletteColors` (D30): a palette card id. Following the brand and the reader's four resolve to the brand's card, so those tokens stand and the custom blocks layer over them.
 * A picked card stands on its own whatever the brand mark is. */
export const PALETTE_CARD_ATTR = 'data-dsh-claude-palette-card'
export const TYPEFACE_ATTR = 'data-dsh-claude-typeface'
export const MASCOT_ATTR = 'data-dsh-claude-mascot'
export const SEARCH_STYLE_ATTR = 'data-dsh-claude-search-style'
export const SIDEBAR_LAYOUT_ATTR = 'data-dsh-claude-sidebar-layout'
/** Present as `off` while the sidebar's brand area is hidden (theme/sidebar.css); the Brand row's switch writes it. */
export const SIDEBAR_BRAND_ATTR = 'data-dsh-claude-sidebar-brand'
/** The mark a running conversation carries in the sidebar (theme/sidebar.css): its presence and value pick the breathing light or the turning ring. */
export const ONGOING_INDICATOR_ATTR = 'data-dsh-claude-ongoing-indicator'
/** Which end of its row that mark takes (features/sidebar-status/sidebar-status.css): `left` keeps the host's leading slot in the row's flow, `right` moves the mark to the trailing column. */
export const ONGOING_SIDE_ATTR = 'data-dsh-claude-ongoing-side'
export const STATS_POSITION_ATTR = 'data-dsh-claude-stats-position'
/** The face the context meter is drawn with (features/context-stats/context-meter-face.ts): the pie, dsh's own ring on the continuous band, or the measured ring on three bands. The value is `contextDisplay` itself. */
export const CONTEXT_DISPLAY_ATTR = 'data-dsh-claude-context-display'
/** Whether the percentage stands beside that face, as `on` or `off` (features/context-stats/meter-ring.css). */
export const CONTEXT_NUMBERS_ATTR = 'data-dsh-claude-context-numbers'
/** The room under the conversation's composer (features/composer/bottom-gap.css); the host's own writes no attribute. */
export const COMPOSER_GAP_ATTR = 'data-dsh-claude-composer-gap'
/** The requirement the settings rows under the conversation's composer carry (D72): they restyle that composer, which the hero's own and the "all" scope do not stand for. */
export const CONVERSATION_COMPOSER_REQUIRES = {
  pref: 'composerScope',
  values: [COMPOSER_SCOPE_CONVERSATION, COMPOSER_SCOPE_ALL],
  note: 'conversationComposerNote',
} as const
/** The requirement the settings rows that restyle any composer carry (D72): the hero's, the conversation's and the "all" scope. */
export const ANY_COMPOSER_REQUIRES = {
  pref: 'composerScope',
  values: [COMPOSER_SCOPE_HERO, COMPOSER_SCOPE_CONVERSATION, COMPOSER_SCOPE_ALL],
  note: 'composerRequired',
} as const
/** The factor the conversation column draws at (features/conversation-width/); the full width writes no attribute. */
export const CONVERSATION_WIDTH_ATTR = 'data-dsh-claude-conversation-width'
/** Present while open process groups draw their rows as one card (features/process-column/); the flat layout writes none. */
export const PROCESS_COLUMN_ATTR = 'data-dsh-claude-process-column'
/** Present while the effort trigger takes a colour from the rung in force (features/effort/effort-picker.css): the switch-off rung keeps the resting ink, and every thinking rung takes its step along the theme accent's ramp, the top rung included. */
export const EFFORT_ACCENT_ATTR = 'data-dsh-claude-effort-accent'
/** The page zoom in force, as the factor the stylesheet scales the page by (theme/chrome.css). Absent while the page follows the system.
 * shared/page-zoom.ts reads it back as the scale every geometry divides a measured box by to reach the page's own pixels. */
export const PAGE_ZOOM_ATTR = 'data-dsh-claude-page-zoom'

/** 缩放倍率走的自定义属性：任何数字都成立，chrome.css 的 `zoom` 读它。 */
export const PAGE_ZOOM_VAR = '--dsh-claude-page-zoom-factor'
/** Ordinary interface text's percentage and its scale, independent of the page's scale. */
export const INTERFACE_FONT_SIZE_ATTR = 'data-dsh-claude-interface-font-size'
export const INTERFACE_FONT_SIZE_VAR = '--dsh-claude-interface-font-scale'
/** Present while the page's own width — the window's over the page zoom — is at or under the width each one names (shared/page-scale.ts).
 * A stylesheet reads these where it would write a width media query, which reads the window unzoomed, so a zoomed page would keep its wide layout in a narrow page. */
export const PAGE_UNDER_1000_ATTR = 'data-dsh-claude-page-under-1000'
export const PAGE_UNDER_760_ATTR = 'data-dsh-claude-page-under-760'
export const PAGE_UNDER_480_ATTR = 'data-dsh-claude-page-under-480'

/** The background fill's opacity as a percentage, present only below 100 (shared/background-opacity.ts): the canvas fills read the property `projectBackgroundOpacity` writes through color-mix.
 * At the default both are absent, so the page keeps the fills it has always painted. */
export const BACKGROUND_OPACITY_ATTR = 'data-dsh-claude-background-opacity'

/** 背景不透明度走的自定义属性：0 到 1 的系数，画布填充的 color-mix 读它。 */
export const BACKGROUND_OPACITY_VAR = '--dsh-claude-background-opacity'


/** Present while the ported chat-area follow is installed (features/chat-follow/). The rules hanging off it are that feature's own: a capped process group's body scrolls vertically alone, so the catch-up measures the distance the host's own smooth scroll does.
 * The host's back-to-end button is placed over the composer, and the waiting line is pinned above it (features/chat-wait/chat-wait.css); switched off, the chat area is handed back untouched. */
export const CHAT_FOLLOW_ATTR = 'data-dsh-claude-chat-follow'
/** On the flow column while a door rolls (features/chat-follow/chat-follow.ts). A door's height change reads to the host as a reader who left the tail and takes its own data-chat-following-tail away (D3), the gate the waiting line's pin waits for (features/chat-wait/chat-wait.css).
 * This mark stands for that gate until the fold hands the follow back. */
export const FOLLOW_HOLD_ATTR = 'data-dsh-claude-follow-hold'
/** On a container the reader has taken over with his own scrolling (packages/engine/src/scroll-owner.ts), until he comes back to its end. The waiting line's pin (features/chat-wait/chat-wait.css) reads it.
 * A pin stands only while the skin's own follow moves the position, never over content the reader scrolled back to. */
export const READER_HOLD_ATTR = 'data-dsh-claude-reader-hold'
/** Present while the ported token reveal is installed (features/chat-reveal/): its step rules hang off it, and switching the feature off leaves the page with no trace of it. */
export const CHAT_REVEAL_ATTR = 'data-dsh-claude-chat-reveal'
/** The reveal's fade: how many alpha steps a character walks through, the faintest of them, the prefix of each step's highlight name and the custom property an element publishes its own colour to.
 * The engine registers one highlight per step; the build writes one `::highlight()` rule per step from the same four values (scripts/build/feature-sheets.mjs). */
export const CHAT_REVEAL_STEPS = 24
/** The faintest step: a fifth faint, which still reads as text arriving in both themes. */
export const CHAT_REVEAL_MIN_OPACITY = 0.2
export const CHAT_REVEAL_HIGHLIGHT_PREFIX = 'dsh-claude-tok-'
export const CHAT_REVEAL_COLOR_VAR = '--dsh-claude-run-color'
/** On the real message row while the send bubble's stand-in is flying (features/chat-send/): the stylesheet hides that row, keeping its layout box so the stand-in can measure the destination from it every frame. */
export const CHAT_FLYING_ATTR = 'data-dsh-claude-send-flight'
/** On the row of a message just sent while it grows in place (features/chat-send/): the stylesheet hangs the entrance animation off it, so that row animates once — a row rendered by a restored session never carries the mark. */
export const MESSAGE_ENTER_ATTR = 'data-dsh-claude-message-enter'
/** On a user message the skin holds folded (features/chat-fold/message-fold.ts): the stylesheet clamps the bubble to the fold's own cap and softens its bottom edge. The send flight reads it too: a message the fold holds is not one to carry up whole. */
export const MESSAGE_FOLD_ATTR = 'data-dsh-claude-message-fold'
/** On a node the skin owns purely for its own bookkeeping — the caret motion's probe container and the caret it draws.
 * The shared scheduler ignores mutations against such a node (D40), so measuring or redrawing never wakes a pass that no feature needs. */
export const QUIET_ATTR = 'data-dsh-claude-quiet'
/** On a host element the stylesheet keys on, carrying the name of the part it plays (packages/engine/src/parts.ts). Every rule that used to match a fragment of a hashed host class name reads this attribute instead, so a match is exact.
 * A host upgrade that drops the element leaves the part unresolved rather than silently matching something else, and no other skin's class name can collide with these rules (D3). */
export const PART_ATTR = 'data-dsh-claude-part'
/** On a host element, naming the parts its own subtree holds (packages/engine/src/parts.ts, packages/engine/src/parts-table.ts). A rule that used to ask whether an element contains another (`A:has(B)`) reads this mark instead.
 * The marking pass already walks that subtree, so the answer costs one attribute read rather than a style pass over every candidate (D9); the values are the relation names declared in the parts table. */
export const HOLDS_ATTR = 'data-dsh-claude-holds'
/** On the body while the session overview is installed (features/session-panel): the stylesheet hides the host's background-work chips, and the view-tab strip takes the title's line beside the title's own actions (features/view-tabs). It goes with the feature's seats, so its absence is the preference off. */
export const SESSION_PANEL_ATTR = 'data-dsh-claude-session-panel'
/** On the element the fold glide is pressing right now (features/chat-fold/fold-glide.ts): while it stands, the elements inside lay out at their natural height instead of being squeezed by flex (fold-motion.css). */
export const CHAT_ROLLING_ATTR = 'data-dsh-claude-rolling'
/** On an editable surface once the caret motion has taken it over (features/caret/). */
export const CARET_ATTR = 'data-dsh-claude-caret'
export const CARET_LAYER_ATTR = 'data-dsh-claude-caret-layer'
export const CARET_VISIBLE_ATTR = 'data-dsh-claude-caret-visible'
/** On a parent lent the positioning context the drawn caret is placed against. */
export const CARET_HOST_ATTR = 'data-dsh-claude-caret-host'
/** On a text field the skin builds for its own interface, which the caret motion takes over like a seat textarea (features/caret/).
 * The host's own fields are reached through their contracts; this one belongs to the skin, so it carries the skin's mark. */
export const CARET_FIELD_ATTR = 'data-dsh-claude-field'
/** Present while the ported automatic folding is installed (features/chat-fold/): the stylesheet's header-summary rules hang off it, and switching the feature off hands the chat area back whole. */
export const CHAT_FOLD_ATTR = 'data-dsh-claude-chat-fold'
/** Present while the skin takes over the sidebar footer (settings area + account row). */
export const FOOTER_ATTR = 'data-dsh-claude-footer-takeover'
/** Present while the composer restyle applies to the page currently shown. */
export const COMPOSER_ATTR = 'data-dsh-claude-composer-active'
/** Present while the composer restyle applies and a conversation tab other than the chat is up: the composer is chat-view-only, so the stylesheet drops the whole bottom area (features/composer/composer.ts). */
export const COMPOSER_HIDDEN_ATTR = 'data-dsh-claude-composer-hidden'
/** Present on the conversation root while a message column is mounted on the page. The host pins the composer seat and sizes the view area from `data-phase="active"` alone, so a phase mark landing on `hero` or `settling` with the transcript already mounted drops both.
 * The composer would then stand in the middle of rows that paint on below it, so the stylesheet keys the pin, the bar and the view area's contract on this mark as well (features/composer/inline.css). */
export const TRANSCRIPT_ATTR = 'data-dsh-claude-transcript'
/** Present on every node the skin appends into one of the host's own slots: the seat box and the context meter's ring stand in the model slot beside the host's root.
 * The reader that names that root skips them by this mark (features/model/model-picker.ts). */
export const SLOT_NODE_ATTR = 'data-dsh-claude-slot-node'
/** Present while a mobile remote plugin's portrait layer owns the page (packages/contracts/src/dom.ts, MOBILE_PORTRAIT_SELECTOR). That layer floats the composer's controls with transforms of its own.
 * The skin's placement of the send and stop buttons stands aside from them under this mark (features/composer/inline.css). */
export const MOBILE_PORTRAIT_ATTR = 'data-dsh-claude-mobile-portrait'
/** Present while the permission control is installed. The composer restyle hides the host's access-mode button because this feature replaces it, and that rule also requires this attribute.
 * A permission control that is switched off therefore hands the button back while the rest of the composer restyle keeps running. */
export const PERMISSIONS_ATTR = 'data-dsh-claude-permissions'
/** Present while the context statistics are installed (features/context-stats/context-stats.ts). The host's two stat dialogs are hidden only under it: their numbers are read into the context popover instead.
 * Switched off, the feature hands the dialogs back. */
export const SESSION_STATS_ATTR = 'data-dsh-claude-session-stats'
/** Stamped on the host's own account menu card while it is open (Desktop). That card is the host's shared Menu portal and its class names are hashed.
 * features/account/surface.ts stamps this attribute and account-footer.css repaints the card, its rows and its separators with the skin's popover language. */
export const ACCOUNT_MENU_ATTR = 'data-dsh-claude-account-menu'
/** Set on <body> from the moment the account row is hovered or pressed until its menu closes. The card's own marker lands two or three frames after the host painted the card, so an entry animation keyed on it replayed from transparent over a card already visible.
 * This one is in place before the host mounts the card, so the animation runs from its first frame. */
export const ACCOUNT_ARMED_ATTR = 'data-dsh-claude-account-armed'
/** Stamped on the host's account card by features/account/surface.ts once the card carries the skin's rows and the host has finished placing it. The host places the card from the geometry of its own rows; the skin's container lands a frame later, the card grows, and the host re-places it a frame after that.
 * Revealing on the mount frame fades the card in at a height and a place it is about to leave, so account-footer.css holds it inside the armed window until this marker lands, and the entry animation hangs on this marker. */
export const ACCOUNT_READY_ATTR = 'data-dsh-claude-account-ready'
/** Stamped on the host's shared menu card while it is the hero row's picker (the workspace chip or the agent-preset seat opened it). The host portals that card to <body> with no marker of its own, so the stylesheet cannot tell it from the host's other menus.
 * features/hero-menu/hero-menu.ts stamps it and hero-menu.css switches on it. */
export const HERO_MENU_ATTR = 'data-dsh-claude-hero-menu'
/** Stamped on the sidebar's More menu card while it is open. The card is the host's shared Menu portal like the two above; features/sidebar-entries stamps it from inside, since its own rows render in that card.
 * The card and its rows take the account menu's look (shared/popover.css). */
export const MORE_MENU_ATTR = 'data-dsh-claude-more-menu'
/** Present while the browser window does NOT hold focus. The focus state is the only thing that separates the two text selection paints (gray on black unfocused, blue on white focused) and no selector can read it.
 * features/composer/selection-mirror.ts mirrors it onto the document and the stylesheet switches on this attribute. */
export const WINDOW_BLUR_ATTR = 'data-dsh-window-blur'
/** The handoff marker: stamped on `body` while this build is live AND able to give the page back (D74). Its presence is a capability another package can read without running anything.
 * A skin that lists this theme as one of its looks has to know the page can come back, and a build from before D74 does not stamp it. */
export const HANDOFF_ATTR = 'data-dsh-claude-style-handoff'
/** The document attribute the skin center stamps while a skin is painting (D74). It is read at boot and watched afterwards: the value is the skin id, and the presence means the page belongs to a skin. */
export const SKIN_STAMP_ATTR = 'data-dsh-skin'
/** On the host's scroller around the settings page while the page is mounted (features/settings/settings.ts): the stylesheet keeps the scrollbar's room there, so switching tabs never shifts the layout. */
export const SETTINGS_SCROLLER_ATTR = 'data-dsh-claude-settings-scroller'
/** Which home layout is in force. The stylesheet branches on it, and the two layouts differ only in arrangement — the hero's own markup is the host's either way.
 * The switch is one attribute plus the panel registration. */
export const HOME_LAYOUT_ATTR = 'data-dsh-claude-home-layout'
/** Present while the studio layout owns the page shown: the studio layout is in force and the page is the new-conversation hero.
 * Every studio rule keys on it, so the host's hero-phase marker is read once per pass in JS rather than repeated across the stylesheet. */
export const HOME_HERO_ATTR = 'data-dsh-claude-home-hero'
/** The heat grid's ramp: how much of the heat ink each level paints, in percent, faintest first. Its length is the number of levels a day's tokens are bucketed into (features/home/data.ts); the build writes one rule per level from it (scripts/build/feature-sheets.mjs).
 * Not even steps: the low levels stay apart from each other and from the empty cell. */
export const HOME_HEAT_RAMP = [20, 40, 65, 100] as const
/** The host half's private routes, under this half's own names; the paths are the shared contract (packages/contracts/src/routes.ts, D73), declared once for both halves. */
export {
  BRAND_MARK_PATH as BRAND_MARK_ROUTE,
  BRAND_PATH as BRAND_ROUTE,
  BRAND_WORDMARK_PATH as BRAND_WORDMARK_ROUTE,
  FONT_FILES_PATH as FONT_FILES_ROUTE,
  HDSL_PATH as HDSL_ROUTE,
  HDSL_SKIN_PATH as HDSL_SKIN_ROUTE,
  PEAKRATE_PATH as PEAKRATE_ROUTE,
  SESSION_DELETE_PATH as SESSION_DELETE_ROUTE,
  SESSION_SEARCH_PATH as SESSION_SEARCH_ROUTE,
  SOUND_PATH as SOUND_ROUTE,
  USAGE_PATH as USAGE_ROUTE,
  USERNAME_PATH as USERNAME_ROUTE,
  WEBFONTS_PATH as WEBFONTS_ROUTE,
} from '@dsh-claude-style/contracts/routes'

/** Placement state for the sidebar's native status cell; the host remains its state owner. */
export const SIDEBAR_STATUS_ATTR = 'data-dsh-claude-row-status'
export const SIDEBAR_RUNNING_TITLE_ATTR = 'data-dsh-claude-running-title'
/** A closed workspace row whose sessions include a running one: the stylesheet draws the mark there. */
export const WORKSPACE_RUNNING_ATTR = 'data-dsh-claude-workspace-running'
