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

export const COMPOSER_HINT = 'How can I help you today?'

/**
 * Model picker copy.
 *
 * The copy itself is NOT here. It ships as `model-descriptions.json` beside
 * the bundle, and the browser half fetches it at runtime (the host half
 * serves it under MODEL_COPY_ROUTE), so the model table grows without a
 * rebuild and no copy enters the bundle. The language comes from the shell's
 * own `locale` service — one line per row, in the language the rest of the
 * UI is in — never two languages stacked.
 *
 * The constants below are the neutral fallbacks painted before that document
 * arrives, and kept if it never does. They are English because a failed
 * fetch has no locale to honour.
 */
export const MODEL_OFFICIAL_GROUP = 'deepseek-official'
export const MODEL_COPY_ROUTE = '/dsh-claude-style/model-descriptions.json'
export const MODEL_COPY_FALLBACK_LOCALE = 'en'
export const MODEL_FALLBACK_LABEL = 'Select model'
export const MODEL_LOADING_LABEL = 'Loading models…'
export const MODEL_EMPTY_LABEL = 'No models available.'
export const MODEL_EFFORT_LABEL = 'Reasoning effort'
export const MODEL_EFFORT_DEFAULT = 'Default'
/** The effort slider's two ends. Kept in English in every locale: they name
 *  the axis, not a level, and the level's own name rides beside the label. */
export const MODEL_EFFORT_FASTER = 'Faster'
export const MODEL_EFFORT_SMARTER = 'Smarter'
/** What the slider reads when the model offers no levels at all. */
export const MODEL_EFFORT_NONE = '—'
export const MODEL_MORE_LABEL = 'More models'
export const MODEL_TRIGGER_LABEL = 'Select model, currently {model}'

/** English weekday names, indexed by Date#getDay() (0 = Sunday). */
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * The classic hero's welcomes, à la Claude Code's rotating greetings. Each
 * time-of-day slot has its own pool — the night slot runs past midnight,
 * so its hours count on from 24 — and a few lines fit any hour. `{name}`
 * is the user's name, `{weekday}` today's.
 */
export const HERO_GREETING_SLOTS = [
  { from: 5, to: 12, lines: [
    'Good morning, {name}!',
    'Happy {weekday}, {name}.',
    'What are you working on?',
    'Morning, {name}. What’s first?',
    'Fresh start, {name}?',
  ] },
  { from: 12, to: 14, lines: [
    'What’s on the agenda today?',
    'Good afternoon, {name}.',
    'Midday check-in, {name}?',
  ] },
  { from: 14, to: 18, lines: [
    'Coffee and Claude time?',
    'Good afternoon, {name}.',
    'How’s the day going, {name}?',
    'Afternoon, {name}. What’s next?',
  ] },
  { from: 18, to: 22, lines: [
    'Evening, how are things?',
    'Good evening, {name}.',
    'How was your day, {name}?',
    'Winding down, or just getting started?',
  ] },
  { from: 22, to: 29, lines: [
    'You are here!',
    'Hello, night owl.',
    'Burning the midnight oil, {name}?',
    'Still up, {name}?',
  ] },
]
export const HERO_GREETING_ANYTIME = [
  'Back at it, {name}?',
  'Welcome back, {name}.',
  'Hey there, {name}.',
  'What shall we build?',
]

/**
 * One classic hero welcome: the current slot's pool and the any-hour lines,
 * picked by `draw` in [0, 1). The caller holds the draw, so the line stays
 * put between passes and changes only when the draw or the slot does.
 */
export function pickHeroGreeting(username: string, draw: number) {
  const now = new Date()
  const hour = now.getHours()
  const clock = hour < 5 ? hour + 24 : hour
  let lines = HERO_GREETING_ANYTIME
  for (let s = 0; s < HERO_GREETING_SLOTS.length; s++) {
    const slot = HERO_GREETING_SLOTS[s]
    if (clock >= slot.from && clock < slot.to) lines = slot.lines.concat(HERO_GREETING_ANYTIME)
  }
  const line = lines[Math.min(lines.length - 1, Math.floor(draw * lines.length))]
  return line.replace('{name}', username || 'User').replace('{weekday}', WEEKDAY_NAMES[now.getDay()])
}

/**
 * The studio dashboard's greeting, à la Claude Code's desktop home: one
 * fixed line naming the signed-in user, no clock. The classic hero keeps
 * the rotating welcomes.
 */
export function pickStudioGreeting(username: string) {
  return `What's up next, ${username || 'User'}?`
}

/**
 * Claude-flavored presentation of the permission presets, keyed by preset
 * id. The host's catalog decides WHICH presets a deployment offers — a
 * third-party plugin's ride in it, the auto mode plugin's `auto-mode` among
 * them — and this table decides how a known one reads. A preset the table
 * does not know falls back to the name the catalog carries, so nothing the
 * host offers is ever hidden and a machine id is never shown.
 */
export const PERMISSION_PRESETS: Record<string, { label: string, desc: string }> = {
  'read-only': { label: 'Read only', desc: '仅读取文件与分析，不修改代码' },
  'workspace-write': { label: 'Accept edits', desc: '允许编辑工作区文件' },
  'auto-mode': { label: 'Auto mode', desc: '规则放行常规操作，其余由分类器裁决' },
  'auto': { label: 'Auto review', desc: '无沙箱运行，调用前由模型审查' },
  'danger-full-access': { label: 'Full access', desc: '自动执行，无需反复确认' }
}

/**
 * The control's segments, in slot order. Each slot lists the presets it may
 * bind to, best first: the deployment's own auto tier wins the slot over the
 * host's built-in Auto review, and a slot none of whose presets the host
 * offers is not drawn at all.
 */
export const PERMISSION_SEGMENTS = [
  { label: 'Read', presets: ['read-only'] },
  { label: 'Edit', presets: ['workspace-write'] },
  { label: 'Auto', presets: ['auto-mode', 'auto'] },
  { label: 'Yolo', presets: ['danger-full-access'] }
]

/** Popover row order; a preset the host offers but this list does not know follows in catalog order. */
export const PERMISSION_ORDER = ['read-only', 'workspace-write', 'auto-mode', 'auto', 'danger-full-access']

/**
 * What the control draws before the host's first catalog read settles: the
 * shipped built-ins, with the auto slot left out the way the shipped picker
 * renders nothing until its own catalog arrives.
 */
export const PERMISSION_SHIPPED_PRESETS = ['read-only', 'workspace-write', 'danger-full-access']

/**
 * Names for host values that are never switch targets. `custom` is the
 * host's own word for knob settings that match no preset, so the trigger
 * reads that rather than the machine value.
 */
export const PERMISSION_CURRENT_LABELS: Record<string, string> = { custom: 'Custom' }

/** Skin-owned class names, so nothing couples to hashed CSS-module classes. */
export const SEGMENTS_CLASS = 'dsh-claude-segments'
export const SEGMENT_CLASS = 'dsh-claude-segment'

/**
 * Preferences, persisted in the profile entry's settings namespace (the
 * exported Config in host/settings.js declares the fields; src/core/prefs.ts
 * reads and writes them). Each value is mirrored onto the document as an
 * attribute so the stylesheet decides what a preference means, and the
 * defaults here are the shipped behaviour.
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
 * The composer caret's motion (src/features/caret/caret.ts): `typing`
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
 * Feature switches: one boolean preference per feature that replaces or
 * moves a host control, all on by default. Each feature's manifest names
 * its key (`pref`, D42), and switching one off runs that
 * feature's teardown, which hands its surface back to the host.
 *
 * `chatAnimations` is the one switch over the ported chat-area effects —
 * the follow, the automatic folding with its rolling door, the text fade,
 * the file change rows and the send flight. It belongs here rather than
 * among the live-read preferences because two of those five cannot be
 * stopped by reading a preference: the file change rows take the host's two
 * seat keys over (D32), and a seat registration only comes back when the
 * feature is torn down whole (`fileMutationRow` is the key this replaced).
 */
export const FEATURE_PREF_DEFAULTS = {
  permissionsControl: true,
  workspaceView: true,
  sidebarSearch: true,
  turnStatus: true,
  turnNav: true,
  viewTabs: true,
  chatAnimations: true,
}

/**
 * Deepy's animations (src/features/mascot/whale.ts), one sheet each under
 * src/assets/mascot/deepy/. The build copies the sheets to lib/deepy/ and
 * the host half serves them under DEEPY_ROUTE, so the browser loads a
 * sheet the first time its animation plays and never while another brand
 * is on.
 *
 * The whale is drawn on a 52×52 grid of logical pixels, five device pixels
 * to one in the sheets. A sheet holds its animation's frames eight to a
 * row, each cropped to `box` — `[x, y, width, height]` in logical pixels,
 * the smallest box that holds every frame — and every frame lasts
 * DEEPY_FRAME_MS. `still` is the frame shown for the animation when the
 * reader asks for reduced motion.
 */
export const DEEPY_ROUTE = '/dsh-claude-style/deepy/'
export const DEEPY_FRAME_MS = 50
/**
 * The transparent margin, in logical pixels, that every frame keeps on all
 * four sides when a sheet is rebuilt as a vector (whale-sheets.ts, D24).
 *
 * The sheets stack their frames edge to edge, and the browser draws the
 * rebuilt vector scaled down — from five pixels a logical pixel in the
 * sheet to two on the sprite. That downscale samples a little way past a
 * frame's edge, and the pixel it finds there is the bottom row of the
 * frame above: the soft tail of the whale's shadow. On the page it reads
 * as a one-device-pixel grey line across the top of the frame. A margin
 * wide enough for that reach leaves the sampling nothing but transparency,
 * and a whole logical pixel keeps every strip offset a whole CSS pixel.
 */
export const DEEPY_GUTTER = 1
export const DEEPY_SHEETS: Record<string, { frames: number, box: number[], still: number }> = {
  'idle': { frames: 48, box: [12, 26, 36, 24], still: 0 },
  'idle-look': { frames: 68, box: [11, 11, 37, 39], still: 0 },
  'idle-spout': { frames: 64, box: [8, 17, 39, 33], still: 0 },
  'thinking': { frames: 48, box: [0, 6, 47, 44], still: 20 },
  'typing': { frames: 48, box: [0, 17, 52, 33], still: 16 },
  'music': { frames: 32, box: [2, 10, 48, 40], still: 0 },
  'conducting': { frames: 48, box: [1, 0, 51, 50], still: 6 },
  'building': { frames: 48, box: [2, 0, 50, 50], still: 0 },
  'error': { frames: 48, box: [4, 17, 45, 33], still: 24 },
  'happy': { frames: 52, box: [0, 5, 52, 45], still: 44 },
  'notification': { frames: 32, box: [3, 7, 47, 43], still: 12 },
  'compacting': { frames: 56, box: [2, 14, 46, 36], still: 20 },
  'sleeping': { frames: 64, box: [2, 2, 44, 48], still: 10 },
  'waking': { frames: 30, box: [8, 4, 44, 46], still: 29 },
  'poke-left': { frames: 40, box: [1, 16, 50, 34], still: 0 },
  'poke-right': { frames: 40, box: [8, 16, 44, 34], still: 0 },
  'tickle': { frames: 48, box: [9, 17, 43, 33], still: 0 },
  'drag': { frames: 24, box: [10, 4, 41, 46], still: 0 },
}

/**
 * The composer crab's animations (src/features/mascot/crab.ts), drawn by
 * scripts/draw-crab.py into src/assets/mascot/crab/: one sheet in the crab's
 * colours and one ink mask per animation, inlined by the build as
 * CRAB_SHEET_URLS.
 *
 * The crab is drawn on a 52×36 grid of cells at 2px a cell, feet on the
 * bottom row, the right claw four cells in from the right edge. A sheet
 * holds its animation's frames eight to a row, each cropped to `box` —
 * `[x, y, width, height]` in cells — and every frame lasts CRAB_FRAME_MS,
 * the pace of Claude Code's own crab. `still` is the frame shown for the
 * animation when the reader asks for reduced motion. The keys are Deepy's,
 * so the two share one state machine; `idle-wave` and `idle-laptop` (Claude
 * Code's laptop routine, whole) are the crab's own idle extras.
 */
export const CRAB_FRAME_MS = 80
export const CRAB_SHEETS: Record<string, { frames: number, box: number[], still: number }> = {
  'idle': { frames: 24, box: [24, 20, 24, 16], still: 0 },
  'idle-look': { frames: 31, box: [24, 20, 24, 16], still: 0 },
  'idle-wave': { frames: 12, box: [24, 15, 24, 21], still: 0 },
  'idle-laptop': { frames: 43, box: [14, 13, 34, 23], still: 0 },
  'thinking': { frames: 32, box: [14, 4, 34, 32], still: 18 },
  'typing': { frames: 6, box: [15, 22, 28, 14], still: 0 },
  'music': { frames: 16, box: [22, 1, 30, 35], still: 0 },
  'conducting': { frames: 24, box: [24, 12, 27, 24], still: 0 },
  'building': { frames: 6, box: [15, 19, 28, 17], still: 0 },
  'error': { frames: 24, box: [23, 11, 26, 25], still: 4 },
  'happy': { frames: 32, box: [18, 6, 34, 30], still: 3 },
  'notification': { frames: 16, box: [24, 8, 24, 28], still: 0 },
  'compacting': { frames: 20, box: [21, 20, 30, 16], still: 3 },
  'sleeping': { frames: 32, box: [23, 3, 29, 33], still: 0 },
  'waking': { frames: 12, box: [24, 4, 24, 32], still: 11 },
  'poke-left': { frames: 10, box: [24, 20, 27, 16], still: 0 },
  'poke-right': { frames: 10, box: [21, 20, 27, 16], still: 0 },
  'tickle': { frames: 16, box: [23, 18, 26, 18], still: 0 },
  'drag': { frames: 8, box: [23, 12, 26, 22], still: 0 },
}

/**
 * Present while the ported chat-area follow is installed
 * (src/features/chat-follow/). One rule hangs off it: a capped process
 * group's body scrolls vertically alone, so the catch-up measures the same
 * distance the host's own smooth scroll does. Switched off, the chat area
 * is handed back untouched.
 */
export const CHAT_FOLLOW_ATTR = 'data-dsh-claude-chat-follow'
/**
 * On the host's own "back to the end" button while the stream glide
 * (src/features/chat-follow/chat-follow.ts) is following on the conversation
 * scroller: the glide holds the position off the end on purpose, which the
 * host reads as the reader having left, so it renders that button although
 * it is being followed. The stylesheet keeps it out of sight until the glide
 * lets go; the host's own state is not touched.
 */
export const STREAM_GLIDE_ATTR = 'data-dsh-claude-stream-glide'
/**
 * Present while the ported token reveal is installed
 * (src/features/chat-reveal/): its step rules (reveal-rules.css) hang off it,
 * and switching the feature off leaves the page with no trace of it.
 */
export const CHAT_REVEAL_ATTR = 'data-dsh-claude-chat-reveal'
/**
 * On the real message row while the send bubble's stand-in is flying
 * (src/features/chat-send/): the stylesheet hides that row, keeping its layout
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
 * On the element the fold glide is pressing right now (src/features/chat-fold/
 * fold-glide.ts): while it stands, the elements inside lay out at their
 * natural height instead of being squeezed by flex (fold-motion.css).
 */
export const CHAT_ROLLING_ATTR = 'data-dsh-claude-rolling'
/** On an editable surface once the caret motion has taken it over (src/features/caret/). */
export const CARET_ATTR = 'data-dsh-claude-caret'
/** The drawn caret itself. */
export const CARET_LAYER_ATTR = 'data-dsh-claude-caret-layer'
/** The drawn caret is visible right now. */
export const CARET_VISIBLE_ATTR = 'data-dsh-claude-caret-visible'
/** On a parent lent the positioning context the drawn caret is placed against. */
export const CARET_HOST_ATTR = 'data-dsh-claude-caret-host'
/**
 * Present while the ported automatic folding is installed
 * (src/features/chat-fold/): the stylesheet's live-detail rules hang off it,
 * and switching the feature off hands the chat area back whole.
 */
export const CHAT_FOLD_ATTR = 'data-dsh-claude-chat-fold'
/** Present while the skin takes over the sidebar footer (settings area + account row). */
export const FOOTER_ATTR = 'data-dsh-claude-footer-takeover'
/**
 * The language the account-hold easter egg (src/features/ban-screen/ban-screen.ts) is
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
 * drops the whole bottom area (src/features/composer/composer.ts).
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
 * (src/features/context-stats/context-stats.ts). The host's two stat
 * dialogs are hidden only under it: their numbers are read into the
 * context popover instead, and switched off the feature hands them back.
 */
export const SESSION_STATS_ATTR = 'data-dsh-claude-session-stats'
/**
 * Stamped on the host's own account menu card while it is open (Desktop
 * 0.1.7+). That card is the host's shared Menu portal and its class names
 * are hashed, so src/features/account/surface.ts stamps this attribute and
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
 * Stamped on the host's account card by src/features/account/surface.ts once
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
 * tell it from the host's other menus; src/features/hero-menu/hero-menu.ts stamps it
 * and features/hero-menu/hero-menu.css switches on this attribute.
 */
export const HERO_MENU_ATTR = 'data-dsh-claude-hero-menu'
/**
 * Present while the browser window does NOT hold focus.
 *
 * The window's focus state is the only thing that separates the two text
 * selection paints (gray on black unfocused, blue on white focused), and no
 * selector can read it — so src/features/selection/selection.ts mirrors it onto the
 * document and the stylesheet switches on this attribute.
 */
export const WINDOW_BLUR_ATTR = 'data-dsh-window-blur'
/**
 * On the host's scroller around the settings page while the page is
 * mounted (src/features/settings/settings.ts): the stylesheet keeps the
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
 * The host half's session-deletion route (host/routes.js, SESSION_DELETE_PATH).
 * The harness gives the browser half no deletion API of its own, so the
 * archived row's delete button posts the session id here and the host half
 * removes the stored session directory and the id's entry in the workspace
 * registry's archive set. Keep the path in step with the host half.
 */
export const SESSION_DELETE_ROUTE = '/dsh-claude-style/session-delete'
/**
 * The host half's cross-session usage roll-up (host/routes.js, USAGE_PATH).
 * The browser half cannot read the session logs or the cost-meter ledger, so
 * the day buckets behind the home dashboard's panel arrive from here.
 */
export const USAGE_ROUTE = '/dsh-claude-style/usage'
/**
 * The host half's message-content search (host/search.js, SESSION_SEARCH_PATH):
 * `?q=` answers the sessions whose messages hold the query; without `q` it
 * only brings its message cache up to date.
 */
export const SESSION_SEARCH_ROUTE = '/dsh-claude-style/session-search'
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
 * Every preference and its default: the shipped behaviour, and what holds
 * until the settings form answers. scripts/build.mjs holds this table to
 * host/settings.js's PREFS_DEFAULT, key for key and value for value. A
 * boolean preference is on unless stored as an explicit `false`.
 */
export interface Prefs {
  brand: string
  motion: string
  collapseFooter: boolean
  autoPopover: string
  composerScope: string
  modelPicker: boolean
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
  sidebarSearch: boolean
  turnStatus: boolean
  turnNav: boolean
  viewTabs: boolean
  chatAnimations: boolean
}

export const PREF_DEFAULTS: Prefs = {
  brand: BRAND_CLAUDE,
  motion: MOTION_SYSTEM,
  collapseFooter: true,
  autoPopover: AUTO_POPOVER_ALL,
  composerScope: COMPOSER_SCOPE_ALL,
  modelPicker: true,
  quickProviders: [],
  username: '',
  banLocale: BAN_LOCALE_EN,
  homeLayout: HOME_LAYOUT_STUDIO,
  palette: PALETTE_CLAUDE,
  typeface: TYPEFACE_CLAUDE,
  mascot: MASCOT_BRAND,
  mascotScope: MASCOT_SCOPE_ALL,
  caretMotion: CARET_MOTION_TYPING,
  ...FEATURE_PREF_DEFAULTS,
}

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
}
/** Route that resolves the name this instance runs as, once; never polled. */
export const USERNAME_ROUTE = '/dsh-claude-style/username'
/** Route that forwards the HDSL launcher's account contract; never polled. */
export const HDSL_ROUTE = '/dsh-claude-style/hdsl'
/**
 * The player's own avatar, forwarded by the host half; 404 falls back to the
 * mark. What the route serves is the launcher's normalized skin atlas, not a
 * finished avatar, so the account row crops the head out of it
 * (src/features/account/rows.ts).
 */
export const HDSL_SKIN_ROUTE = '/dsh-claude-style/hdsl-skin.png'
/** Longest accepted custom username; mirrored by host/settings.js. */
export const USERNAME_MAX = 64
/** Most quick-provider ids kept, and the longest id accepted; mirrored by host/settings.js. */
export const QUICK_PROVIDERS_MAX = 64
export const PROVIDER_ID_MAX = 128

/** Wordmark aspect ratio; scripts/build.mjs sizes the sidebar word height from it (geometry lives in src/assets/claude-word.svg). */
export const CLAUDE_WORD_ASPECT = 512.22 / 121.54

export const SANS = "'Anthropic Sans Web Text','Claude Style Inter','Noto Sans SC','Source Han Sans SC',-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Helvetica Neue',Helvetica,Arial,sans-serif"
export const SERIF = "'Anthropic Serif Web Text','Claude Style Noto Serif',Georgia,'Times New Roman','Noto Sans SC','Source Han Sans SC','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif"
/**
 * Conversation prose: Claude sets Latin text in the serif face and lets
 * Chinese fall through to a sans CJK — the serif Latin faces carry no CJK
 * glyphs, so the stack leads with serif and names the sans CJK families
 * after it. UI chrome keeps SANS; only markdown prose uses this.
 */
export const PROSE = "'Anthropic Serif Web Text','Claude Style Noto Serif',Georgia,'Times New Roman','Noto Sans SC','Source Han Sans SC','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif"
export const MONO = "'JetBrains Mono','Noto Sans SC','Source Han Sans SC','PingFang SC','Hiragino Sans GB','Microsoft YaHei',ui-monospace,'SF Mono','Fira Code',Consolas,'Liberation Mono',Menlo,Courier,monospace"
