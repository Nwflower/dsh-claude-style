// packages/contracts/src/package.ts
var PACKAGE_NAME = "dsh-claude-style";

// packages/contracts/src/services.ts
var OFFICIAL_MODEL_GROUP = "deepseek-official";

// packages/contracts/src/prices.ts
var CURRENCY_CNY = "CNY";
var CURRENCY_USD = "USD";
var CURRENCIES = [CURRENCY_CNY, CURRENCY_USD];
var CURRENCY_SYMBOL = {
  [CURRENCY_CNY]: "\xA5",
  [CURRENCY_USD]: "$"
};

// packages/contracts/src/prefs.ts
var BILLING_OFF = "off";
var BILLING_CHOICES = [BILLING_OFF, ...CURRENCIES];
var BRAND_CLAUDE = "claude";
var BRAND_DEEPSEEK = "deepseek";
var BRAND_DEEPSEEK_LEGACY = "off";
var BRANDS = [BRAND_CLAUDE, BRAND_DEEPSEEK];
var PALETTE_COLORING_BRAND = "brand";
var PALETTE_COLORING_CUSTOM = "custom";
var PALETTE_COLORINGS = [PALETTE_COLORING_BRAND, ...BRANDS, PALETTE_COLORING_CUSTOM];
var BRAND_INK_ORIGINAL = "original";
var BRAND_INK_ACCENT = "accent";
var BRAND_INK_TEXT = "text";
var BRAND_INKS = [BRAND_INK_ORIGINAL, BRAND_INK_ACCENT, BRAND_INK_TEXT];
var BRAND_NAME_MAX = 40;
var MOTION_SYSTEM = "system";
var MOTION_REDUCED = "reduced";
var MOTION_FULL = "full";
var MOTION_MODES = [MOTION_SYSTEM, MOTION_REDUCED, MOTION_FULL];
var STATUS_MOTION_SWEEP = "sweep";
var STATUS_MOTION_WASH = "wash";
var STATUS_MOTIONS = [STATUS_MOTION_SWEEP, STATUS_MOTION_WASH];
var CARET_MOTION_OFF = "off";
var CARET_MOTION_TYPING = "typing";
var CARET_MOTIONS = [CARET_MOTION_TYPING, CARET_MOTION_OFF];
var CHAT_REVEAL_OFF = "off";
var CHAT_REVEAL_ON = "on";
var CHAT_REVEAL_MODES = [CHAT_REVEAL_ON, CHAT_REVEAL_OFF];
var REASONING_DISPLAY_CONTINUOUS = "continuous";
var REASONING_DISPLAY_STEPPED = "stepped";
var REASONING_DISPLAYS = [REASONING_DISPLAY_CONTINUOUS, REASONING_DISPLAY_STEPPED];
var MESSAGE_ENTER_FLIGHT = "flight";
var MESSAGE_ENTER_GROW = "grow";
var MESSAGE_ENTER_MODES = [MESSAGE_ENTER_FLIGHT, MESSAGE_ENTER_GROW];
var PROCESS_ROWS_FLAT = "flat";
var PROCESS_ROWS_COLUMN = "column";
var PROCESS_ROWS_LAYOUTS = [PROCESS_ROWS_FLAT, PROCESS_ROWS_COLUMN];
var PALETTE_CLAUDE = "claude";
var PALETTE_HOST = "host";
var PALETTES = [PALETTE_CLAUDE, PALETTE_HOST];
var TYPEFACE_CLAUDE = "claude";
var TYPEFACE_SYSTEM = "system";
var TYPEFACE_HOST = "host";
var TYPEFACES = [TYPEFACE_CLAUDE, TYPEFACE_SYSTEM, TYPEFACE_HOST];
var MASCOT_BRAND = "brand";
var MASCOT_CRAB = "crab";
var MASCOT_DEEPY = "deepy";
var MASCOT_WHALEGIRL = "whalegirl";
var MASCOT_OFF = "off";
var MASCOTS = [MASCOT_BRAND, MASCOT_CRAB, MASCOT_DEEPY, MASCOT_WHALEGIRL, MASCOT_OFF];
var MASCOT_SCOPE_HOME = "home";
var MASCOT_SCOPE_ALL = "all";
var MASCOT_SCOPES = [MASCOT_SCOPE_HOME, MASCOT_SCOPE_ALL];
var SEARCH_STYLE_ICON = "icon";
var SEARCH_STYLE_STANDALONE = "standalone";
var SEARCH_STYLES = [SEARCH_STYLE_ICON, SEARCH_STYLE_STANDALONE];
var SIDEBAR_LAYOUT_RELAXED = "relaxed";
var SIDEBAR_LAYOUT_COMPACT = "compact";
var SIDEBAR_LAYOUTS = [SIDEBAR_LAYOUT_RELAXED, SIDEBAR_LAYOUT_COMPACT];
var ONGOING_INDICATOR_BREATHE = "breathe";
var ONGOING_INDICATOR_RING = "ring";
var ONGOING_INDICATOR_SHIMMER = "shimmer";
var ONGOING_INDICATORS = [ONGOING_INDICATOR_BREATHE, ONGOING_INDICATOR_RING, ONGOING_INDICATOR_SHIMMER];
var ONGOING_SIDE_LEFT = "left";
var ONGOING_SIDE_RIGHT = "right";
var ONGOING_SIDES = [ONGOING_SIDE_LEFT, ONGOING_SIDE_RIGHT];
var CHAT_ANIMATIONS_OFF = "off";
var STATS_POSITION_INLINE = "inline";
var STATS_POSITION_CONTEXT = "context";
var STATS_POSITION_FOOTER = "footer";
var STATS_POSITIONS = [STATS_POSITION_INLINE, STATS_POSITION_CONTEXT, STATS_POSITION_FOOTER];
var STATS_FOOTER_ALIGNS = ["left", "center", "right"];
var CONTEXT_DISPLAY_PIE = "pie";
var CONTEXT_DISPLAY_RING_RAMP = "ring-ramp";
var CONTEXT_DISPLAY_RING_BAND = "ring-band";
var CONTEXT_DISPLAYS = [CONTEXT_DISPLAY_PIE, CONTEXT_DISPLAY_RING_RAMP, CONTEXT_DISPLAY_RING_BAND];
var CONVERSATION_WIDTH_FULL = "1";
var CONVERSATION_WIDTH_THREE_QUARTERS = "0.75";
var CONVERSATION_WIDTH_HALF = "0.5";
var CONVERSATION_WIDTHS = [CONVERSATION_WIDTH_FULL, CONVERSATION_WIDTH_THREE_QUARTERS, CONVERSATION_WIDTH_HALF];
var COMPOSER_GAP_COMPACT = "compact";
var COMPOSER_GAP_THEME = "theme";
var COMPOSER_GAP_ROOMY = "roomy";
var COMPOSER_GAPS = [COMPOSER_GAP_COMPACT, COMPOSER_GAP_THEME, COMPOSER_GAP_ROOMY];
var BAN_LOCALE_EN = "en";
var BAN_LOCALE_ZH = "zh";
var BAN_LOCALE_OFF = "off";
var BAN_LOCALES = [BAN_LOCALE_EN, BAN_LOCALE_ZH, BAN_LOCALE_OFF];
var HOME_LAYOUT_OFF = "off";
var HOME_LAYOUT_CLASSIC = "classic";
var HOME_LAYOUT_STUDIO = "studio";
var HOME_LAYOUTS = [HOME_LAYOUT_OFF, HOME_LAYOUT_CLASSIC, HOME_LAYOUT_STUDIO];
var COMPOSER_SCOPE_OFF = "off";
var COMPOSER_SCOPE_HERO = "hero";
var COMPOSER_SCOPE_CONVERSATION = "conversation";
var COMPOSER_SCOPE_ALL = "all";
var COMPOSER_SCOPES = [COMPOSER_SCOPE_OFF, COMPOSER_SCOPE_HERO, COMPOSER_SCOPE_CONVERSATION, COMPOSER_SCOPE_ALL];
var AUTO_POPOVER_OFF = "off";
var AUTO_POPOVER_ACCOUNT = "account";
var AUTO_POPOVER_ALL = "all";
var AUTO_POPOVER_SCOPES = [AUTO_POPOVER_OFF, AUTO_POPOVER_ACCOUNT, AUTO_POPOVER_ALL];
var PAGE_ZOOM_DEFAULT = "100";
var INTERFACE_FONT_SIZE_DEFAULT = "100";
var BACKGROUND_OPACITY_DEFAULT = "100";
var SODIUM_ON = "on";
var SODIUM_OFF = "off";
var SODIUM_UNDECIDED = "undecided";
var SODIUM_MODES = [SODIUM_UNDECIDED, SODIUM_ON, SODIUM_OFF];
var USERNAME_MAX = 64;
var QUICK_PROVIDERS_MAX = 64;
var PROVIDER_ID_MAX = 128;
var SIDEBAR_HIDDEN_MAX = 32;
var PANEL_ID_MAX = 128;
var PLUGINS_PANEL_ID = "plugins";
var MANUAL_UNREAD_LIMIT = 2048;
var MANUAL_UNREAD_ID_LIMIT = 1024;
var PRICE_ROWS_MAX = 32;
var PREFS = {
  brand: { type: "choice", values: BRANDS, default: BRAND_CLAUDE, legacy: { [BRAND_DEEPSEEK_LEGACY]: BRAND_DEEPSEEK } },
  brandName: { type: "text", default: "", max: BRAND_NAME_MAX },
  brandInk: { type: "choice", values: BRAND_INKS, default: BRAND_INK_ORIGINAL },
  /** Whether the sidebar draws its brand area; off collapses that area and leaves the sidebar toggle in place. */
  sidebarBrand: { type: "boolean", default: true },
  brandAccent: { type: "color", default: "" },
  /** One brand's card, `brand` to follow the theme style, or the reader's four. */
  paletteColors: { type: "choice", values: PALETTE_COLORINGS, default: PALETTE_COLORING_BRAND },
  /** The reader's four colours, empty until picked; each falls back to the card's own. */
  customAccent: { type: "color", default: "" },
  customCanvasLight: { type: "color", default: "" },
  customCanvasDark: { type: "color", default: "" },
  customCode: { type: "color", default: "" },
  motion: { type: "choice", values: MOTION_MODES, default: MOTION_SYSTEM },
  statusMotion: { type: "choice", values: STATUS_MOTIONS, default: STATUS_MOTION_SWEEP },
  /** An earlier build stored the two words; `precise` is what the switch being on means. */
  statusDetail: { type: "boolean", default: true, legacy: { precise: true, simple: false } },
  collapseFooter: { type: "boolean", default: true },
  /** It was a boolean before it grew its choices. */
  autoPopover: { type: "choice", values: AUTO_POPOVER_SCOPES, default: AUTO_POPOVER_ALL, legacy: { true: AUTO_POPOVER_ALL, false: AUTO_POPOVER_OFF } },
  composerScope: { type: "choice", values: COMPOSER_SCOPES, default: COMPOSER_SCOPE_ALL },
  /** Whether the host's question card is redrawn and moved to the end of the conversation; off leaves it in the composer as the host draws it. */
  questionCard: { type: "boolean", default: true },
  modelPicker: { type: "boolean", default: true },
  /**
   * Whether the skin draws the reasoning-effort slider. Off hands the composer's
   * model slot back to the host's own seat so a third-party effort control
   * injected there stays reachable (features/model/model-picker.ts).
   */
  effortSlider: { type: "boolean", default: true },
  modelDescriptions: { type: "boolean", default: true },
  /** Whether the reasoning-effort trigger takes its colour from the rung in force (features/effort/effort-picker.css). */
  effortAccent: { type: "boolean", default: true },
  peakrate: { type: "boolean", default: true },
  /**
   * The provider ids the picker's first level carries: ids rather than names,
   * so a catalog rename does not lose the stored selection. The official
   * service is the picker's default rather than a choice, so a stored id for it
   * is dropped.
   */
  quickProviders: { type: "list", default: [], max: QUICK_PROVIDERS_MAX, entryMax: PROVIDER_ID_MAX, drop: [OFFICIAL_MODEL_GROUP] },
  username: { type: "text", default: "", max: USERNAME_MAX },
  /** The page's scale as a percentage of its own size, between PAGE_ZOOM_MIN and PAGE_ZOOM_MAX; the empty string is "follow the system". */
  pageZoom: {
    type: "text",
    default: PAGE_ZOOM_DEFAULT,
    max: 8,
    legacy: { system: "", "0.8": "80", "1": "100", "1.25": "125", "1.5": "150" }
  },
  interfaceFontSize: { type: "text", default: INTERFACE_FONT_SIZE_DEFAULT, max: 8 },
  sodium: { type: "choice", values: SODIUM_MODES, default: SODIUM_UNDECIDED },
  banLocale: { type: "choice", values: BAN_LOCALES, default: BAN_LOCALE_EN },
  homeLayout: { type: "choice", values: HOME_LAYOUTS, default: HOME_LAYOUT_STUDIO },
  homeRipple: { type: "boolean", default: false },
  palette: { type: "choice", values: PALETTES, default: PALETTE_CLAUDE },
  /** The background fill's opacity as a percentage, between BACKGROUND_OPACITY_MIN and BACKGROUND_OPACITY_MAX. */
  backgroundOpacity: { type: "text", default: BACKGROUND_OPACITY_DEFAULT, max: 3 },
  typeface: { type: "choice", values: TYPEFACES, default: TYPEFACE_CLAUDE },
  conversationWidth: { type: "choice", values: CONVERSATION_WIDTHS, default: CONVERSATION_WIDTH_FULL },
  composerBottomGap: { type: "choice", values: COMPOSER_GAPS, default: COMPOSER_GAP_THEME },
  /** The mascot on the composer; the resolved one rides the document. */
  mascot: { type: "choice", values: MASCOTS, default: MASCOT_BRAND },
  mascotScope: { type: "choice", values: MASCOT_SCOPES, default: MASCOT_SCOPE_ALL },
  permissionsControl: { type: "boolean", default: true },
  statsPosition: { type: "choice", values: STATS_POSITIONS, default: STATS_POSITION_CONTEXT },
  /** The face the context meter is drawn with (CONTEXT_DISPLAYS). */
  contextDisplay: { type: "choice", values: CONTEXT_DISPLAYS, default: CONTEXT_DISPLAY_PIE },
  /** Whether the percentage stands beside that face. */
  contextNumbers: { type: "boolean", default: true },
  statsFooterAlign: { type: "choice", values: STATS_FOOTER_ALIGNS, default: "center" },
  /** Which official price table the session's cost follows, or off for no figure at all. */
  billingCurrency: { type: "choice", values: BILLING_CHOICES, default: CURRENCY_CNY },
  /**
   * The reader's own prices, one row each: `model|input|cacheRead|output` per
   * million tokens, in the billing currency. A row overrides the table for that
   * model (billing-table.ts); a blank bucket leaves that rate to the table.
   */
  billingTable: { type: "list", default: [], max: PRICE_ROWS_MAX, entryMax: 256, drop: [] },
  workspaceView: { type: "boolean", default: true },
  sidebarSearch: { type: "boolean", default: true },
  searchStyle: { type: "choice", values: SEARCH_STYLES, default: SEARCH_STYLE_STANDALONE, legacy: { overlay: SEARCH_STYLE_STANDALONE } },
  /** Whether resting the pointer on the collapsed sidebar's toggle opens the sidebar over the page. */
  sidebarPeek: { type: "boolean", default: true },
  /** Whether the panel list carries the More menu's hidden entries and its Edit sidebar dialog. */
  sidebarEntries: { type: "boolean", default: true },
  /** The panel ids that dialog took off the list; they stay reachable from More. */
  sidebarHidden: { type: "list", default: [], max: SIDEBAR_HIDDEN_MAX, entryMax: PANEL_ID_MAX, drop: [PLUGINS_PANEL_ID] },
  sidebarLayout: { type: "choice", values: SIDEBAR_LAYOUTS, default: SIDEBAR_LAYOUT_RELAXED },
  ongoingIndicator: { type: "choice", values: ONGOING_INDICATORS, default: ONGOING_INDICATOR_BREATHE },
  /**
   * Which end of the row carries that marker. The trailing end (the default)
   * leaves the host's leading slot empty, and the row keeps that band reserved
   * so a third-party mark painted over the slot cannot cover the title.
   */
  ongoingIndicatorSide: { type: "choice", values: ONGOING_SIDES, default: ONGOING_SIDE_RIGHT },
  /** Explicit reminders stay separate from the host's completion-unread state. */
  manualUnreadIds: { type: "list", default: [], max: MANUAL_UNREAD_LIMIT, entryMax: MANUAL_UNREAD_ID_LIMIT, drop: [] },
  turnNav: { type: "boolean", default: true },
  /** Whether a message the reader sent carries edit and retract beside its copy button (features/message-actions). */
  messageActions: { type: "boolean", default: true },
  viewTabs: { type: "boolean", default: true },
  headerBand: { type: "boolean", default: true },
  /** It held a choice before it became a switch again; every retired choice meant on bar `off`. */
  chatAnimations: { type: "boolean", default: true, legacy: { [CHAT_ANIMATIONS_OFF]: false, enhanced: true, redraw: true } },
  chatWait: { type: "boolean", default: true },
  chatSend: { type: "boolean", default: true },
  chatReveal: { type: "choice", values: CHAT_REVEAL_MODES, default: CHAT_REVEAL_OFF },
  reasoningDisplay: { type: "choice", values: REASONING_DISPLAYS, default: REASONING_DISPLAY_STEPPED },
  /**
   * Whether the formal answer takes the reading position as it starts
   * (features/chat-anchor/): its first line comes to the top of the conversation
   * and the follow is handed over there. Off unless the reader asks for it: it
   * moves the page at a moment he did not ask anything of it.
   */
  answerAnchor: { type: "boolean", default: false },
  caretMotion: { type: "choice", values: CARET_MOTIONS, default: CARET_MOTION_TYPING },
  messageEnter: { type: "choice", values: MESSAGE_ENTER_MODES, default: MESSAGE_ENTER_FLIGHT },
  processRows: { type: "choice", values: PROCESS_ROWS_LAYOUTS, default: PROCESS_ROWS_FLAT }
};
var PREF_DEFAULTS = Object.freeze(Object.fromEntries(
  Object.entries(PREFS).map(([key, spec]) => [key, spec.default])
));

// packages/host/src/settings.ts
async function resolveSchemaFactory() {
  try {
    const { createRequire } = await import("node:module");
    const anchor = typeof process.argv[1] === "string" && process.argv[1] !== "" ? process.argv[1] : process.execPath;
    const factory = createRequire(anchor)("@deepseek-ai/schemastery");
    if (factory !== null && factory !== void 0 && typeof factory.object === "function") return factory;
  } catch {
  }
  try {
    const specifier = "@deepseek-ai/schemastery";
    const resolved = await import(specifier);
    const factory = resolved?.default ?? resolved?.Schema ?? null;
    return factory !== null && factory !== void 0 && typeof factory.object === "function" ? factory : null;
  } catch {
    return null;
  }
}
var SchemaFactory = await resolveSchemaFactory();
function volatileField(field) {
  return typeof field?.volatile === "function" ? field.volatile() : field;
}
function prefsField(Schema, key) {
  return Schema.union([Schema.string(), Schema.boolean(), Schema.array(Schema.string())]).default(PREFS[key].default);
}
var Config = SchemaFactory === null ? void 0 : SchemaFactory.object(Object.fromEntries(
  Object.keys(PREFS).map((key) => [key, volatileField(prefsField(SchemaFactory, key))])
));
function registerSettings(ctx) {
  if (typeof ctx.inject !== "function") return;
  ctx.inject(["settings"], (scope) => {
    const settings = scope.settings;
    if (typeof settings?.configure !== "function") return;
    scope.effect(
      () => settings.configure({ auto: false }, ctx.fiber),
      `${PACKAGE_NAME}: settings presentation`
    );
  });
}
export {
  Config,
  registerSettings
};
