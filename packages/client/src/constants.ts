/**
 * The constants the build reads out of the browser half: the gate attributes
 * scripts/css.mjs checks on the syntax tree, the document attributes the
 * preferences resolve onto, and the feature gates. The stylesheets spell the
 * attributes out; the build holds every one they read to a name the browser
 * half writes. The identity constants and the host half's route re-exports live
 * here too.
 *
 * The preference vocabulary is the shared declaration
 * (packages/contracts/src/prefs.ts, D73): the values a preference holds, the
 * table that declares them, `Prefs` and the defaults. What this file adds is the
 * skin's own — the document attribute each value resolves onto, the feature
 * gates, and the identity constants.
 */
export * from '@dsh-claude-style/contracts/prefs'
import { COMPOSER_SCOPE_ALL, COMPOSER_SCOPE_CONVERSATION, COMPOSER_SCOPE_HERO } from '@dsh-claude-style/contracts/prefs'
import { PACKAGE_NAME } from '@dsh-claude-style/contracts/package'
import { PLUGIN_ENTRY_UPDATE_SELECTOR } from '@dsh-claude-style/contracts/dom'
export { PACKAGE_NAME }

export const STYLE_ID = 'dsh-claude-style-style'
/** The surface sheets' own element, which stays while ds-bot's surface has the page (D74). */
export const SURFACE_STYLE_ID = 'dsh-claude-style-surface'
/**
 * The sheet that registers the optional webfonts the drop point holds
 * (shared/webfonts.ts): the three Anthropic faces are declared there and
 * nowhere else, so an install without them sends no font request at all.
 */
export const WEBFONTS_STYLE_ID = 'dsh-claude-style-webfonts'

/**
 * Settings identity.
 *
 * A settings namespace IS a profile entry id and its schema IS the entry's
 * Config, so the id below is what both halves address — read off the
 * running loader entry where possible, with the id `cordis.patch.yml`
 * inserts as the fallback.
 *
 * PACKAGE_NAME is the other half of the contract: a bundle's own
 * configuration is a `plugins.bundle.config` entry keyed by the bundle's
 * package name, which is what makes it render on this plugin's page.
 */
export const SETTINGS_ENTRY_FALLBACK = 'ui-skin-claude-style'
/**
 * The skin stylesheet's own key in the client module system's bookkeeping:
 * the sheet is mounted tagged `data-plugin="<PACKAGE_NAME>"` and
 * `data-plugin-css="<STYLE_PLUGIN_CSS>"`, which is what keeps the host's
 * claim sweep and every sibling package's removal off it (D9).
 */
export const STYLE_PLUGIN_CSS = `${PACKAGE_NAME}/client.css`
/** The surface sheets' key in the same bookkeeping. */
export const SURFACE_PLUGIN_CSS = `${PACKAGE_NAME}/surface.css`
/** The optional webfonts sheet's key in the same bookkeeping. */
export const WEBFONTS_PLUGIN_CSS = `${PACKAGE_NAME}/webfonts.css`
/**
 * The tag this package gives a sibling's untagged stylesheet so the host's
 * claim sweep cannot attribute it to this package (D9). It carries a slash,
 * so it can never equal a package name — the id every removal step matches
 * on — and no package's reload takes the sheet away.
 */
export const FOREIGN_SHEET_TAG = `${PACKAGE_NAME}/foreign-sheet`
export const BUNDLE_CONFIG_SLOT = 'plugins.bundle.config'
export const SETTINGS_SECTION_SLOT = 'settings.section'
/**
 * The plugin's own repository. The settings page's heading links to it, and
 * the address is read from here rather than written into the component.
 */
export const REPOSITORY_URL = 'https://github.com/Nwflower/dsh-claude-style'

/** The document attribute the stylesheet switches on. */
export const BRAND_ATTR = 'data-dsh-claude-brand'

/**
 * The custom brand layer over either brand (D30, packages/client/src/features/brand/brand.ts). Each part stands only while
 * the reader has supplied it: CUSTOM_MARK_ATTR while a mark image is in place,
 * CUSTOM_WORD_ATTR as `image` while a wordmark image is and as `text` while
 * only a brand name is, CUSTOM_TINT_ATTR while the images take an ink
 * (`brandInk` set to `accent` or `text`, the ink itself in
 * --dsh-claude-logo-ink), and CUSTOM_PALETTE_ATTR while the reader's own four
 * colours are in force. BRAND_INK_ATTR carries `accent` or `text` while that
 * choice repaints the brand art. The images, the name and the colours ride
 * <body> as custom properties.
 */
export const CUSTOM_MARK_ATTR = 'data-dsh-claude-custom-mark'
export const CUSTOM_WORD_ATTR = 'data-dsh-claude-custom-word'
export const CUSTOM_WORD_IMAGE = 'image'
export const CUSTOM_WORD_TEXT = 'text'
export const CUSTOM_TINT_ATTR = 'data-dsh-claude-custom-tint'
export const CUSTOM_PALETTE_ATTR = 'data-dsh-claude-custom-palette'
export const BRAND_INK_ATTR = 'data-dsh-claude-brand-ink'

/** The document attribute the resolved animation answer rides. */
export const MOTION_ATTR = 'data-dsh-claude-motion'

/**
 * The mark a page wears while it is off screen (core/page-visibility.ts): the
 * stylesheet holds every animation still under it, so a hidden window stops
 * paying for frames it will have to catch up on.
 */
export const ASLEEP_ATTR = 'data-dsh-claude-asleep'

/**
 * A footer entry the skin keeps in the sidebar rather than gathering into the
 * account popover (features/account/footer-mirror.ts, footer-seats.ts): the
 * element carries the seat it stands in, and the account row carries a copy of
 * it.
 */
export const FOOTER_SEAT_ATTR = 'data-dsh-claude-footer-seat'
/**
 * The seats a kept entry may take. A seat is matched on the naming the plugin
 * itself writes, so the skin reaches a control it does not own without a class
 * name the build hashes.
 */
export const FOOTER_SEATS = [
  { seat: 'update', selector: PLUGIN_ENTRY_UPDATE_SELECTOR },
] as const

/**
 * The host frame's mark while the sidebar stands over the page from a hover
 * (features/sidebar-peek): `open`, then `closing` for the slide back out. The
 * collapsed column's width the centre keeps clear of and the width the slide
 * travels ride the frame as the two custom properties.
 */
export const SIDEBAR_PEEK_ATTR = 'data-dsh-claude-sidebar-peek'
export const SIDEBAR_PEEK_OPEN = 'open'
export const SIDEBAR_PEEK_CLOSING = 'closing'
export const SIDEBAR_PEEK_RAIL_PROPERTY = '--dsh-claude-sidebar-peek-rail'
export const SIDEBAR_PEEK_WIDTH_PROPERTY = '--dsh-claude-sidebar-peek-width'
/** A panel row the reader took off the sidebar's list (features/sidebar-entries); More still reaches it. */
export const PANEL_HIDDEN_ATTR = 'data-dsh-claude-panel-hidden'

/**
 * The waiting line's paint rides this attribute, and the stylesheets decide it
 * (features/chat-wait/chat-wait.css): the wording, the swap and the clock are
 * untouched by the choice.
 */
export const STATUS_MOTION_ATTR = 'data-dsh-claude-status-motion'

/** The document attributes the choices below resolve onto; the values themselves are in the table (contracts/prefs.ts). */
export const PALETTE_ATTR = 'data-dsh-claude-palette'
/**
 * The colour card the page paints, resolved from `paletteColors` (D30): one of
 * the palette card ids. Following the brand and the reader's four both resolve
 * to the brand's card, so those tokens stand and the custom blocks layer over
 * them; a picked card stands on its own whatever the brand mark is.
 */
export const PALETTE_CARD_ATTR = 'data-dsh-claude-palette-card'
export const TYPEFACE_ATTR = 'data-dsh-claude-typeface'
export const MASCOT_ATTR = 'data-dsh-claude-mascot'
export const SEARCH_STYLE_ATTR = 'data-dsh-claude-search-style'
export const SIDEBAR_LAYOUT_ATTR = 'data-dsh-claude-sidebar-layout'
/** Present as `off` while the sidebar's brand area is hidden (theme/sidebar.css); the Brand row's switch writes it. */
export const SIDEBAR_BRAND_ATTR = 'data-dsh-claude-sidebar-brand'
/**
 * The mark a running conversation carries in the sidebar (theme/sidebar.css):
 * its presence and value pick the breathing light or the turning ring.
 */
export const ONGOING_INDICATOR_ATTR = 'data-dsh-claude-ongoing-indicator'
/**
 * Which end of its row that mark takes (features/sidebar-status/
 * sidebar-status.css): `left` keeps the host's leading slot in the row's flow,
 * `right` moves the mark to the trailing column.
 */
export const ONGOING_SIDE_ATTR = 'data-dsh-claude-ongoing-side'
export const STATS_POSITION_ATTR = 'data-dsh-claude-stats-position'
/**
 * The face the context meter is drawn with (features/context-stats/
 * context-meter-face.ts): the pie, dsh's own ring on the continuous band, or
 * the measured ring on three bands. The value is `contextDisplay` itself.
 */
export const CONTEXT_DISPLAY_ATTR = 'data-dsh-claude-context-display'
/** Whether the percentage stands beside that face, as `on` or `off` (features/context-stats/meter-ring.css). */
export const CONTEXT_NUMBERS_ATTR = 'data-dsh-claude-context-numbers'
/** The room under the conversation's composer (features/composer/bottom-gap.css); the host's own writes no attribute. */
export const COMPOSER_GAP_ATTR = 'data-dsh-claude-composer-gap'
/**
 * The requirement the settings rows under the conversation's composer carry
 * (D72): they restyle that composer, which the hero's own and the "all" scope
 * do not stand for.
 */
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
/**
 * Present while the effort trigger takes a colour from the rung in force
 * (features/effort/effort-picker.css): the switch-off rung keeps the resting
 * ink, and every thinking rung takes its step along the theme accent's ramp,
 * the top rung included.
 */
export const EFFORT_ACCENT_ATTR = 'data-dsh-claude-effort-accent'
/**
 * The page zoom in force, as the factor the stylesheet scales the page by
 * (theme/chrome.css). Absent while the page follows the system; the scale every
 * geometry that converts a measured box into the page's own pixels divides by
 * reads it back (shared/page-zoom.ts).
 */
export const PAGE_ZOOM_ATTR = 'data-dsh-claude-page-zoom'

/** 缩放倍率走的自定义属性：任何数字都成立，chrome.css 的 `zoom` 读它。 */
export const PAGE_ZOOM_VAR = '--dsh-claude-page-zoom-factor'
/** Ordinary interface text's percentage and its scale, independent of the page's scale. */
export const INTERFACE_FONT_SIZE_ATTR = 'data-dsh-claude-interface-font-size'
export const INTERFACE_FONT_SIZE_VAR = '--dsh-claude-interface-font-scale'
/**
 * Present while the page's own width — the window's over the page zoom — is at
 * or under the width each one names (shared/page-scale.ts). A stylesheet reads
 * these where it would write a width media query: the query reads the window
 * unzoomed, so a zoomed page would keep its wide layout in a narrow page.
 */
export const PAGE_UNDER_1000_ATTR = 'data-dsh-claude-page-under-1000'
export const PAGE_UNDER_760_ATTR = 'data-dsh-claude-page-under-760'
export const PAGE_UNDER_480_ATTR = 'data-dsh-claude-page-under-480'

/**
 * The background fill's opacity as a percentage, present only below 100
 * (shared/background-opacity.ts): the canvas fills read the property
 * `projectBackgroundOpacity` writes from it through color-mix, and at the
 * default the attribute and the property are both absent, so the page keeps
 * the fills it has always painted.
 */
export const BACKGROUND_OPACITY_ATTR = 'data-dsh-claude-background-opacity'

/** 背景不透明度走的自定义属性：0 到 1 的系数，画布填充的 color-mix 读它。 */
export const BACKGROUND_OPACITY_VAR = '--dsh-claude-background-opacity'


/**
 * Present while the ported chat-area follow is installed
 * (packages/client/src/features/chat-follow/). The rules hanging off it are that
 * feature's own: a capped process group's body scrolls vertically alone, so the
 * catch-up measures the same distance the host's own smooth scroll does; the
 * host's back-to-end button is placed over the composer; and the waiting line is
 * pinned above it (packages/client/src/features/chat-wait/chat-wait.css).
 * Switched off, the chat area is handed back untouched.
 */
export const CHAT_FOLLOW_ATTR = 'data-dsh-claude-chat-follow'
/**
 * On the flow column while a door rolls
 * (packages/client/src/features/chat-follow/chat-follow.ts). A door's height
 * change reads to the host as a reader who left the tail, and it takes its own
 * data-chat-following-tail away (D3) — the gate the waiting line's pin waits
 * for (packages/client/src/features/chat-wait/chat-wait.css). This mark stands
 * for that gate until the fold hands the follow back.
 */
export const FOLLOW_HOLD_ATTR = 'data-dsh-claude-follow-hold'
/**
 * On a container the reader has taken over with his own scrolling
 * (packages/engine/src/scroll-owner.ts), until he comes back to its end. The
 * waiting line's pin (packages/client/src/features/chat-wait/chat-wait.css) reads it: a
 * pin stands only while the skin's own follow is the one moving the position,
 * never over content the reader scrolled back to.
 */
export const READER_HOLD_ATTR = 'data-dsh-claude-reader-hold'
/**
 * Present while the ported token reveal is installed
 * (packages/client/src/features/chat-reveal/): its step rules hang off it,
 * and switching the feature off leaves the page with no trace of it.
 */
export const CHAT_REVEAL_ATTR = 'data-dsh-claude-chat-reveal'
/**
 * The reveal's fade: how many alpha steps a character walks through, the
 * faintest of them, the prefix of each step's highlight name and the custom
 * property an element publishes its own colour to. The engine registers one
 * highlight per step; the build writes one `::highlight()` rule per step from
 * the same four values (scripts/feature-sheets.mjs).
 */
export const CHAT_REVEAL_STEPS = 24
/** The faintest step: a fifth faint, which still reads as text arriving in both themes. */
export const CHAT_REVEAL_MIN_OPACITY = 0.2
export const CHAT_REVEAL_HIGHLIGHT_PREFIX = 'dsh-claude-tok-'
export const CHAT_REVEAL_COLOR_VAR = '--dsh-claude-run-color'
/**
 * On the real message row while the send bubble's stand-in is flying
 * (packages/client/src/features/chat-send/): the stylesheet hides that row, keeping its layout
 * box so the stand-in can measure the destination from it every frame.
 */
export const CHAT_FLYING_ATTR = 'data-dsh-claude-send-flight'
/**
 * On the row of a message just sent while it grows in place
 * (packages/client/src/features/chat-send/): the stylesheet hangs the entrance
 * animation off it, so that row animates once — a row rendered by a restored
 * session never carries the mark and never animates.
 */
export const MESSAGE_ENTER_ATTR = 'data-dsh-claude-message-enter'
/**
 * On a user message the skin holds folded
 * (packages/client/src/features/chat-fold/message-fold.ts): the stylesheet
 * clamps the bubble to the fold's own cap and softens its bottom edge. The send
 * flight reads it too: a message the fold holds is not one to carry up whole.
 */
export const MESSAGE_FOLD_ATTR = 'data-dsh-claude-message-fold'
/**
 * On a node the skin owns purely for its own bookkeeping — the caret
 * motion's probe container and the caret it draws. The shared scheduler
 * ignores mutations against such a node (D40), so measuring or redrawing
 * never wakes a pass that no feature needs.
 */
export const QUIET_ATTR = 'data-dsh-claude-quiet'
/**
 * On a host element the stylesheet keys on, carrying the name of the part it
 * plays (packages/engine/src/parts.ts). Every rule that used to match a
 * fragment of a hashed host class name reads this attribute instead, so a match
 * is exact, a host upgrade that drops the element leaves the part unresolved
 * rather than silently matching something else, and no other skin's class name
 * can collide with these rules (D3).
 */
export const PART_ATTR = 'data-dsh-claude-part'
/**
 * On a host element, naming the parts its own subtree holds
 * (packages/engine/src/parts.ts, packages/engine/src/parts-table.ts). A rule
 * that used to ask the browser whether an element contains another
 * (`A:has(B)`) reads this mark instead: the marking pass already walks the
 * subtree, so the answer costs one attribute read rather than a style pass
 * over every candidate (D9). The values are the relation names declared in
 * the parts table.
 */
export const HOLDS_ATTR = 'data-dsh-claude-holds'
/**
 * On the element the fold glide is pressing right now (packages/client/src/features/chat-fold/
 * fold-glide.ts): while it stands, the elements inside lay out at their
 * natural height instead of being squeezed by flex (fold-motion.css).
 */
export const CHAT_ROLLING_ATTR = 'data-dsh-claude-rolling'
/** On an editable surface once the caret motion has taken it over (packages/client/src/features/caret/). */
export const CARET_ATTR = 'data-dsh-claude-caret'
export const CARET_LAYER_ATTR = 'data-dsh-claude-caret-layer'
export const CARET_VISIBLE_ATTR = 'data-dsh-claude-caret-visible'
/** On a parent lent the positioning context the drawn caret is placed against. */
export const CARET_HOST_ATTR = 'data-dsh-claude-caret-host'
/**
 * On a text field the skin builds for its own interface, which the caret motion
 * takes over like a seat textarea (packages/client/src/features/caret/). The
 * host's own fields are reached through their contracts; this one belongs to the
 * skin, so it carries the skin's mark.
 */
export const CARET_FIELD_ATTR = 'data-dsh-claude-field'
/**
 * Present while the ported automatic folding is installed
 * (packages/client/src/features/chat-fold/): the stylesheet's header-summary rules hang off it,
 * and switching the feature off hands the chat area back whole.
 */
export const CHAT_FOLD_ATTR = 'data-dsh-claude-chat-fold'
/** Present while the skin takes over the sidebar footer (settings area + account row). */
export const FOOTER_ATTR = 'data-dsh-claude-footer-takeover'
/** Present while the composer restyle applies to the page currently shown. */
export const COMPOSER_ATTR = 'data-dsh-claude-composer-active'
/**
 * Present while the composer restyle applies and a conversation tab other
 * than the chat is up: the composer is chat-view-only, so the stylesheet
 * drops the whole bottom area (packages/client/src/features/composer/composer.ts).
 */
export const COMPOSER_HIDDEN_ATTR = 'data-dsh-claude-composer-hidden'
/**
 * Present on the conversation root while a message column is mounted on the
 * page. The host pins the composer seat and sizes the view area from
 * `data-phase="active"` alone, so a phase mark landing on `hero` or `settling`
 * with the transcript already mounted drops both and leaves the composer
 * standing in the middle of the rows, which paint on below it. The stylesheet
 * keys the pin, the bar and the view area's contract on this mark as well
 * (packages/client/src/features/composer/inline.css).
 */
export const TRANSCRIPT_ATTR = 'data-dsh-claude-transcript'
/**
 * Present on every node the skin appends into one of the host's own slots: the
 * seat box and the context meter's ring stand in the model slot beside the
 * host's root, and the reader that names that root skips them by this mark
 * (packages/client/src/features/model/model-picker.ts).
 */
export const SLOT_NODE_ATTR = 'data-dsh-claude-slot-node'
/**
 * Present while a mobile remote plugin's portrait layer owns the page
 * (packages/contracts/src/dom.ts, MOBILE_PORTRAIT_SELECTOR). That layer floats the
 * composer's controls with transforms of its own, and the skin's placement of
 * the send and stop buttons stands aside from them under this mark
 * (packages/client/src/features/composer/inline.css).
 */
export const MOBILE_PORTRAIT_ATTR = 'data-dsh-claude-mobile-portrait'
/**
 * Present while the permission control is installed. The composer restyle
 * hides the host's access-mode button because this feature replaces it,
 * and that rule also requires this attribute: a permission control that is
 * switched off hands the button back while the rest of the composer
 * restyle keeps running.
 */
export const PERMISSIONS_ATTR = 'data-dsh-claude-permissions'
/**
 * Present while the context statistics are installed
 * (packages/client/src/features/context-stats/context-stats.ts). The host's two stat
 * dialogs are hidden only under it: their numbers are read into the
 * context popover instead, and switched off the feature hands them back.
 */
export const SESSION_STATS_ATTR = 'data-dsh-claude-session-stats'
/**
 * Stamped on the host's own account menu card while it is open (Desktop).
 * That card is the host's shared Menu portal and its class names
 * are hashed, so packages/client/src/features/account/surface.ts stamps this attribute and
 * features/account/account-footer.css repaints the card, its rows and its
 * separators with the skin's popover language.
 */
export const ACCOUNT_MENU_ATTR = 'data-dsh-claude-account-menu'
/**
 * Set on <body> from the moment the account row is hovered or pressed until
 * its menu closes. The card's own marker needs the menu's rows to identify
 * the card, so it lands two or three frames after the host has already
 * painted the card; an entry animation keyed on it therefore replayed from
 * transparent over a card that was already visible. This one is in place
 * before the host mounts the card, so the animation runs from its first
 * frame.
 */
export const ACCOUNT_ARMED_ATTR = 'data-dsh-claude-account-armed'
/**
 * Stamped on the host's account card by packages/client/src/features/account/surface.ts once
 * the card carries the skin's rows and the host has finished placing it.
 *
 * The host mounts the card with its own rows and places it from that
 * geometry; the skin's container lands a frame later and the card grows, and
 * the host re-places it a frame after that. Revealing on the mount frame
 * fades the card in at a height and a place it is about to leave — it appears
 * low and jumps up mid-fade — so features/account/account-footer.css holds it
 * inside the armed window until this marker lands, and the entry animation
 * hangs on this marker.
 */
export const ACCOUNT_READY_ATTR = 'data-dsh-claude-account-ready'
/**
 * Stamped on the host's shared menu card while it is the hero row's picker
 * (the workspace chip or the agent-preset seat opened it). The host portals
 * that card to <body> with no marker of its own, so the stylesheet cannot
 * tell it from the host's other menus; packages/client/src/features/hero-menu/hero-menu.ts stamps it
 * and features/hero-menu/hero-menu.css switches on this attribute.
 */
export const HERO_MENU_ATTR = 'data-dsh-claude-hero-menu'
/**
 * Stamped on the sidebar's More menu card while it is open. The card is the
 * host's shared Menu portal like the two above; features/sidebar-entries stamps
 * it from inside, since its own rows render in that card, and the card and its
 * rows take the account menu's look (shared/popover.css).
 */
export const MORE_MENU_ATTR = 'data-dsh-claude-more-menu'
/**
 * Present while the browser window does NOT hold focus.
 *
 * The window's focus state is the only thing that separates the two text
 * selection paints (gray on black unfocused, blue on white focused), and no
 * selector can read it — so packages/client/src/features/composer/selection-mirror.ts mirrors it onto the
 * document and the stylesheet switches on this attribute.
 */
export const WINDOW_BLUR_ATTR = 'data-dsh-window-blur'
/**
 * The handoff marker: stamped on `body` while this build is live AND able
 * to give the page back (D74). Its presence is a capability another
 * package can read without running anything: a skin that lists this theme
 * as one of its looks has to know the page can come back, and a build from
 * before D74 does not stamp it.
 */
export const HANDOFF_ATTR = 'data-dsh-claude-style-handoff'
/**
 * The document attribute the skin center stamps while a skin is painting
 * (D74). It is read at boot and watched afterwards: the value is the skin
 * id, and the presence means the page belongs to a skin.
 */
export const SKIN_STAMP_ATTR = 'data-dsh-skin'
/**
 * On the host's scroller around the settings page while the page is
 * mounted (packages/client/src/features/settings/settings.ts): the stylesheet keeps the
 * scrollbar's room there, so switching tabs never shifts the layout.
 */
export const SETTINGS_SCROLLER_ATTR = 'data-dsh-claude-settings-scroller'
/**
 * Which home layout is in force. The stylesheet branches on it, and the two
 * layouts differ only in arrangement — the hero's own markup is the host's
 * either way, so the switch is one attribute plus the panel registration.
 */
export const HOME_LAYOUT_ATTR = 'data-dsh-claude-home-layout'
/**
 * Present while the studio layout owns the page shown: the studio layout is
 * in force and the page is the new-conversation hero. Every studio rule keys
 * on it, so the host's hero-phase marker is read once per pass in JS rather
 * than repeated across the stylesheet.
 */
export const HOME_HERO_ATTR = 'data-dsh-claude-home-hero'
/**
 * The heat grid's ramp: how much of the heat ink each level paints, in
 * percent, faintest first. Its length is the number of levels a day's tokens
 * are bucketed into (features/home/data.ts); the build writes one rule per
 * level from it (scripts/feature-sheets.mjs). Not even steps: the low levels
 * stay apart from each other and from the empty cell.
 */
export const HOME_HEAT_RAMP = [20, 40, 65, 100] as const
/**
 * The host half's private routes, under this half's own names. The paths are
 * the shared contract (packages/contracts/src/routes.ts, D73), declared once
 * for both halves.
 */
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
  USAGE_PATH as USAGE_ROUTE,
  USERNAME_PATH as USERNAME_ROUTE,
  WEBFONTS_PATH as WEBFONTS_ROUTE,
} from '@dsh-claude-style/contracts/routes'

/** Placement state for the sidebar's native status cell; the host remains its state owner. */
export const SIDEBAR_STATUS_ATTR = 'data-dsh-claude-row-status'
export const SIDEBAR_RUNNING_TITLE_ATTR = 'data-dsh-claude-running-title'
