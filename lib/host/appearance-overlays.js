// packages/contracts/src/records.ts
function appearancePair(value, what, read) {
  if (value === void 0) return void 0;
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(what + " is not an object of light and dark values");
  const record = value;
  const out = {};
  if (record.light !== void 0) out.light = read(record.light, what + ".light");
  if (record.dark !== void 0) out.dark = read(record.dark, what + ".dark");
  return out.light === void 0 && out.dark === void 0 ? void 0 : out;
}
function parseRecordObject(text) {
  const raw = JSON.parse(text);
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new Error("the record is not an object");
  return raw;
}
function normalizeRecords(list, parse, serialize, noun) {
  const entries = [];
  const problems = [];
  const seen = /* @__PURE__ */ new Set();
  list.forEach((text, at) => {
    try {
      const record = parse(text);
      if (seen.has(record.id)) throw new Error('the id "' + record.id + '" repeats an earlier record');
      seen.add(record.id);
      entries.push(serialize(record));
    } catch (error) {
      problems.push(noun + " " + (at + 1) + " left out: " + (error instanceof Error ? error.message : String(error)));
    }
  });
  return { entries, problems };
}

// packages/contracts/src/palette-schemes.ts
var PALETTE_SCHEME_LIMIT = 16;
var PALETTE_SCHEME_ENTRY_MAX = 400;
var PALETTE_SCHEME_NAME_MAX = 24;
var PALETTE_SCHEME_ID_MAX = 24;
var PALETTE_SCHEME_FOLLOW = "brand";
var PALETTE_EDGES = ["highlight", "surface"];
var COLOUR = /^#[0-9a-f]{6}$/i;
var ID = /^[a-z0-9][a-z0-9-]*$/;
function colour(value, what) {
  if (typeof value !== "string" || !COLOUR.test(value)) throw new Error(`${what} is not a #rrggbb colour`);
  return value.toLowerCase();
}
function pair(value, what) {
  return appearancePair(value, what, colour);
}
function parsePaletteScheme(text, presets) {
  const record = parseRecordObject(text);
  const id = record.id;
  if (typeof id !== "string" || id.length > PALETTE_SCHEME_ID_MAX || !ID.test(id)) throw new Error("the id is not 1\u201324 lowercase letters, digits or hyphens");
  if (id === PALETTE_SCHEME_FOLLOW) throw new Error(`the id "${PALETTE_SCHEME_FOLLOW}" is the follow-the-brand choice`);
  const overrides = presets.includes(id);
  const base = record.base === void 0 && overrides ? id : record.base;
  if (typeof base !== "string" || !presets.includes(base)) throw new Error("the base is not a preset");
  if (overrides && base !== id) throw new Error("a preset's override record starts from that preset");
  let name = "";
  if (record.name !== void 0) {
    if (typeof record.name !== "string") throw new Error("the name is not text");
    name = record.name.trim();
    if (name.length > PALETTE_SCHEME_NAME_MAX) throw new Error(`the name is longer than ${PALETTE_SCHEME_NAME_MAX} characters`);
    if (overrides && name !== "") throw new Error("a preset's override record carries no name");
  }
  const scheme = { id, name, base };
  if (record.accent !== void 0) scheme.accent = colour(record.accent, "accent");
  const background = pair(record.background, "background");
  if (background !== void 0) scheme.background = background;
  const textPair = pair(record.text, "text");
  if (textPair !== void 0) scheme.text = textPair;
  const code = pair(record.code, "code");
  if (code !== void 0) scheme.code = code;
  const link = pair(record.link, "link");
  if (link !== void 0) scheme.link = link;
  if (record.edges !== void 0) {
    if (!PALETTE_EDGES.includes(record.edges)) throw new Error(`edges is not one of ${PALETTE_EDGES.join(", ")}`);
    scheme.edges = record.edges;
  }
  return scheme;
}
function serializePaletteScheme(scheme) {
  const record = { id: scheme.id };
  if (scheme.name !== "") record.name = scheme.name;
  if (scheme.base !== scheme.id) record.base = scheme.base;
  for (const key of ["accent", "background", "text", "code", "link", "edges"]) {
    if (scheme[key] !== void 0) record[key] = scheme[key];
  }
  return JSON.stringify(record);
}
function normalizePaletteSchemes(list, presets) {
  return normalizeRecords(list, (text) => parsePaletteScheme(text, presets), serializePaletteScheme, "palette scheme");
}

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

// packages/contracts/src/branding-presets.ts
var BRANDING_PRESET_LIMIT = 16;
var BRANDING_PRESET_ENTRY_MAX = 1600;
var BRANDING_PRESET_NAME_MAX = 40;
var BRANDING_PRESET_ID_MAX = 40;
var BRANDING_ASSET_REF_MAX = 240;
var BRANDING_SLOTS = ["mark-light", "mark-dark", "wordmark-light", "wordmark-dark"];
var BRAND_INK_ORIGINAL = "original";
var BRAND_INK_ACCENT = "accent";
var BRAND_INK_TEXT = "text";
var BRAND_INKS = [BRAND_INK_ORIGINAL, BRAND_INK_ACCENT, BRAND_INK_TEXT];
var ID2 = /^[a-z0-9][a-z0-9-]*$/;
var BRANDING_VENDORS = ["openai", "gemini", "qwen", "kimicode", "zcode", "minimax", "grok", "xiaomimimo"];
var VENDOR_PREFIX = "vendor-";
var BRANDING_VENDOR_IDS = BRANDING_VENDORS.map((brand) => VENDOR_PREFIX + brand);
function assetRef(value, what) {
  if (typeof value !== "string" || value === "" || value.length > BRANDING_ASSET_REF_MAX) throw new Error(what + " is not an asset reference");
  if (value.startsWith("@managed/")) {
    const slot = value.slice("@managed/".length);
    if (!BRANDING_SLOTS.includes(slot)) throw new Error(what + " names an unknown managed slot");
    return value;
  }
  if (!value.startsWith("./branding/") && !value.startsWith("branding/")) throw new Error(what + " must be a managed slot or a relative branding path");
  if (value.includes("\\") || value.includes("\0") || value.split("/").includes("..")) throw new Error(what + " leaves the branding directory");
  return value;
}
function asset(value, what) {
  if (value === void 0) return void 0;
  if (typeof value === "string") return assetRef(value, what);
  return appearancePair(value, what, assetRef);
}
function parseBrandingPreset(text) {
  const record = parseRecordObject(text);
  const id = record.id;
  if (typeof id !== "string" || id.length > BRANDING_PRESET_ID_MAX || !ID2.test(id)) throw new Error("the id is not 1\u201340 lowercase letters, digits or hyphens");
  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (name.length > BRANDING_PRESET_NAME_MAX) throw new Error("the name is longer than 40 characters");
  const preset = { id, name };
  const mark = asset(record.mark, "mark");
  const wordmark = asset(record.wordmark, "wordmark");
  if (mark !== void 0) preset.mark = mark;
  if (wordmark !== void 0) preset.wordmark = wordmark;
  if (record.ink !== void 0) {
    if (!BRAND_INKS.includes(record.ink)) throw new Error("the ink is not one of " + BRAND_INKS.join(", "));
    preset.ink = record.ink;
  }
  return preset;
}
function serializeBrandingPreset(preset) {
  const record = { id: preset.id, name: preset.name };
  if (preset.mark !== void 0) record.mark = preset.mark;
  if (preset.wordmark !== void 0) record.wordmark = preset.wordmark;
  if (preset.ink !== void 0) record.ink = preset.ink;
  return JSON.stringify(record);
}
function normalizeBrandingPresets(list) {
  return normalizeRecords(list, parseBrandingPreset, serializeBrandingPreset, "branding preset");
}

// packages/contracts/src/sound.ts
var SOUND_LEVEL_OFF = "off";
var SOUND_LEVEL_SOFT = "soft";
var SOUND_LEVEL_CLEAR = "clear";
var SOUND_LEVELS = [SOUND_LEVEL_OFF, SOUND_LEVEL_SOFT, SOUND_LEVEL_CLEAR];
var SOUND_GAIN = {
  [SOUND_LEVEL_OFF]: 0,
  [SOUND_LEVEL_SOFT]: 0.2,
  [SOUND_LEVEL_CLEAR]: 0.55
};

// packages/contracts/src/prefs.ts
var BILLING_OFF = "off";
var BILLING_CHOICES = [BILLING_OFF, ...CURRENCIES];
var BRAND_CLAUDE = "claude";
var BRAND_DEEPSEEK = "deepseek";
var BRAND_DEEPSEEK_LEGACY = "off";
var BRANDS = [BRAND_CLAUDE, BRAND_DEEPSEEK];
var PALETTE_PRESETS = ["claude", "deepseek", "parchment", "forest", "dusk", "rose"];
var BRAND_DEFAULT_PRESETS = { [BRAND_CLAUDE]: "claude", [BRAND_DEEPSEEK]: "deepseek" };
var PALETTE_COLORING_BRAND = PALETTE_SCHEME_FOLLOW;
var INLINE_CODE_COLOR_PALETTE = "palette";
var INLINE_CODE_COLOR_CLASSIC = "classic";
var INLINE_CODE_COLORS = [INLINE_CODE_COLOR_PALETTE, INLINE_CODE_COLOR_CLASSIC];
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
var STATS_POSITION_RAIL = "rail";
var STATS_POSITIONS = [STATS_POSITION_INLINE, STATS_POSITION_CONTEXT, STATS_POSITION_FOOTER, STATS_POSITION_RAIL];
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
var HOME_SESSION_SCOPE_ACTIVE = "active";
var HOME_SESSION_SCOPE_WORKSPACE = "workspace";
var HOME_SESSION_SCOPE_ALL = "all";
var HOME_SESSION_SCOPES = [HOME_SESSION_SCOPE_ACTIVE, HOME_SESSION_SCOPE_WORKSPACE, HOME_SESSION_SCOPE_ALL];
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
var MODEL_ORDER_ID = "id";
var MODEL_ORDER_BRAND = "brand";
var MODEL_ORDER_CATALOG = "catalog";
var MODEL_ORDER_CUSTOM = "custom";
var MODEL_ORDERS = [MODEL_ORDER_ID, MODEL_ORDER_BRAND, MODEL_ORDER_CATALOG, MODEL_ORDER_CUSTOM];
var MODEL_ORDER_ROWS_MAX = 200;
var MODEL_ORDER_ROW_MAX = 160;
var PREFS = {
  brand: { type: "choice", values: BRANDS, default: BRAND_CLAUDE, legacy: { [BRAND_DEEPSEEK_LEGACY]: BRAND_DEEPSEEK } },
  brandName: { type: "text", default: "", max: BRAND_NAME_MAX },
  /** The ink of the brand's own art while the brand marks follow the theme style; a preset carries its own. */
  brandInk: { type: "choice", values: BRAND_INKS, default: BRAND_INK_ORIGINAL },
  /** Empty follows the theme style's own art; a preset id selects one named record or a built-in vendor preset. */
  brandingPreset: { type: "text", default: "", max: BRANDING_PRESET_ID_MAX },
  /** Named logo presets, stored canonically and also accepted as structured YAML records. */
  brandingPresets: { type: "list", default: [], max: BRANDING_PRESET_LIMIT, entryMax: BRANDING_PRESET_ENTRY_MAX, drop: [] },
  /** UI logo records layered over file-defined presets; effective records merge by id. */
  brandingPresetOverrides: { type: "list", default: [], max: BRANDING_PRESET_LIMIT, entryMax: BRANDING_PRESET_ENTRY_MAX, drop: [] },
  /** Base logo ids deleted through the UI, so file reloads do not resurrect them. */
  brandingPresetDeleted: { type: "list", default: [], max: BRANDING_PRESET_LIMIT, entryMax: BRANDING_PRESET_ID_MAX, drop: [] },
  /** Empty keeps the file's logo selection; a UI selection otherwise wins. */
  brandingPresetOverride: { type: "text", default: "", max: BRANDING_PRESET_ID_MAX },
  /** Whether the sidebar draws its brand area; off collapses that area and leaves the sidebar toggle in place. */
  sidebarBrand: { type: "boolean", default: true },
  brandAccent: { type: "color", default: "" },
  /** The selected scheme's id, or `brand` to follow the theme style; an id no scheme carries reads as `brand`. */
  paletteColors: { type: "text", default: PALETTE_COLORING_BRAND, max: PALETTE_SCHEME_ID_MAX },
  /** The schemes' records (palette-schemes.ts): the reader's own and the presets' overrides. */
  paletteSchemes: { type: "list", default: [], max: PALETTE_SCHEME_LIMIT, entryMax: PALETTE_SCHEME_ENTRY_MAX, drop: [] },
  /** UI records layered over file-defined schemes; effective records merge by id. */
  paletteSchemeOverrides: { type: "list", default: [], max: PALETTE_SCHEME_LIMIT, entryMax: PALETTE_SCHEME_ENTRY_MAX, drop: [] },
  /** Base scheme ids deleted through the UI, so file reloads do not resurrect them. */
  paletteSchemeDeleted: { type: "list", default: [], max: PALETTE_SCHEME_LIMIT, entryMax: PALETTE_SCHEME_ID_MAX, drop: [] },
  /** Empty keeps the file's selection; a UI selection otherwise wins. */
  paletteColorsOverride: { type: "text", default: "", max: PALETTE_SCHEME_ID_MAX },
  /** The earlier single custom card's four colours; read once into the scheme `custom` and then left empty. */
  customAccent: { type: "color", default: "" },
  customCanvasLight: { type: "color", default: "" },
  customCanvasDark: { type: "color", default: "" },
  customCode: { type: "color", default: "" },
  /** Read once and left at the default: the choice now lives in the Claude preset's override record. */
  inlineCodeColor: { type: "choice", values: INLINE_CODE_COLORS, default: INLINE_CODE_COLOR_PALETTE },
  motion: { type: "choice", values: MOTION_MODES, default: MOTION_SYSTEM },
  statusMotion: { type: "choice", values: STATUS_MOTIONS, default: STATUS_MOTION_SWEEP },
  /** The two legacy words: `precise` is on and `simple` off. */
  statusDetail: { type: "boolean", default: true, legacy: { precise: true, simple: false } },
  collapseFooter: { type: "boolean", default: true },
  /** A legacy boolean maps to every popover or none. */
  autoPopover: { type: "choice", values: AUTO_POPOVER_SCOPES, default: AUTO_POPOVER_ALL, legacy: { true: AUTO_POPOVER_ALL, false: AUTO_POPOVER_OFF } },
  composerScope: { type: "choice", values: COMPOSER_SCOPES, default: COMPOSER_SCOPE_ALL },
  /** Whether the host's question card is redrawn and moved to the end of the conversation; off leaves it in the composer as the host draws it. */
  questionCard: { type: "boolean", default: true },
  modelPicker: { type: "boolean", default: true },
  /** Brand order groups recognised vendor lockups before plain model names. */
  modelOrder: { type: "choice", values: MODEL_ORDERS, default: MODEL_ORDER_ID },
  /** Custom order entries are `provider/model`; entries left out follow in id order. */
  modelOrderRows: { type: "list", default: [], max: MODEL_ORDER_ROWS_MAX, entryMax: MODEL_ORDER_ROW_MAX, drop: [] },
  /** Off restores the host model seat so third-party effort controls remain reachable. */
  effortSlider: { type: "boolean", default: true },
  modelDescriptions: { type: "boolean", default: true },
  /** Whether the reasoning-effort trigger takes its colour from the rung in force (features/effort/effort-picker.css). */
  effortAccent: { type: "boolean", default: true },
  peakrate: { type: "boolean", default: true },
  /** Store provider ids across catalog renames; the official default is excluded from this list. */
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
  homeSessionScope: { type: "choice", values: HOME_SESSION_SCOPES, default: HOME_SESSION_SCOPE_ACTIVE },
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
  /** Compact-footer figures; speed and TTFT join the existing figures only when asked for. */
  statsFooterSpeed: { type: "boolean", default: false },
  statsFooterTtft: { type: "boolean", default: false },
  statsFooterCache: { type: "boolean", default: true },
  statsFooterCost: { type: "boolean", default: true },
  statsFooterTotal: { type: "boolean", default: true },
  statsFooterContext: { type: "boolean", default: true },
  /** Which official price table the session's cost follows, or off for no figure at all. */
  billingCurrency: { type: "choice", values: BILLING_CHOICES, default: CURRENCY_CNY },
  /** Custom `model|input|cacheRead|output` rows per million tokens; blank buckets inherit official rates. */
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
  /** Leading uses the host slot; trailing leaves that slot available for third-party marks. */
  ongoingIndicatorSide: { type: "choice", values: ONGOING_SIDES, default: ONGOING_SIDE_LEFT },
  /** Explicit reminders stay separate from the host's completion-unread state. */
  manualUnreadIds: { type: "list", default: [], max: MANUAL_UNREAD_LIMIT, entryMax: MANUAL_UNREAD_ID_LIMIT, drop: [] },
  turnNav: { type: "boolean", default: true },
  /** Whether a message the reader sent carries edit and retract beside its copy button (features/message-actions). */
  messageActions: { type: "boolean", default: true },
  viewTabs: { type: "boolean", default: true },
  headerBand: { type: "boolean", default: true },
  /** Whether the conversation offers its own session details rail (D102). */
  sessionPanel: { type: "boolean", default: true },
  /** The legacy choices all mean on except `off`. */
  chatAnimations: { type: "boolean", default: true, legacy: { [CHAT_ANIMATIONS_OFF]: false, enhanced: true, redraw: true } },
  chatWait: { type: "boolean", default: true },
  chatSend: { type: "boolean", default: true },
  chatReveal: { type: "choice", values: CHAT_REVEAL_MODES, default: CHAT_REVEAL_ON },
  reasoningDisplay: { type: "choice", values: REASONING_DISPLAYS, default: REASONING_DISPLAY_STEPPED },
  /** Moves the reading position when an answer starts; default off because this is unsolicited movement. */
  answerAnchor: { type: "boolean", default: false },
  caretMotion: { type: "choice", values: CARET_MOTIONS, default: CARET_MOTION_TYPING },
  messageEnter: { type: "choice", values: MESSAGE_ENTER_MODES, default: MESSAGE_ENTER_FLIGHT },
  processRows: { type: "choice", values: PROCESS_ROWS_LAYOUTS, default: PROCESS_ROWS_FLAT },
  /** Completion/blocked cue gain; default off to avoid unsolicited interruption (D89). */
  soundCues: { type: "choice", values: SOUND_LEVELS, default: SOUND_LEVEL_OFF }
};
var PREF_DEFAULTS = Object.freeze(Object.fromEntries(
  Object.entries(PREFS).map(([key, spec]) => [key, spec.default])
));

// packages/contracts/src/routes.ts
var ROUTE_PREFIX = "/dsh-claude-style";
var USERNAME_PATH = `${ROUTE_PREFIX}/username`;
var HDSL_PATH = `${ROUTE_PREFIX}/hdsl`;
var HDSL_SKIN_PATH = `${ROUTE_PREFIX}/hdsl-skin.png`;
var SESSION_DELETE_PATH = `${ROUTE_PREFIX}/session-delete`;
var USAGE_PATH = `${ROUTE_PREFIX}/usage`;
var SESSION_SEARCH_PATH = `${ROUTE_PREFIX}/session-search`;
var BRAND_PATH = `${ROUTE_PREFIX}/brand`;
var BRAND_MARK_PATH = `${ROUTE_PREFIX}/brand/mark`;
var BRAND_WORDMARK_PATH = `${ROUTE_PREFIX}/brand/wordmark`;
var BRANDING_ASSET_PATH = `${ROUTE_PREFIX}/branding/asset`;
var BRANDING_STATUS_PATH = `${ROUTE_PREFIX}/branding/status`;
var APPEARANCE_OVERLAY_PATH = `${ROUTE_PREFIX}/appearance-overlays`;
var PEAKRATE_PATH = `${ROUTE_PREFIX}/peakrate`;
var PRICES_PATH = `${ROUTE_PREFIX}/prices`;
var SESSION_COST_PATH = `${ROUTE_PREFIX}/session-cost`;
var FONT_FILES_PATH = `${ROUTE_PREFIX}/fonts/`;
var WEBFONTS_PATH = `${ROUTE_PREFIX}/webfonts`;
var SOUND_PATH = `${ROUTE_PREFIX}/sound`;
var SESSION_PANEL_PATH = `${ROUTE_PREFIX}/session-panel`;
var SESSION_COMPACT_PATH = `${ROUTE_PREFIX}/session-compact`;

// packages/host/src/appearance-overlays.ts
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { routeFailure, writeAtomicFile } from "./brand-image-shared.js";

// packages/engine/node/http.ts
function refusalOf(ctx, req, peer) {
  if (peer !== void 0) {
    if (peer === null || typeof peer !== "object" || peer.signal?.aborted === true) return 403;
    return peer.principal?.kind === "owner" ? void 0 : 403;
  }
  const connection = ctx.get("connection");
  if (typeof connection?.requestRejection === "function") return connection.requestRejection(req);
  if (!isLoopbackPeer(req.socket.remoteAddress)) return 403;
  const host = req.headers.host;
  if (host !== void 0) {
    if (!URL.canParse(`http://${host}`)) return 403;
    const name = new URL(`http://${host}`).hostname;
    if (name !== "localhost" && name !== "[::1]" && !/^127\.\d+\.\d+\.\d+$/.test(name)) return 403;
  }
  const site = req.headers["sec-fetch-site"];
  if (site !== void 0 && site !== "same-origin" && site !== "none") return 403;
  const origin = req.headers.origin;
  if (origin === void 0) return void 0;
  if (!URL.canParse(origin)) return 403;
  return new URL(origin).host === host ? void 0 : 403;
}
function isLoopbackPeer(address) {
  if (address === void 0) return false;
  const plain = address.startsWith("::ffff:") ? address.slice("::ffff:".length) : address;
  return plain === "::1" || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(plain);
}
function sendJson(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(body.byteLength),
    "cache-control": "no-store"
  });
  res.end(body);
}
function methodRefused(req, res, methods) {
  if (req.method !== void 0 && methods.includes(req.method)) return false;
  res.writeHead(405, { allow: methods.join(", ") });
  res.end();
  return true;
}
function fenceRefused(ctx, req, res, peer) {
  const refused = refusalOf(ctx, req, peer);
  if (refused === void 0) return false;
  sendJson(res, refused, { ok: false, error: refused === 401 ? "unauthorized" : "forbidden" });
  return true;
}
function readRequestBody(req, limit) {
  return new Promise((settle) => {
    const chunks = [];
    let size = 0;
    let over = false;
    req.on("data", (chunk) => {
      if (over) return;
      size += chunk.length;
      if (size > limit) {
        over = true;
        settle(null);
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    req.on("end", () => {
      if (!over) settle(Buffer.concat(chunks));
    });
    req.on("error", () => {
      if (!over) settle(null);
    });
  });
}

// packages/host/src/appearance-overlays.ts
import { pluginPath } from "./harness-home.js";
var BODY_MAX = 64 * 1024;
var DEFAULT = Object.freeze({
  paletteSchemeOverrides: [],
  paletteSchemeDeleted: [],
  paletteColorsOverride: "",
  brandingPresetOverrides: [],
  brandingPresetDeleted: [],
  brandingPresetOverride: ""
});
function normalize(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("the overlay is not an object");
  const record = value;
  const palette = normalizePaletteSchemes(Array.isArray(record.paletteSchemeOverrides) ? record.paletteSchemeOverrides.filter((entry) => typeof entry === "string") : [], PALETTE_PRESETS);
  const branding = normalizeBrandingPresets(Array.isArray(record.brandingPresetOverrides) ? record.brandingPresetOverrides.filter((entry) => typeof entry === "string") : []);
  const ids = (input, max) => Array.isArray(input) ? input.filter((entry) => typeof entry === "string" && entry.length > 0 && entry.length <= max) : [];
  return {
    paletteSchemeOverrides: palette.entries,
    paletteSchemeDeleted: ids(record.paletteSchemeDeleted, 24),
    paletteColorsOverride: typeof record.paletteColorsOverride === "string" ? record.paletteColorsOverride.slice(0, 24) : "",
    brandingPresetOverrides: branding.entries,
    brandingPresetDeleted: ids(record.brandingPresetDeleted, 40),
    brandingPresetOverride: typeof record.brandingPresetOverride === "string" ? record.brandingPresetOverride.slice(0, 40) : ""
  };
}
function createOverlayStore(ctx) {
  const file = () => join(pluginPath(ctx), "appearance-overlays.json");
  const read = () => {
    if (statSync(file(), { throwIfNoEntry: false })?.isFile() !== true) return { ...DEFAULT };
    return normalize(JSON.parse(readFileSync(file(), "utf8")));
  };
  const write = (value) => {
    const normalized = normalize(value);
    const target = file();
    writeAtomicFile(target, Buffer.from(JSON.stringify(normalized, null, 2) + "\n"), []);
    return normalized;
  };
  return { read, write };
}
function appearanceOverlayRoutes(ctx) {
  const store = createOverlayStore(ctx);
  return {
    label: "appearance overlays",
    route: {
      kind: "exact",
      path: APPEARANCE_OVERLAY_PATH,
      handler: (req, res, peer) => {
        if (methodRefused(req, res, ["GET", "PUT"])) return;
        if (fenceRefused(ctx, req, res, peer)) return;
        if (req.method === "GET") {
          sendJson(res, 200, { ok: true, value: store.read() });
          return;
        }
        void (async () => {
          const body = await readRequestBody(req, BODY_MAX);
          if (body === null) {
            res.once("finish", () => req.destroy());
            sendJson(res, 413, { ok: false, error: "request body too large" });
            return;
          }
          try {
            const value = store.write(JSON.parse(body.toString("utf8")));
            sendJson(res, 200, { ok: true, value });
          } catch (error) {
            sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
          }
        })().catch((error) => {
          routeFailure(res, error);
        });
      }
    }
  };
}
export {
  appearanceOverlayRoutes
};
