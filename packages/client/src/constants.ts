/**
 * The constants the build reads out of the browser half: the gate attributes
 * scripts/css.mjs checks on the syntax tree, the values preferences hold with
 * the attribute names they resolve onto, and the preference defaults —
 * scripts/build.mjs evaluates this module and picks those names. The
 * stylesheets spell the attributes out; the build holds every one they read to
 * a name the browser half writes. The identity constants and the host half's
 * route re-exports live here too.
 */
import { PREFS_DEFAULT } from '@dsh-claude-style/contracts/prefs'

export const STYLE_ID = 'dsh-claude-style-style'

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
export const PACKAGE_NAME = 'dsh-claude-style'
/**
 * The skin stylesheet's own key in the client module system's bookkeeping:
 * the sheet is mounted tagged `data-plugin="<PACKAGE_NAME>"` and
 * `data-plugin-css="<STYLE_PLUGIN_CSS>"`, which is what keeps the host's
 * claim sweep and every sibling package's removal off it (D33).
 */
export const STYLE_PLUGIN_CSS = `${PACKAGE_NAME}/client.css`
/**
 * The tag this package gives a sibling's untagged stylesheet so the host's
 * claim sweep cannot attribute it to this package (D33). It carries a slash,
 * so it can never equal a package name — the id every removal step matches
 * on — and no package's reload takes the sheet away.
 */
export const FOREIGN_SHEET_TAG = `${PACKAGE_NAME}/foreign-sheet`
export const BUNDLE_CONFIG_SLOT = 'plugins.bundle.config'
export const SETTINGS_SECTION_SLOT = 'settings.section'

/**
 * Preferences, persisted in the profile entry's settings namespace (the
 * exported Config in packages/host/src/settings.ts declares the fields;
 * packages/client/src/core/prefs.ts reads and writes them). Each value is
 * mirrored onto the document as an attribute so the stylesheet decides what a
 * preference means, and the defaults are the shared contract
 * (packages/contracts/src/prefs.ts, D46).
 */

/** Brand marks selectable from the settings page. `claude` is the default. */
export const BRAND_CLAUDE = 'claude'
/**
 * The DeepSeek brand: the host's own brand area stays (no Claude variant
 * matches) and takes DeepSeek's brand blue, both palettes turn blue
 * (theme/tokens.css), the skin's Claude marks give way to DeepSeek's whale,
 * and Deepy the pixel whale takes the crab's place on the composer.
 */
export const BRAND_DEEPSEEK = 'deepseek'
/** What earlier builds stored for the DeepSeek choice, when it was labelled "Off". */
export const BRAND_DEEPSEEK_LEGACY = 'off'
/** The document attribute the stylesheet switches on. */
export const BRAND_ATTR = 'data-dsh-claude-brand'

/**
 * The animation choice, and the document attribute it resolves onto.
 *
 * Three values in the settings page, two on the document: `system` follows
 * the operating system's own reduced-motion setting, `reduced` holds every
 * animation still whatever the system says, and `full` always plays them.
 * The resolved answer rides <body> as MOTION_ATTR (`reduced` / `full`), so
 * the mascots and the stylesheets read one value instead of asking the
 * system separately — which is the only way "always play" can override it.
 */
export const MOTION_SYSTEM = 'system'
export const MOTION_REDUCED = 'reduced'
export const MOTION_FULL = 'full'
export const MOTION_MODES = [MOTION_SYSTEM, MOTION_REDUCED, MOTION_FULL]
export const MOTION_ATTR = 'data-dsh-claude-motion'

/**
 * The composer caret's motion (packages/client/src/features/caret/caret.ts): `typing`
 * transitions every move, `move` only explicit ones, `off` takes nothing
 * over at all and leaves the browser's own caret in place.
 */
export const CARET_MOTION_OFF = 'off'
export const CARET_MOTION_MOVE = 'move'
export const CARET_MOTION_TYPING = 'typing'
export const CARET_MOTIONS = [CARET_MOTION_OFF, CARET_MOTION_MOVE, CARET_MOTION_TYPING]

/**
 * Who paints the colours, and who sets the type. `claude` is the skin's own
 * palette (or typefaces); `host` leaves the host's colour (or font) tokens
 * to the host and to whatever other theme plugin writes them — a wallpaper
 * plugin's glass, say — and the skin's own surfaces read those tokens
 * through its private aliases. Each choice rides <body> as its attribute,
 * and the stylesheet gates every rule that writes the host's tokens on it.
 */
export const PALETTE_CLAUDE = 'claude'
export const PALETTE_HOST = 'host'
export const PALETTES = [PALETTE_CLAUDE, PALETTE_HOST]
export const PALETTE_ATTR = 'data-dsh-claude-palette'
export const TYPEFACE_CLAUDE = 'claude'
export const TYPEFACE_HOST = 'host'
export const TYPEFACES = [TYPEFACE_CLAUDE, TYPEFACE_HOST]
export const TYPEFACE_ATTR = 'data-dsh-claude-typeface'

/**
 * The mascot on the composer, chosen apart from the brand. `brand` follows
 * the brand (the crab under Claude, Deepy under DeepSeek); `crab` and
 * `deepy` pick one whatever the brand; `off` shows none. The resolved
 * mascot (`crab`, `deepy` or `off`) rides <body> as MASCOT_ATTR.
 *
 * MASCOT_SCOPES says where it stands: the home page alone, or the home page
 * and the conversation.
 */
export const MASCOT_BRAND = 'brand'
export const MASCOT_CRAB = 'crab'
export const MASCOT_DEEPY = 'deepy'
export const MASCOT_OFF = 'off'
export const MASCOTS = [MASCOT_BRAND, MASCOT_CRAB, MASCOT_DEEPY, MASCOT_OFF]
export const MASCOT_ATTR = 'data-dsh-claude-mascot'
export const MASCOT_SCOPE_HOME = 'home'
export const MASCOT_SCOPE_ALL = 'all'
export const MASCOT_SCOPES = [MASCOT_SCOPE_HOME, MASCOT_SCOPE_ALL]

/**
 * The chat area's animation choice: `off` leaves the area to the host,
 * `enhanced` plays the ported set (packages/client/src/features/chat-*), and
 * `redraw` hands the area to a second set, which the send flight is the only
 * member of so far. Each of the five features names the values it runs under
 * (`prefValues`, D42).
 */
export const CHAT_ANIMATIONS_OFF = 'off'
export const CHAT_ANIMATIONS_ENHANCED = 'enhanced'
export const CHAT_ANIMATIONS_REDRAW = 'redraw'
export const CHAT_ANIMATIONS_MODES = [CHAT_ANIMATIONS_OFF, CHAT_ANIMATIONS_ENHANCED, CHAT_ANIMATIONS_REDRAW]

/**
 * Feature switches: one preference per feature that replaces or moves a host
 * control, on by default. Each feature's manifest names its key (`pref`, D42)
 * and, for a choice preference, the values it runs under (`prefValues`); a
 * value outside that set runs the feature's teardown, which hands its surface
 * back to the host.
 *
 * `chatAnimations` is the one choice among them: it covers the five ported
 * chat-area effects — the follow, the automatic folding with its rolling
 * door, the text fade, the file change rows and the send flight. It belongs
 * here rather than among the live-read preferences because two of those five
 * cannot be stopped by reading a preference: the file change rows take the
 * host's two seat keys over (D32), and a seat registration only comes back
 * when the feature is torn down whole.
 */
export const FEATURE_PREF_DEFAULTS = {
  permissionsControl: true,
  workspaceView: true,
  sidebarSearch: true,
  turnStatus: true,
  turnNav: true,
  viewTabs: true,
  headerBand: true,
  chatAnimations: CHAT_ANIMATIONS_ENHANCED,
  peakrate: true,
}


/**
 * Present while the ported chat-area follow is installed
 * (packages/client/src/features/chat-follow/). One rule hangs off it: a capped process
 * group's body scrolls vertically alone, so the catch-up measures the same
 * distance the host's own smooth scroll does. Switched off, the chat area
 * is handed back untouched.
 */
export const CHAT_FOLLOW_ATTR = 'data-dsh-claude-chat-follow'
/**
 * On the host's own "back to the end" button while the stream glide
 * (packages/client/src/features/chat-follow/chat-follow.ts) is following on the conversation
 * scroller: the glide holds the position off the end on purpose, which the
 * host reads as the reader having left, so it renders that button although
 * it is being followed. The stylesheet keeps it out of sight until the glide
 * lets go; the host's own state is not touched.
 */
export const STREAM_GLIDE_ATTR = 'data-dsh-claude-stream-glide'
/**
 * On the flow column while the stream glide
 * (packages/client/src/features/chat-follow/chat-follow.ts) holds the position
 * for the reader. A position held short of the end reads to the host as a
 * reader who left the tail, and it takes its own data-chat-following-tail away
 * (D44) — the gate the live status line's pin waits for
 * (packages/client/src/features/turn-status/turn-status.css). This mark stands
 * for that gate while the glide is the one moving the position.
 */
export const FOLLOW_HOLD_ATTR = 'data-dsh-claude-follow-hold'
/**
 * Present while the ported token reveal is installed
 * (packages/client/src/features/chat-reveal/): its step rules (reveal-rules.css) hang off it,
 * and switching the feature off leaves the page with no trace of it.
 */
export const CHAT_REVEAL_ATTR = 'data-dsh-claude-chat-reveal'
/**
 * On the real message row while the send bubble's stand-in is flying
 * (packages/client/src/features/chat-send/): the stylesheet hides that row, keeping its layout
 * box so the stand-in can measure the destination from it every frame.
 */
export const CHAT_FLYING_ATTR = 'data-dsh-claude-send-flight'
/**
 * On a node the skin owns purely for its own bookkeeping — the caret
 * motion's probe container and the caret it draws. The shared scheduler
 * ignores mutations against such a node (D40), so measuring or redrawing
 * never wakes a pass that no feature needs.
 */
export const QUIET_ATTR = 'data-dsh-claude-quiet'
/**
 * On the element the fold glide is pressing right now (packages/client/src/features/chat-fold/
 * fold-glide.ts): while it stands, the elements inside lay out at their
 * natural height instead of being squeezed by flex (fold-motion.css).
 */
export const CHAT_ROLLING_ATTR = 'data-dsh-claude-rolling'
/** On an editable surface once the caret motion has taken it over (packages/client/src/features/caret/). */
export const CARET_ATTR = 'data-dsh-claude-caret'
/** The drawn caret itself. */
export const CARET_LAYER_ATTR = 'data-dsh-claude-caret-layer'
/** The drawn caret is visible right now. */
export const CARET_VISIBLE_ATTR = 'data-dsh-claude-caret-visible'
/** On a parent lent the positioning context the drawn caret is placed against. */
export const CARET_HOST_ATTR = 'data-dsh-claude-caret-host'
/**
 * Present while the ported automatic folding is installed
 * (packages/client/src/features/chat-fold/): the stylesheet's live-detail rules hang off it,
 * and switching the feature off hands the chat area back whole.
 */
export const CHAT_FOLD_ATTR = 'data-dsh-claude-chat-fold'
/** Present while the skin takes over the sidebar footer (settings area + account row). */
export const FOOTER_ATTR = 'data-dsh-claude-footer-takeover'
/**
 * The language the account-hold easter egg (packages/client/src/features/ban-screen/ban-screen.ts) is
 * written in. It is its own preference rather than "follow the shell",
 * because the page reproduces a real Claude screen: the point is to read it
 * in the language Claude actually used, whatever the shell is set to. The
 * default is English for that reason.
 */
export const BAN_LOCALE_EN = 'en'
export const BAN_LOCALE_ZH = 'zh'
export const BAN_LOCALES = [BAN_LOCALE_EN, BAN_LOCALE_ZH]
/** Present while the composer restyle applies to the page currently shown. */
export const COMPOSER_ATTR = 'data-dsh-claude-composer-active'
/**
 * Present while the composer restyle applies and a conversation tab other
 * than the chat is up: the composer is chat-view-only, so the stylesheet
 * drops the whole bottom area (packages/client/src/features/composer/composer.ts).
 */
export const COMPOSER_HIDDEN_ATTR = 'data-dsh-claude-composer-hidden'
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
 * Stamped on the host's own account menu card while it is open (Desktop
 * 0.1.7+). That card is the host's shared Menu portal and its class names
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
 * Present while the browser window does NOT hold focus.
 *
 * The window's focus state is the only thing that separates the two text
 * selection paints (gray on black unfocused, blue on white focused), and no
 * selector can read it — so packages/client/src/features/selection/selection.ts mirrors it onto the
 * document and the stylesheet switches on this attribute.
 */
export const WINDOW_BLUR_ATTR = 'data-dsh-window-blur'
/**
 * The handoff marker: stamped on `body` while this build is live AND able
 * to give the page back (D49). Its presence is a capability another
 * package can read without running anything: a skin that lists this theme
 * as one of its looks has to know the page can come back, and a build from
 * before D49 does not stamp it.
 */
export const HANDOFF_ATTR = 'data-dsh-claude-style-handoff'
/**
 * The document attribute the skin center stamps while a skin is painting
 * (D49). It is read at boot and watched afterwards: the value is the skin
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
 * How the right sidebar's docked panels are drawn: `card` floats each one 8px
 * inside the column with a hairline, a 16px radius and the host's elevation
 * (packages/client/src/theme/chrome.css), while `flush` fills the column and
 * hugs its edges. The choice rides <body> as DOCK_LOOK_ATTR, and every rule
 * that draws a card is gated on the `card` value, so the flush state is the
 * host's own panel look.
 */
export const DOCK_LOOK_CARD = 'card'
export const DOCK_LOOK_FLUSH = 'flush'
export const DOCK_LOOK_ATTR = 'data-dsh-claude-dock-look'

/**
 * The host half's private routes, under this half's own names. The paths are
 * the shared contract (packages/contracts/src/routes.ts, D46), declared once
 * for both halves.
 */
export {
  HDSL_PATH as HDSL_ROUTE,
  HDSL_SKIN_PATH as HDSL_SKIN_ROUTE,
  PEAKRATE_PATH as PEAKRATE_ROUTE,
  SESSION_DELETE_PATH as SESSION_DELETE_ROUTE,
  SESSION_SEARCH_PATH as SESSION_SEARCH_ROUTE,
  USAGE_PATH as USAGE_ROUTE,
  USERNAME_PATH as USERNAME_ROUTE,
} from '@dsh-claude-style/contracts/routes'
/**
 * Home-page layouts. `classic` is the centered hero the skin has always
 * drawn; `studio` is the dashboard form: the greeting sits at the top left,
 * the composer hugs the window's bottom edge, and the usage panel fills the
 * space between them. Studio is the default: it is Claude Code's own home.
 */
export const HOME_LAYOUT_CLASSIC = 'classic'
export const HOME_LAYOUT_STUDIO = 'studio'
export const HOME_LAYOUTS = [HOME_LAYOUT_CLASSIC, HOME_LAYOUT_STUDIO]
/** Composer surfaces the restyle may cover, in settings order. */
export const COMPOSER_SCOPE_ALL = 'all'
export const COMPOSER_SCOPES = ['off', 'hero', 'conversation', COMPOSER_SCOPE_ALL]
/**
 * How eagerly the skin's popovers open on hover: `off` is click-only,
 * `account` auto-opens the sidebar account popover alone, and `all` adds the
 * permission, model, session-stats and the host's two hero-row pickers.
 */
export const AUTO_POPOVER_OFF = 'off'
export const AUTO_POPOVER_ACCOUNT = 'account'
export const AUTO_POPOVER_ALL = 'all'
export const AUTO_POPOVER_SCOPES = [AUTO_POPOVER_OFF, AUTO_POPOVER_ACCOUNT, AUTO_POPOVER_ALL]

/**
 * The preference shape the browser half reads: one field per key of the shared
 * defaults table, whose values hold until the settings form answers. A boolean
 * preference is on unless stored as an explicit `false`.
 */
export interface Prefs {
  brand: string
  motion: string
  collapseFooter: boolean
  autoPopover: string
  composerScope: string
  modelPicker: boolean
  peakrate: boolean
  quickProviders: string[]
  username: string
  banLocale: string
  homeLayout: string
  palette: string
  typeface: string
  mascot: string
  mascotScope: string
  caretMotion: string
  permissionsControl: boolean
  workspaceView: boolean
  dockCards: boolean
  sidebarSearch: boolean
  turnStatus: boolean
  turnNav: boolean
  viewTabs: boolean
  headerBand: boolean
  chatAnimations: string
}

/** Every preference's shipped default, from the table both halves share (packages/contracts/src/prefs.ts, D46). */
export const PREF_DEFAULTS: Prefs = PREFS_DEFAULT

/** The preferences whose value is one of a fixed set; any other stored value reads as the default. */
export const PREF_CHOICES: Partial<Record<keyof Prefs, string[]>> = {
  motion: MOTION_MODES,
  composerScope: COMPOSER_SCOPES,
  banLocale: BAN_LOCALES,
  homeLayout: HOME_LAYOUTS,
  palette: PALETTES,
  typeface: TYPEFACES,
  mascot: MASCOTS,
  mascotScope: MASCOT_SCOPES,
  caretMotion: CARET_MOTIONS,
  chatAnimations: CHAT_ANIMATIONS_MODES,
}
/** Longest accepted custom username; core/prefs.ts trims the stored value to it. */
export const USERNAME_MAX = 64
/** Most quick-provider ids kept, and the longest id accepted; core/prefs.ts clamps to both. */
export const QUICK_PROVIDERS_MAX = 64
export const PROVIDER_ID_MAX = 128
