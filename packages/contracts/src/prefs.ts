/**
 * Shared preference declarations (D73): values, defaults, limits and legacy shapes.
 * Browser types and host Config derive from this table; settings rows follow it too (D72).
 */
import { OFFICIAL_MODEL_GROUP } from './services'
import { PALETTE_SCHEME_CUSTOM, PALETTE_SCHEME_ENTRY_MAX, PALETTE_SCHEME_FOLLOW, PALETTE_SCHEME_ID_MAX, PALETTE_SCHEME_LIMIT, carryClassicInlineCode, carryCustomPalette, findPaletteScheme, normalizePaletteSchemes } from './palette-schemes'
import { CURRENCIES, CURRENCY_CNY } from './prices'
import { SOUND_LEVELS, SOUND_LEVEL_OFF } from './sound'

/* ---------- the value vocabulary ---------- */

/** The billing choice's off value: no figure is drawn and no settlement is priced. */
export const BILLING_OFF = 'off'
/** The billing choices, in the settings' order: the two official tables, or no billing at all. */
export const BILLING_CHOICES = [BILLING_OFF, ...CURRENCIES] as const

/** Brand marks selectable from the settings page. `claude` is the default. */
export const BRAND_CLAUDE = 'claude'
/** DeepSeek branding keeps the host brand area and selects the DeepSeek palette and mascot. */
export const BRAND_DEEPSEEK = 'deepseek'
/** The stored `off` value that maps to the DeepSeek brand. */
export const BRAND_DEEPSEEK_LEGACY = 'off'
export const BRANDS = [BRAND_CLAUDE, BRAND_DEEPSEEK] as const

/**
 * The built-in colour presets (D96), one id per colour card in
 * packages/client/src/theme/tokens.json; the build fails when the two disagree.
 */
export const PALETTE_PRESETS = ['claude', 'deepseek', 'parchment', 'forest', 'dusk', 'rose'] as const
export type PalettePreset = typeof PALETTE_PRESETS[number]
/** The preset each brand paints while the selection follows the brand. */
export const BRAND_DEFAULT_PRESETS = { [BRAND_CLAUDE]: 'claude', [BRAND_DEEPSEEK]: 'deepseek' } as const satisfies Record<typeof BRANDS[number], PalettePreset>

/**
 * The selected colour scheme (D96): `brand` follows the selected brand's default
 * scheme and stays independent of its artwork; any other value is a preset's id
 * or the id of one of the reader's schemes.
 */
export const PALETTE_COLORING_BRAND = PALETTE_SCHEME_FOLLOW
/** The id the earlier single custom card carries over under. */
export const PALETTE_COLORING_CUSTOM = PALETTE_SCHEME_CUSTOM

/** The earlier inline-code choice: `classic` is read once into the Claude preset's code colour (palette-schemes.ts) and then left at `palette`. */
export const INLINE_CODE_COLOR_PALETTE = 'palette'
export const INLINE_CODE_COLOR_CLASSIC = 'classic'
export const INLINE_CODE_COLORS = [INLINE_CODE_COLOR_PALETTE, INLINE_CODE_COLOR_CLASSIC] as const

/** How the brand art is painted: in its own colours, in the accent, or as a shape in the text colour. */
export const BRAND_INK_ORIGINAL = 'original'
export const BRAND_INK_ACCENT = 'accent'
export const BRAND_INK_TEXT = 'text'
export const BRAND_INKS = [BRAND_INK_ORIGINAL, BRAND_INK_ACCENT, BRAND_INK_TEXT] as const
/** Longest accepted brand name. */
export const BRAND_NAME_MAX = 40

/** `system`, `reduced` or `full`; the resolved body attribute is shared by scripts and stylesheets. */
export const MOTION_SYSTEM = 'system'
export const MOTION_REDUCED = 'reduced'
export const MOTION_FULL = 'full'
export const MOTION_MODES = [MOTION_SYSTEM, MOTION_REDUCED, MOTION_FULL] as const

/** Waiting-line treatment: host-like highlight sweep or gradient colour wash. */
export const STATUS_MOTION_SWEEP = 'sweep'
export const STATUS_MOTION_WASH = 'wash'
export const STATUS_MOTIONS = [STATUS_MOTION_SWEEP, STATUS_MOTION_WASH] as const

/** The composer caret's motion: `typing` takes the caret over and transitions every move, `off` leaves the browser's own. */
export const CARET_MOTION_OFF = 'off'
export const CARET_MOTION_TYPING = 'typing'
export const CARET_MOTIONS = [CARET_MOTION_TYPING, CARET_MOTION_OFF] as const

/** Whether the characters arriving in a streaming answer fade in. */
export const CHAT_REVEAL_OFF = 'off'
export const CHAT_REVEAL_ON = 'on'
export const CHAT_REVEAL_MODES = [CHAT_REVEAL_ON, CHAT_REVEAL_OFF] as const

/** How live reasoning reaches the reader: as it arrives, or through the two-line stepping window. */
export const REASONING_DISPLAY_CONTINUOUS = 'continuous'
export const REASONING_DISPLAY_STEPPED = 'stepped'
export const REASONING_DISPLAYS = [REASONING_DISPLAY_CONTINUOUS, REASONING_DISPLAY_STEPPED] as const

/** How a message the reader sends arrives: a stand-in flying up from the composer, or the row growing in place. */
export const MESSAGE_ENTER_FLIGHT = 'flight'
export const MESSAGE_ENTER_GROW = 'grow'
export const MESSAGE_ENTER_MODES = [MESSAGE_ENTER_FLIGHT, MESSAGE_ENTER_GROW] as const

/** How an open process group lays out its rows: the host's own list, or one bordered card of single-line rows. */
export const PROCESS_ROWS_FLAT = 'flat'
export const PROCESS_ROWS_COLUMN = 'column'
export const PROCESS_ROWS_LAYOUTS = [PROCESS_ROWS_FLAT, PROCESS_ROWS_COLUMN] as const

/** Who paints the colours: the skin's own palette, or the host's colour tokens left to the host and other theme plugins. */
export const PALETTE_CLAUDE = 'claude'
export const PALETTE_HOST = 'host'
export const PALETTES = [PALETTE_CLAUDE, PALETTE_HOST] as const
/** Who sets the type: the skin's Claude faces, one system sans stack, or the host's own tokens. */
export const TYPEFACE_CLAUDE = 'claude'
export const TYPEFACE_SYSTEM = 'system'
export const TYPEFACE_HOST = 'host'
export const TYPEFACES = [TYPEFACE_CLAUDE, TYPEFACE_SYSTEM, TYPEFACE_HOST] as const

/** The mascot on the composer, chosen apart from the brand: follow the brand, pick one of the three, or show none. */
export const MASCOT_BRAND = 'brand'
export const MASCOT_CRAB = 'crab'
export const MASCOT_DEEPY = 'deepy'
export const MASCOT_WHALEGIRL = 'whalegirl'
export const MASCOT_OFF = 'off'
export const MASCOTS = [MASCOT_BRAND, MASCOT_CRAB, MASCOT_DEEPY, MASCOT_WHALEGIRL, MASCOT_OFF] as const
/** Where the mascot stands: the home page alone, or the home page and the conversation. */
export const MASCOT_SCOPE_HOME = 'home'
export const MASCOT_SCOPE_ALL = 'all'
export const MASCOT_SCOPES = [MASCOT_SCOPE_HOME, MASCOT_SCOPE_ALL] as const

/** Whether the skin draws its own sidebar search button or leaves the host's own button in place. */
export const SEARCH_STYLE_ICON = 'icon'
export const SEARCH_STYLE_STANDALONE = 'standalone'
export const SEARCH_STYLES = [SEARCH_STYLE_ICON, SEARCH_STYLE_STANDALONE] as const

/** How much air the sidebar keeps around its own rows. */
export const SIDEBAR_LAYOUT_RELAXED = 'relaxed'
export const SIDEBAR_LAYOUT_COMPACT = 'compact'
export const SIDEBAR_LAYOUTS = [SIDEBAR_LAYOUT_RELAXED, SIDEBAR_LAYOUT_COMPACT] as const

/** Independent running styles: breathing marker, turning ring, or title shimmer. */
export const ONGOING_INDICATOR_BREATHE = 'breathe'
export const ONGOING_INDICATOR_RING = 'ring'
export const ONGOING_INDICATOR_SHIMMER = 'shimmer'
export const ONGOING_INDICATORS = [ONGOING_INDICATOR_BREATHE, ONGOING_INDICATOR_RING, ONGOING_INDICATOR_SHIMMER] as const

/** Leading uses the host slot shared with third-party marks; trailing uses the skin status column. */
export const ONGOING_SIDE_LEFT = 'left'
export const ONGOING_SIDE_RIGHT = 'right'
export const ONGOING_SIDES = [ONGOING_SIDE_LEFT, ONGOING_SIDE_RIGHT] as const

/** The chat area's animation switch: on plays the ported set (features/chat-*), off leaves the area to the host. */
export const CHAT_ANIMATIONS_OFF = 'off'

/**
 * Where the session's numbers show: in the context popover the meter opens, on a
 * line of their own under the input card, or in the compact footer. The rail
 * position is the line of their own handed to the conversation's details rail:
 * the line stands wherever the rail does not, and the rail carries the numbers
 * while it does (D94).
 */
export const STATS_POSITION_INLINE = 'inline'
export const STATS_POSITION_CONTEXT = 'context'
export const STATS_POSITION_FOOTER = 'footer'
export const STATS_POSITION_RAIL = 'rail'
export const STATS_POSITIONS = [STATS_POSITION_INLINE, STATS_POSITION_CONTEXT, STATS_POSITION_FOOTER, STATS_POSITION_RAIL] as const
export const STATS_FOOTER_ALIGNS = ['left', 'center', 'right'] as const

/** Context meter face: pie, continuous-band ring or three-band ring. */
export const CONTEXT_DISPLAY_PIE = 'pie'
export const CONTEXT_DISPLAY_RING_RAMP = 'ring-ramp'
export const CONTEXT_DISPLAY_RING_BAND = 'ring-band'
export const CONTEXT_DISPLAYS = [CONTEXT_DISPLAY_PIE, CONTEXT_DISPLAY_RING_RAMP, CONTEXT_DISPLAY_RING_BAND] as const

/** How wide the conversation column draws, as a factor of the width the host gives it. */
export const CONVERSATION_WIDTH_FULL = '1'
export const CONVERSATION_WIDTH_THREE_QUARTERS = '0.75'
export const CONVERSATION_WIDTH_HALF = '0.5'
export const CONVERSATION_WIDTHS = [CONVERSATION_WIDTH_FULL, CONVERSATION_WIDTH_THREE_QUARTERS, CONVERSATION_WIDTH_HALF] as const

/** The room under the conversation's composer: the host's own, or one of the skin's two. */
export const COMPOSER_GAP_COMPACT = 'compact'
export const COMPOSER_GAP_THEME = 'theme'
export const COMPOSER_GAP_ROOMY = 'roomy'
export const COMPOSER_GAPS = [COMPOSER_GAP_COMPACT, COMPOSER_GAP_THEME, COMPOSER_GAP_ROOMY] as const

/** Account-hold screen language; independent of shell locale to reproduce Claude's original screen. */
export const BAN_LOCALE_EN = 'en'
export const BAN_LOCALE_ZH = 'zh'
export const BAN_LOCALE_OFF = 'off'
export const BAN_LOCALES = [BAN_LOCALE_EN, BAN_LOCALE_ZH, BAN_LOCALE_OFF] as const

/** `off` keeps the host home; `classic` is a centered hero and `studio` a dashboard. */
export const HOME_LAYOUT_OFF = 'off'
export const HOME_LAYOUT_CLASSIC = 'classic'
export const HOME_LAYOUT_STUDIO = 'studio'
export const HOME_LAYOUTS = [HOME_LAYOUT_OFF, HOME_LAYOUT_CLASSIC, HOME_LAYOUT_STUDIO] as const

/** Which sessions the studio dashboard aggregates: live main logs, one Workspace, or the whole record. */
export const HOME_SESSION_SCOPE_ACTIVE = 'active'
export const HOME_SESSION_SCOPE_WORKSPACE = 'workspace'
export const HOME_SESSION_SCOPE_ALL = 'all'
export const HOME_SESSION_SCOPES = [HOME_SESSION_SCOPE_ACTIVE, HOME_SESSION_SCOPE_WORKSPACE, HOME_SESSION_SCOPE_ALL] as const
export type HomeSessionScope = typeof HOME_SESSION_SCOPES[number]

/** Composer surfaces the restyle may cover, in settings order. */
export const COMPOSER_SCOPE_OFF = 'off'
export const COMPOSER_SCOPE_HERO = 'hero'
export const COMPOSER_SCOPE_CONVERSATION = 'conversation'
export const COMPOSER_SCOPE_ALL = 'all'
export const COMPOSER_SCOPES = [COMPOSER_SCOPE_OFF, COMPOSER_SCOPE_HERO, COMPOSER_SCOPE_CONVERSATION, COMPOSER_SCOPE_ALL] as const

/** How eagerly the skin's popovers open on hover: click only, the account popover alone, or every popover the skin owns. */
export const AUTO_POPOVER_OFF = 'off'
export const AUTO_POPOVER_ACCOUNT = 'account'
export const AUTO_POPOVER_ALL = 'all'
export const AUTO_POPOVER_SCOPES = [AUTO_POPOVER_OFF, AUTO_POPOVER_ACCOUNT, AUTO_POPOVER_ALL] as const

/** Page zoom percentage; empty follows the system, and values outside the declared bounds clamp to an endpoint. */
export const PAGE_ZOOM_SYSTEM = ''
export const PAGE_ZOOM_DEFAULT = '100'
export const PAGE_ZOOM_MIN = 60
export const PAGE_ZOOM_MAX = 200

/** Ordinary interface text as a percentage of its own size, independent of page zoom. */
export const INTERFACE_FONT_SIZE_DEFAULT = '100'
export const INTERFACE_FONT_SIZE_MIN = 80
export const INTERFACE_FONT_SIZE_MAX = 160

/** Background fill opacity as a percentage; 100 keeps the existing canvas opaque. */
export const BACKGROUND_OPACITY_DEFAULT = '100'
export const BACKGROUND_OPACITY_MIN = 0
export const BACKGROUND_OPACITY_MAX = 100

/** Sodium starts `undecided` and appears off; only the reader or first matching probe decides it (D78). */
export const SODIUM_ON = 'on'
export const SODIUM_OFF = 'off'
export const SODIUM_UNDECIDED = 'undecided'
export const SODIUM_MODES = [SODIUM_UNDECIDED, SODIUM_ON, SODIUM_OFF] as const

/** Longest accepted custom username. */
export const USERNAME_MAX = 64
/** Most quick-provider ids kept, and the longest id accepted. */
export const QUICK_PROVIDERS_MAX = 64
export const PROVIDER_ID_MAX = 128
/** Hidden-panel limits; Plugins is host-pinned and must never be stored as hidden. */
export const SIDEBAR_HIDDEN_MAX = 32
export const PANEL_ID_MAX = 128
export const PLUGINS_PANEL_ID = 'plugins'
/** Bounds for profile-persisted manual reminders; session ids remain opaque. */
export const MANUAL_UNREAD_LIMIT = 2048
export const MANUAL_UNREAD_ID_LIMIT = 1024
/** Custom-price storage limits; decimal text avoids losing entered digits to floats. */
export const PRICE_ROWS_MAX = 32
export const PRICE_ROW_MODEL_MAX = 96
export const PRICE_ROW_RATE_MAX = 16

/* ---------- the table ---------- */

interface PrefSpecBase {
  /** Legacy stored values mapped to current meanings; unknown values fall back to the default. */
  readonly legacy?: Readonly<Record<string, unknown>>
}

interface BooleanSpec extends PrefSpecBase { readonly type: 'boolean', readonly default: boolean }
interface ChoiceSpec extends PrefSpecBase { readonly type: 'choice', readonly values: readonly string[], readonly default: string }
interface TextSpec extends PrefSpecBase { readonly type: 'text', readonly default: string, readonly max: number }
interface ColorSpec extends PrefSpecBase { readonly type: 'color', readonly default: string }
interface ListSpec extends PrefSpecBase { readonly type: 'list', readonly default: readonly string[], readonly max: number, readonly entryMax: number, readonly drop: readonly string[] }

/** One preference's declaration: its type, its default, and what its type adds to that. */
export type PrefSpec = BooleanSpec | ChoiceSpec | TextSpec | ColorSpec | ListSpec

/**
 * Preference declarations (D73). The host form stays permissive about stored shapes;
 * clamping here keeps legacy or invalid values from preventing startup.
 */
export const PREFS = {
  brand: { type: 'choice', values: BRANDS, default: BRAND_CLAUDE, legacy: { [BRAND_DEEPSEEK_LEGACY]: BRAND_DEEPSEEK } },
  brandName: { type: 'text', default: '', max: BRAND_NAME_MAX },
  brandInk: { type: 'choice', values: BRAND_INKS, default: BRAND_INK_ORIGINAL },
  /** Whether the sidebar draws its brand area; off collapses that area and leaves the sidebar toggle in place. */
  sidebarBrand: { type: 'boolean', default: true },
  brandAccent: { type: 'color', default: '' },
  /** The selected scheme's id, or `brand` to follow the theme style; an id no scheme carries reads as `brand`. */
  paletteColors: { type: 'text', default: PALETTE_COLORING_BRAND, max: PALETTE_SCHEME_ID_MAX },
  /** The schemes' records (palette-schemes.ts): the reader's own and the presets' overrides. */
  paletteSchemes: { type: 'list', default: [], max: PALETTE_SCHEME_LIMIT, entryMax: PALETTE_SCHEME_ENTRY_MAX, drop: [] },
  /** The earlier single custom card's four colours; read once into the scheme `custom` and then left empty. */
  customAccent: { type: 'color', default: '' },
  customCanvasLight: { type: 'color', default: '' },
  customCanvasDark: { type: 'color', default: '' },
  customCode: { type: 'color', default: '' },
  /** Read once and left at the default: the choice now lives in the Claude preset's override record. */
  inlineCodeColor: { type: 'choice', values: INLINE_CODE_COLORS, default: INLINE_CODE_COLOR_PALETTE },
  motion: { type: 'choice', values: MOTION_MODES, default: MOTION_SYSTEM },
  statusMotion: { type: 'choice', values: STATUS_MOTIONS, default: STATUS_MOTION_SWEEP },
  /** The two legacy words: `precise` is on and `simple` off. */
  statusDetail: { type: 'boolean', default: true, legacy: { precise: true, simple: false } },
  collapseFooter: { type: 'boolean', default: true },
  /** A legacy boolean maps to every popover or none. */
  autoPopover: { type: 'choice', values: AUTO_POPOVER_SCOPES, default: AUTO_POPOVER_ALL, legacy: { true: AUTO_POPOVER_ALL, false: AUTO_POPOVER_OFF } },
  composerScope: { type: 'choice', values: COMPOSER_SCOPES, default: COMPOSER_SCOPE_ALL },
  /** Whether the host's question card is redrawn and moved to the end of the conversation; off leaves it in the composer as the host draws it. */
  questionCard: { type: 'boolean', default: true },
  modelPicker: { type: 'boolean', default: true },
  /** Off restores the host model seat so third-party effort controls remain reachable. */
  effortSlider: { type: 'boolean', default: true },
  modelDescriptions: { type: 'boolean', default: true },
  /** Whether the reasoning-effort trigger takes its colour from the rung in force (features/effort/effort-picker.css). */
  effortAccent: { type: 'boolean', default: true },
  peakrate: { type: 'boolean', default: true },
  /** Store provider ids across catalog renames; the official default is excluded from this list. */
  quickProviders: { type: 'list', default: [], max: QUICK_PROVIDERS_MAX, entryMax: PROVIDER_ID_MAX, drop: [OFFICIAL_MODEL_GROUP] },
  username: { type: 'text', default: '', max: USERNAME_MAX },
  /** The page's scale as a percentage of its own size, between PAGE_ZOOM_MIN and PAGE_ZOOM_MAX; the empty string is "follow the system". */
  pageZoom: {
    type: 'text',
    default: PAGE_ZOOM_DEFAULT,
    max: 8,
    legacy: { system: '', '0.8': '80', '1': '100', '1.25': '125', '1.5': '150' },
  },
  interfaceFontSize: { type: 'text', default: INTERFACE_FONT_SIZE_DEFAULT, max: 8 },
  sodium: { type: 'choice', values: SODIUM_MODES, default: SODIUM_UNDECIDED },
  banLocale: { type: 'choice', values: BAN_LOCALES, default: BAN_LOCALE_EN },
  homeLayout: { type: 'choice', values: HOME_LAYOUTS, default: HOME_LAYOUT_STUDIO },
  homeSessionScope: { type: 'choice', values: HOME_SESSION_SCOPES, default: HOME_SESSION_SCOPE_ACTIVE },
  homeRipple: { type: 'boolean', default: false },
  palette: { type: 'choice', values: PALETTES, default: PALETTE_CLAUDE },
  /** The background fill's opacity as a percentage, between BACKGROUND_OPACITY_MIN and BACKGROUND_OPACITY_MAX. */
  backgroundOpacity: { type: 'text', default: BACKGROUND_OPACITY_DEFAULT, max: 3 },
  typeface: { type: 'choice', values: TYPEFACES, default: TYPEFACE_CLAUDE },
  conversationWidth: { type: 'choice', values: CONVERSATION_WIDTHS, default: CONVERSATION_WIDTH_FULL },
  composerBottomGap: { type: 'choice', values: COMPOSER_GAPS, default: COMPOSER_GAP_THEME },
  /** The mascot on the composer; the resolved one rides the document. */
  mascot: { type: 'choice', values: MASCOTS, default: MASCOT_BRAND },
  mascotScope: { type: 'choice', values: MASCOT_SCOPES, default: MASCOT_SCOPE_ALL },
  permissionsControl: { type: 'boolean', default: true },
  statsPosition: { type: 'choice', values: STATS_POSITIONS, default: STATS_POSITION_CONTEXT },
  /** The face the context meter is drawn with (CONTEXT_DISPLAYS). */
  contextDisplay: { type: 'choice', values: CONTEXT_DISPLAYS, default: CONTEXT_DISPLAY_PIE },
  /** Whether the percentage stands beside that face. */
  contextNumbers: { type: 'boolean', default: true },
  statsFooterAlign: { type: 'choice', values: STATS_FOOTER_ALIGNS, default: 'center' },
  /** Compact-footer figures; speed and TTFT join the existing figures only when asked for. */
  statsFooterSpeed: { type: 'boolean', default: false },
  statsFooterTtft: { type: 'boolean', default: false },
  statsFooterCache: { type: 'boolean', default: true },
  statsFooterCost: { type: 'boolean', default: true },
  statsFooterTotal: { type: 'boolean', default: true },
  statsFooterContext: { type: 'boolean', default: true },
  /** Which official price table the session's cost follows, or off for no figure at all. */
  billingCurrency: { type: 'choice', values: BILLING_CHOICES, default: CURRENCY_CNY },
  /** Custom `model|input|cacheRead|output` rows per million tokens; blank buckets inherit official rates. */
  billingTable: { type: 'list', default: [], max: PRICE_ROWS_MAX, entryMax: 256, drop: [] },
  workspaceView: { type: 'boolean', default: true },
  sidebarSearch: { type: 'boolean', default: true },
  searchStyle: { type: 'choice', values: SEARCH_STYLES, default: SEARCH_STYLE_STANDALONE, legacy: { overlay: SEARCH_STYLE_STANDALONE } },
  /** Whether resting the pointer on the collapsed sidebar's toggle opens the sidebar over the page. */
  sidebarPeek: { type: 'boolean', default: true },
  /** Whether the panel list carries the More menu's hidden entries and its Edit sidebar dialog. */
  sidebarEntries: { type: 'boolean', default: true },
  /** The panel ids that dialog took off the list; they stay reachable from More. */
  sidebarHidden: { type: 'list', default: [], max: SIDEBAR_HIDDEN_MAX, entryMax: PANEL_ID_MAX, drop: [PLUGINS_PANEL_ID] },
  sidebarLayout: { type: 'choice', values: SIDEBAR_LAYOUTS, default: SIDEBAR_LAYOUT_RELAXED },
  ongoingIndicator: { type: 'choice', values: ONGOING_INDICATORS, default: ONGOING_INDICATOR_BREATHE },
  /** Leading uses the host slot; trailing leaves that slot available for third-party marks. */
  ongoingIndicatorSide: { type: 'choice', values: ONGOING_SIDES, default: ONGOING_SIDE_LEFT },
  /** Explicit reminders stay separate from the host's completion-unread state. */
  manualUnreadIds: { type: 'list', default: [], max: MANUAL_UNREAD_LIMIT, entryMax: MANUAL_UNREAD_ID_LIMIT, drop: [] },
  turnNav: { type: 'boolean', default: true },
  /** Whether a message the reader sent carries edit and retract beside its copy button (features/message-actions). */
  messageActions: { type: 'boolean', default: true },
  viewTabs: { type: 'boolean', default: true },
  headerBand: { type: 'boolean', default: true },
  /** Whether the conversation offers its own session details rail (D94). */
  sessionPanel: { type: 'boolean', default: true },
  /** The legacy choices all mean on except `off`. */
  chatAnimations: { type: 'boolean', default: true, legacy: { [CHAT_ANIMATIONS_OFF]: false, enhanced: true, redraw: true } },
  chatWait: { type: 'boolean', default: true },
  chatSend: { type: 'boolean', default: true },
  chatReveal: { type: 'choice', values: CHAT_REVEAL_MODES, default: CHAT_REVEAL_OFF },
  reasoningDisplay: { type: 'choice', values: REASONING_DISPLAYS, default: REASONING_DISPLAY_STEPPED },
  /** Moves the reading position when an answer starts; default off because this is unsolicited movement. */
  answerAnchor: { type: 'boolean', default: false },
  caretMotion: { type: 'choice', values: CARET_MOTIONS, default: CARET_MOTION_TYPING },
  messageEnter: { type: 'choice', values: MESSAGE_ENTER_MODES, default: MESSAGE_ENTER_FLIGHT },
  processRows: { type: 'choice', values: PROCESS_ROWS_LAYOUTS, default: PROCESS_ROWS_FLAT },
  /** Completion/blocked cue gain; default off to avoid unsolicited interruption (D89). */
  soundCues: { type: 'choice', values: SOUND_LEVELS, default: SOUND_LEVEL_OFF },
} as const satisfies Record<string, PrefSpec>

/** One preference's key. */
export type PrefKey = keyof typeof PREFS

/** One preference's value type, from its declaration. */
type SpecValue<S> =
  S extends { readonly type: 'boolean' } ? boolean :
    S extends { readonly type: 'choice', readonly values: readonly (infer V)[] } ? V :
      S extends { readonly type: 'text' | 'color' } ? string :
        S extends { readonly type: 'list' } ? string[] :
          never

/** Browser preference shape derived from declarations; choice fields retain their value unions. */
export type Prefs = { [K in PrefKey]: SpecValue<typeof PREFS[K]> }

/** Every preference's shipped default, from the table above. */
export const PREF_DEFAULTS = Object.freeze(Object.fromEntries(
  Object.entries(PREFS).map(([key, spec]) => [key, spec.default]),
)) as unknown as Prefs

/** A `#rrggbb` colour, which is all the custom accent accepts. */
const COLOR_RE = /^#[0-9a-f]{6}$/i

/** Only declared string/boolean legacy values map; own-key checks exclude `toString` inheritance traps. */
function legacyValue(spec: PrefSpec, raw: unknown): unknown {
  if (spec.legacy === undefined || (typeof raw !== 'string' && typeof raw !== 'boolean')) return undefined
  return Object.hasOwn(spec.legacy, String(raw)) ? spec.legacy[String(raw)] : undefined
}

/** One preference's value, clamped to its declaration; anything unreadable reads as the default. */
function clampPref(spec: PrefSpec, raw: unknown): unknown {
  const legacy = legacyValue(spec, raw)
  if (legacy !== undefined) return legacy
  switch (spec.type) {
    case 'boolean': return typeof raw === 'boolean' ? raw : spec.default
    case 'choice': return typeof raw === 'string' && spec.values.includes(raw) ? raw : spec.default
    // The second trim keeps a cut that lands after a run of spaces from leaving them at the end.
    case 'text': return typeof raw === 'string' ? raw.trim().slice(0, spec.max).trim() : spec.default
    case 'color': return typeof raw === 'string' && COLOR_RE.test(raw) ? raw.toLowerCase() : spec.default
    case 'list': {
      if (!Array.isArray(raw)) return spec.default
      const out: string[] = []
      for (let i = 0; i < raw.length && out.length < spec.max; i++) {
        const entry = raw[i]
        if (typeof entry !== 'string' || entry === '' || entry.length > spec.entryMax) continue
        if (spec.drop.includes(entry) || out.includes(entry)) continue
        out.push(entry)
      }
      return out
    }
  }
}

/** Clamp every host field to its declaration; unreadable values use defaults. */
export function clampPrefs(value: unknown): Prefs {
  const section: Record<string, unknown> = value !== null && typeof value === 'object' ? value as Record<string, unknown> : {}
  const out: Record<string, unknown> = {}
  for (const [key, spec] of Object.entries(PREFS) as [PrefKey, PrefSpec][]) out[key] = clampPref(spec, section[key])
  // A stored accent becomes the first of the reader's four colours, and the custom card is the one in force.
  if (typeof out.brandAccent === 'string' && out.brandAccent !== '') {
    if (out.customAccent === '') out.customAccent = out.brandAccent
    out.paletteColors = PALETTE_COLORING_CUSTOM
    out.brandAccent = ''
  }
  carryPaletteSchemes(out)
  return out as unknown as Prefs
}

/**
 * The scheme records and the selection, read as one (D96): records that cannot
 * be read are left out, the earlier custom card is carried in as the scheme
 * `custom` and its four fields are left empty, and a selection that names no
 * scheme reads as following the brand. Each thing left out is reported, since
 * the reader's stored choice no longer reads as it was written (D12).
 */
function carryPaletteSchemes(out: Record<string, unknown>) {
  const presets: readonly string[] = PALETTE_PRESETS
  const { entries, problems } = normalizePaletteSchemes(out.paletteSchemes as string[], presets)
  const carried = carryCustomPalette(entries, {
    accent: out.customAccent as string,
    canvasLight: out.customCanvasLight as string,
    canvasDark: out.customCanvasDark as string,
    code: out.customCode as string,
  }, BRAND_DEFAULT_PRESETS[out.brand as typeof BRANDS[number]], out.paletteColors === PALETTE_COLORING_CUSTOM, presets)
  out.customAccent = ''
  out.customCanvasLight = ''
  out.customCanvasDark = ''
  out.customCode = ''
  let records = carried
  if (out.inlineCodeColor === INLINE_CODE_COLOR_CLASSIC) {
    records = carryClassicInlineCode(records, 'claude', presets)
    out.inlineCodeColor = INLINE_CODE_COLOR_PALETTE
  }
  out.paletteSchemes = records.slice(0, PALETTE_SCHEME_LIMIT)
  const selected = out.paletteColors as string
  if (selected !== PALETTE_COLORING_BRAND && !presets.includes(selected) && findPaletteScheme(records, selected, presets) === undefined) {
    problems.push(`the selected palette scheme "${selected}" is not among the records; following the brand`)
    out.paletteColors = PALETTE_COLORING_BRAND
  }
  for (const problem of problems) console.error(`dsh-claude-style: ${problem}`)
}
