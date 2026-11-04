/**
 * The preferences: one declaration each, shared by both halves (D73).
 *
 * Every fact about a preference lives here once — its key, its type, the values
 * it accepts, its shipped default, the limit a text or a list keeps to, and the
 * shapes (or names) an earlier build stored. `Prefs`, the value constants the
 * browser half reads, the page attributes' defaults and the host half's Config
 * are derived from this table, so a preference is added by one entry here plus
 * the feature that reads it (its settings row follows the same table, D72).
 */
import { OFFICIAL_MODEL_GROUP } from './services'
import { CURRENCIES, CURRENCY_CNY } from './prices'

/* ---------- the value vocabulary ---------- */

/** The billing choice's off value: no figure is drawn and no settlement is priced. */
export const BILLING_OFF = 'off'
/** The billing choices, in the settings' order: the two official tables, or no billing at all. */
export const BILLING_CHOICES = [BILLING_OFF, ...CURRENCIES] as const

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
export const BRANDS = [BRAND_CLAUDE, BRAND_DEEPSEEK] as const

/**
 * Which colours the page paints: one brand's own card, `brand` for whichever
 * brand the theme style chooses, or the reader's four. A card id stands on its
 * own, so the colour card and the brand mark are chosen apart.
 */
export const PALETTE_COLORING_BRAND = 'brand'
export const PALETTE_COLORING_CUSTOM = 'custom'
export const PALETTE_COLORINGS = [PALETTE_COLORING_BRAND, ...BRANDS, PALETTE_COLORING_CUSTOM] as const

/** How the brand art is painted: in its own colours, in the accent, or as a shape in the text colour. */
export const BRAND_INK_ORIGINAL = 'original'
export const BRAND_INK_ACCENT = 'accent'
export const BRAND_INK_TEXT = 'text'
export const BRAND_INKS = [BRAND_INK_ORIGINAL, BRAND_INK_ACCENT, BRAND_INK_TEXT] as const
/** Longest accepted brand name. */
export const BRAND_NAME_MAX = 40

/**
 * The animation choice: `system` follows the operating system's own
 * reduced-motion setting, `reduced` holds every animation still whatever the
 * system says, and `full` always plays them. The resolved answer rides <body>
 * as an attribute (`reduced` / `full`), so the mascots and the stylesheets read
 * one value instead of asking the system separately.
 */
export const MOTION_SYSTEM = 'system'
export const MOTION_REDUCED = 'reduced'
export const MOTION_FULL = 'full'
export const MOTION_MODES = [MOTION_SYSTEM, MOTION_REDUCED, MOTION_FULL] as const

/**
 * What the words on the waiting line wear while a turn runs: the highlight band
 * the host's own rows sweep (`sweep`, the default), or the colour wash
 * transitions.dev's "Pro gradient text" moves through the letters (`wash`).
 */
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
/** Who sets the type, under the same two answers. */
export const TYPEFACE_CLAUDE = 'claude'
export const TYPEFACE_HOST = 'host'
export const TYPEFACES = [TYPEFACE_CLAUDE, TYPEFACE_HOST] as const

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

/**
 * The mark a conversation still running carries in the sidebar: a light
 * breathing in place over the idle seat's hollow circle, or the ring turning
 * that the skin drew before the light.
 */
export const ONGOING_INDICATOR_BREATHE = 'breathe'
export const ONGOING_INDICATOR_RING = 'ring'
export const ONGOING_INDICATORS = [ONGOING_INDICATOR_BREATHE, ONGOING_INDICATOR_RING] as const

/** The chat area's animation switch: on plays the ported set (features/chat-*), off leaves the area to the host. */
export const CHAT_ANIMATIONS_OFF = 'off'

/** Where the session's numbers show: in the context popover the meter opens, or on a line of their own under the input card. */
export const STATS_POSITION_INLINE = 'inline'
export const STATS_POSITION_CONTEXT = 'context'
export const STATS_POSITION_FOOTER = 'footer'
export const STATS_POSITIONS = [STATS_POSITION_INLINE, STATS_POSITION_CONTEXT, STATS_POSITION_FOOTER] as const
export const STATS_FOOTER_ALIGNS = ['left', 'center', 'right'] as const

/**
 * How the composer draws the context meter's reading: the pie the skin has
 * painted, dsh's own thin ring on the continuous green-to-red band, or the
 * heavier ring measured from the reference image on three bands.
 */
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

/**
 * The language the account-hold easter egg (features/ban-screen/) is written
 * in, or `off` for none. It is its own preference rather than "follow the
 * shell", because the page reproduces a real Claude screen: the point is to
 * read it in the language Claude actually used.
 */
export const BAN_LOCALE_EN = 'en'
export const BAN_LOCALE_ZH = 'zh'
export const BAN_LOCALE_OFF = 'off'
export const BAN_LOCALES = [BAN_LOCALE_EN, BAN_LOCALE_ZH, BAN_LOCALE_OFF] as const

/**
 * Home-page layouts, in settings order. `off` leaves the host's own home page as
 * it is; `classic` is the centered hero; `studio` is the dashboard form, Claude
 * Code's own home.
 */
export const HOME_LAYOUT_OFF = 'off'
export const HOME_LAYOUT_CLASSIC = 'classic'
export const HOME_LAYOUT_STUDIO = 'studio'
export const HOME_LAYOUTS = [HOME_LAYOUT_OFF, HOME_LAYOUT_CLASSIC, HOME_LAYOUT_STUDIO] as const

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

/**
 * How large the page is drawn: the empty value leaves it at the size the system
 * gives it, and every other value is the percentage the whole page is scaled by
 * (the stylesheet reads it as a `zoom`, so the page lays out in a smaller space
 * and every control, line and picture grows with it). Any percentage from
 * PAGE_ZOOM_MIN through PAGE_ZOOM_MAX is a value the row draws; one outside it
 * reads as the nearer end.
 *
 * 空串是「跟系统」：页面一个属性都不写，尺寸就还是系统和宿主给的那个。
 */
export const PAGE_ZOOM_SYSTEM = ''
/* 缩放现在是任意百分比：100 就是不动，60–200 是滑条的范围，中间每一格都算。
   早先的固定档位（system / 0.8 / 1 / 1.25 / 1.5）在 legacy 里照样读得回来。 */
export const PAGE_ZOOM_DEFAULT = '100'
export const PAGE_ZOOM_MIN = 60
export const PAGE_ZOOM_MAX = 200

/** Background fill opacity as a percentage; 100 keeps the existing canvas opaque. */
export const BACKGROUND_OPACITY_DEFAULT = '100'
export const BACKGROUND_OPACITY_MIN = 0
export const BACKGROUND_OPACITY_MAX = 100

/**
 * The sodium rewrite (D78): `undecided` until the reader or the first probe that
 * finds a listed rule decides it, and drawn as off until then. The settings
 * switch writes `on` or `off`, and the probe acts on `undecided` alone.
 */
export const SODIUM_ON = 'on'
export const SODIUM_OFF = 'off'
export const SODIUM_UNDECIDED = 'undecided'
export const SODIUM_MODES = [SODIUM_UNDECIDED, SODIUM_ON, SODIUM_OFF] as const

/** Longest accepted custom username. */
export const USERNAME_MAX = 64
/** Most quick-provider ids kept, and the longest id accepted. */
export const QUICK_PROVIDERS_MAX = 64
export const PROVIDER_ID_MAX = 128
/**
 * The sidebar's panel entries the reader took off the list (features/sidebar-entries):
 * most ids kept, the longest id accepted, and the Plugins panel, which the host
 * keeps on the list whatever is asked and so is never stored.
 */
export const SIDEBAR_HIDDEN_MAX = 32
export const PANEL_ID_MAX = 128
export const PLUGINS_PANEL_ID = 'plugins'
/**
 * The custom price table (billing-table.ts): most rows kept, the longest model
 * name accepted, and the longest rate written as text — rates are decimal text
 * so a stored row never loses a digit to a float.
 */
export const PRICE_ROWS_MAX = 32
export const PRICE_ROW_MODEL_MAX = 96
export const PRICE_ROW_RATE_MAX = 16

/* ---------- the table ---------- */

interface PrefSpecBase {
  /**
   * The shapes (or names) an earlier build stored, by the value as written:
   * each maps onto what it means under this declaration. A stored value that is
   * neither here nor acceptable under the declaration reads as the default.
   */
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
 * One declaration per preference (D73). A `choice`'s values are the set a stored
 * value is held to; a `legacy` entry is a shape an earlier build wrote. The host
 * half's form carries the keys and the defaults and stays permissive about the
 * shapes, so an old value never keeps the package from starting.
 */
export const PREFS = {
  brand: { type: 'choice', values: BRANDS, default: BRAND_CLAUDE, legacy: { [BRAND_DEEPSEEK_LEGACY]: BRAND_DEEPSEEK } },
  brandName: { type: 'text', default: '', max: BRAND_NAME_MAX },
  brandInk: { type: 'choice', values: BRAND_INKS, default: BRAND_INK_ORIGINAL },
  /** Whether the sidebar draws its brand area; off collapses that area and leaves the sidebar toggle in place. */
  sidebarBrand: { type: 'boolean', default: true },
  brandAccent: { type: 'color', default: '' },
  /** One brand's card, `brand` to follow the theme style, or the reader's four. */
  paletteColors: { type: 'choice', values: PALETTE_COLORINGS, default: PALETTE_COLORING_BRAND },
  /** The reader's four colours, empty until picked; each falls back to the card's own. */
  customAccent: { type: 'color', default: '' },
  customCanvasLight: { type: 'color', default: '' },
  customCanvasDark: { type: 'color', default: '' },
  customCode: { type: 'color', default: '' },
  motion: { type: 'choice', values: MOTION_MODES, default: MOTION_SYSTEM },
  statusMotion: { type: 'choice', values: STATUS_MOTIONS, default: STATUS_MOTION_SWEEP },
  /** An earlier build stored the two words; `precise` is what the switch being on means. */
  statusDetail: { type: 'boolean', default: true, legacy: { precise: true, simple: false } },
  collapseFooter: { type: 'boolean', default: true },
  /** It was a boolean before it grew its choices. */
  autoPopover: { type: 'choice', values: AUTO_POPOVER_SCOPES, default: AUTO_POPOVER_ALL, legacy: { true: AUTO_POPOVER_ALL, false: AUTO_POPOVER_OFF } },
  composerScope: { type: 'choice', values: COMPOSER_SCOPES, default: COMPOSER_SCOPE_ALL },
  modelPicker: { type: 'boolean', default: true },
  /**
   * Whether the skin draws the reasoning-effort slider. Off hands the composer's
   * model slot back to the host's own seat so a third-party effort control
   * injected there stays reachable (features/model/model-picker.ts).
   */
  effortSlider: { type: 'boolean', default: true },
  modelDescriptions: { type: 'boolean', default: true },
  /** Whether the reasoning-effort trigger takes its colour from the rung in force (features/effort/effort-picker.css). */
  effortAccent: { type: 'boolean', default: true },
  peakrate: { type: 'boolean', default: true },
  /**
   * The provider ids the picker's first level carries: ids rather than names,
   * so a catalog rename does not lose the stored selection. The official
   * service is the picker's default rather than a choice, so a stored id for it
   * is dropped.
   */
  quickProviders: { type: 'list', default: [], max: QUICK_PROVIDERS_MAX, entryMax: PROVIDER_ID_MAX, drop: [OFFICIAL_MODEL_GROUP] },
  username: { type: 'text', default: '', max: USERNAME_MAX },
  /** The page's scale as a percentage of its own size, between PAGE_ZOOM_MIN and PAGE_ZOOM_MAX; the empty string is "follow the system". */
  pageZoom: {
    type: 'text',
    default: PAGE_ZOOM_DEFAULT,
    max: 8,
    /* 旧的固定档位：'system' 现在就是空串（页面不写属性），其余四档换成百分比。 */
    legacy: { system: '', '0.8': '80', '1': '100', '1.25': '125', '1.5': '150' },
  },
  sodium: { type: 'choice', values: SODIUM_MODES, default: SODIUM_UNDECIDED },
  banLocale: { type: 'choice', values: BAN_LOCALES, default: BAN_LOCALE_EN },
  homeLayout: { type: 'choice', values: HOME_LAYOUTS, default: HOME_LAYOUT_STUDIO },
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
  /** Which official price table the session's cost follows, or off for no figure at all. */
  billingCurrency: { type: 'choice', values: BILLING_CHOICES, default: CURRENCY_CNY },
  /**
   * The reader's own prices, one row each: `model|input|cacheRead|output` per
   * million tokens, in the billing currency. A row overrides the table for that
   * model (billing-table.ts); a blank bucket leaves that rate to the table.
   */
  billingTable: { type: 'list', default: [], max: PRICE_ROWS_MAX, entryMax: 256, drop: [] },
  workspaceView: { type: 'boolean', default: true },
  /** Whether the sidebar lists its sessions by date instead of by workspace (features/date-groups). */
  dateGroups: { type: 'boolean', default: true },
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
  turnNav: { type: 'boolean', default: true },
  viewTabs: { type: 'boolean', default: true },
  headerBand: { type: 'boolean', default: true },
  /** It held a choice before it became a switch again; every retired choice meant on bar `off`. */
  chatAnimations: { type: 'boolean', default: true, legacy: { [CHAT_ANIMATIONS_OFF]: false, enhanced: true, redraw: true } },
  chatWait: { type: 'boolean', default: true },
  chatSend: { type: 'boolean', default: true },
  chatReveal: { type: 'choice', values: CHAT_REVEAL_MODES, default: CHAT_REVEAL_OFF },
  caretMotion: { type: 'choice', values: CARET_MOTIONS, default: CARET_MOTION_TYPING },
  messageEnter: { type: 'choice', values: MESSAGE_ENTER_MODES, default: MESSAGE_ENTER_FLIGHT },
  processRows: { type: 'choice', values: PROCESS_ROWS_LAYOUTS, default: PROCESS_ROWS_FLAT },
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

/**
 * The preference shape the browser half reads: one field per declaration above,
 * a choice field carrying its own values as a union, so a misspelt value fails
 * the type check. A boolean preference is on unless stored as an explicit
 * `false`.
 */
export type Prefs = { [K in PrefKey]: SpecValue<typeof PREFS[K]> }

/** Every preference's shipped default, from the table above. */
export const PREF_DEFAULTS = Object.freeze(Object.fromEntries(
  Object.entries(PREFS).map(([key, spec]) => [key, spec.default]),
)) as unknown as Prefs

/** A `#rrggbb` colour, which is all the custom accent accepts. */
const COLOR_RE = /^#[0-9a-f]{6}$/i

/**
 * The shape an earlier build wrote for this value, or undefined. Only a string or
 * a boolean was ever written, and only the table's own keys name one: an object
 * holding a field called `toString`, or the string `toString` itself, is no
 * earlier shape.
 */
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
    case 'text': return typeof raw === 'string' ? raw.trim().slice(0, spec.max) : spec.default
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

/**
 * Clamp one host value into the preference shape, field by field off the table:
 * a boolean stays on unless stored as `false`, a choice outside its set reads as
 * its default, a text is trimmed to its limit, a colour must be `#rrggbb`, and a
 * list keeps distinct ids within both limits.
 */
export function clampPrefs(value: unknown): Prefs {
  const section: Record<string, unknown> = value !== null && typeof value === 'object' ? value as Record<string, unknown> : {}
  const out: Record<string, unknown> = {}
  for (const [key, spec] of Object.entries(PREFS) as [PrefKey, PrefSpec][]) out[key] = clampPref(spec, section[key])
  // A build before the colour cards stored one accent; it becomes the first of the reader's four
  // colours, and that card is the one in force, so the page looks the way it did.
  if (typeof out.brandAccent === 'string' && out.brandAccent !== '') {
    if (out.customAccent === '') out.customAccent = out.brandAccent
    out.paletteColors = PALETTE_COLORING_CUSTOM
    out.brandAccent = ''
  }
  return out as unknown as Prefs
}
