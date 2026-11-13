// packages/contracts/src/package.ts
var PACKAGE_NAME = "dsh-claude-style";

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
var PEAKRATE_PATH = `${ROUTE_PREFIX}/peakrate`;
var PRICES_PATH = `${ROUTE_PREFIX}/prices`;
var SESSION_COST_PATH = `${ROUTE_PREFIX}/session-cost`;
var FONT_FILES_PATH = `${ROUTE_PREFIX}/fonts/`;
var WEBFONTS_PATH = `${ROUTE_PREFIX}/webfonts`;
var SOUND_PATH = `${ROUTE_PREFIX}/sound`;
var SESSION_PANEL_PATH = `${ROUTE_PREFIX}/session-panel`;

// packages/contracts/src/webfonts.ts
var OPTIONAL_WEBFONTS = [
  { family: "Anthropic Sans Web Text", file: "AnthropicSansWebText.ttf" },
  { family: "Anthropic Serif Web Text", file: "AnthropicSerifWebText.ttf" },
  { family: "Anthropic Mono Web", file: "AnthropicMonoWeb.ttf" }
];

// packages/host/src/routes.ts
import { existsSync as existsSync2, readFileSync as readFileSync2, readdirSync, realpathSync, rmSync, statSync } from "node:fs";
import { userInfo } from "node:os";
import { join as join3, resolve, sep } from "node:path";
import { brandRoutes } from "./brand.js";

// packages/engine/node/harness-home.ts
import { homedir } from "node:os";
import { join } from "node:path";
function harnessPath(ctx, ...segments) {
  const resolvePath = ctx.get("dshHomePath");
  if (typeof resolvePath === "function") return resolvePath(...segments);
  return join(process.env.DSH_HOME ?? join(homedir(), ".dsh"), ...segments);
}

// packages/host/src/routes.ts
import { pluginPath } from "./harness-home.js";

// packages/engine/node/http.ts
function refusalOf(ctx, req) {
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
function fenceRefused(ctx, req, res) {
  const refused = refusalOf(ctx, req);
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

// packages/host/src/routes.ts
import { clampSoundVolume, isSoundName, playSystemSound, soundCapability } from "./sound.js";

// packages/engine/node/static-files.ts
import { existsSync, readFileSync } from "node:fs";
import { join as join2 } from "node:path";
import { brotliDecompressSync } from "node:zlib";
var ASSETS_MANIFEST = "manifest.json";
var UNPRESSED_LIMIT = 32;
function createStaticFiles(ctx, packageName, assetsDir) {
  const unpressed = /* @__PURE__ */ new Map();
  function sendFile(res, method, path, headers, body = null) {
    if (body === null && !existsSync(path)) {
      res.writeHead(404);
      res.end();
      return;
    }
    const payload = body ?? readFileSync(path);
    res.writeHead(200, {
      ...headers,
      "content-length": String(payload.byteLength)
    });
    res.end(method === "HEAD" ? void 0 : payload);
  }
  function readManifest() {
    const path = join2(assetsDir, ASSETS_MANIFEST);
    if (!existsSync(path)) return void 0;
    try {
      return JSON.parse(readFileSync(path, "utf8")).assets;
    } catch (error) {
      ctx.logger?.warn?.(`${packageName}: lib/assets/${ASSETS_MANIFEST} is unreadable: ${error?.message ?? String(error)}`);
      return void 0;
    }
  }
  function sendAsset(req, res, name) {
    const asset = readManifest()?.[name];
    if (asset === void 0) return false;
    const stored = join2(assetsDir, asset.encoding === "br" ? `${name}.br` : name);
    const headers = {
      "content-type": asset.type,
      "cache-control": "public, max-age=31536000, immutable"
    };
    const method = req.method ?? "GET";
    if (asset.encoding !== "br") {
      sendFile(res, method, stored, headers);
      return true;
    }
    if (/\bbr\b/.test(req.headers["accept-encoding"] ?? "")) {
      sendFile(res, method, stored, { ...headers, "content-encoding": "br" });
      return true;
    }
    const cached = unpressed.get(name);
    if (cached !== void 0) {
      sendFile(res, method, stored, headers, cached);
      return true;
    }
    if (!existsSync(stored)) {
      res.writeHead(404);
      res.end();
      return true;
    }
    const body = brotliDecompressSync(readFileSync(stored));
    if (unpressed.size >= UNPRESSED_LIMIT) unpressed.clear();
    unpressed.set(name, body);
    sendFile(res, method, stored, headers, body);
    return true;
  }
  return { sendFile, sendAsset };
}

// packages/host/src/routes.ts
import { createHdslAccount } from "./hdsl.js";
import { packageRoot } from "./package-root.js";
import { createPeakRate } from "./peakrate.js";
import { createPrices } from "./prices.js";
import { QUERY_MAX, createSessionSearch } from "./search.js";
import { billingRowsOf, createSessionCost } from "./session-cost.js";
import { createSessionPanel } from "./session-panel.js";
import { sessionDirectoryName } from "./session-name.js";
import { createUsage } from "./usage.js";

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
var PALETTE_COLORING_BRAND = "brand";
var PALETTE_COLORING_CUSTOM = "custom";
var PALETTE_COLORINGS = [PALETTE_COLORING_BRAND, ...BRANDS, PALETTE_COLORING_CUSTOM];
var INLINE_CODE_COLOR_PALETTE = "palette";
var INLINE_CODE_COLOR_CLASSIC = "classic";
var INLINE_CODE_COLORS = [INLINE_CODE_COLOR_PALETTE, INLINE_CODE_COLOR_CLASSIC];
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
  /** Whether the conversation offers its own session details rail (D94). */
  sessionPanel: { type: "boolean", default: true },
  /** The legacy choices all mean on except `off`. */
  chatAnimations: { type: "boolean", default: true, legacy: { [CHAT_ANIMATIONS_OFF]: false, enhanced: true, redraw: true } },
  chatWait: { type: "boolean", default: true },
  chatSend: { type: "boolean", default: true },
  chatReveal: { type: "choice", values: CHAT_REVEAL_MODES, default: CHAT_REVEAL_OFF },
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

// packages/host/src/routes.ts
var COPY_FILE = "model-descriptions.json";
var BILLING_ROWS_MAX = 32;
var BILLING_ROW_MAX = 256;
function readBillingRows(query) {
  const currency = query.get("cur");
  const rows = query.getAll("b").slice(0, BILLING_ROWS_MAX).filter((row) => row.length <= BILLING_ROW_MAX);
  return billingRowsOf(rows, currency === "CNY" || currency === "USD" ? currency : null);
}
async function playSoundRequest(req, res) {
  const body = await readRequestBody(req, SOUND_BODY_MAX);
  if (body === null) {
    sendJson(res, 413, { ok: false, error: "request body too large" });
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(body.toString("utf8"));
  } catch {
    sendJson(res, 400, { ok: false, error: "request body is not JSON" });
    return;
  }
  const request = parsed !== null && typeof parsed === "object" ? parsed : null;
  if (request === null || !isSoundName(request.name)) {
    sendJson(res, 400, { ok: false, error: "unknown sound" });
    return;
  }
  if (soundCapability().playback !== "system") {
    sendJson(res, 409, { ok: false, error: "system playback unavailable" });
    return;
  }
  await playSystemSound(request.name, clampSoundVolume(request.volume));
  sendJson(res, 200, { ok: true });
}
var FONT_FILES = {
  "JetBrainsMonoVariable.woff2": "font/woff2",
  "JetBrainsMonoItalicVariable.woff2": "font/woff2",
  ...Object.fromEntries(OPTIONAL_WEBFONTS.map((face) => [face.file, "font/ttf"])),
  "InterVariable.woff2": "font/woff2",
  "NotoSerifVariable.woff2": "font/woff2",
  "ClaudeStylePixel.woff2": "font/woff2"
};
var WEBFONTS_SUB = WEBFONTS_PATH.slice(ROUTE_PREFIX.length);
var ASSETS_PATH = `${ROUTE_PREFIX}/assets/`;
var DELETE_BODY_MAX = 4096;
var SOUND_BODY_MAX = 1024;
var SESSION_ID_RE = /^[A-Za-z0-9._\-:@]{1,200}$/;
var JOB_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{1,80}$/;
function sessionIsLive(ctx, sessionId) {
  const sessions = ctx.get("sessions");
  if (sessions === null || sessions === void 0) return false;
  if (typeof sessions.get === "function") {
    const found = sessions.get(sessionId);
    return found !== void 0 && found !== null;
  }
  if (typeof sessions.list === "function") {
    const listed = sessions.list();
    if (Array.isArray(listed)) {
      return listed.some((item) => (typeof item === "string" ? item : item?.id ?? item?.sessionId) === sessionId);
    }
  }
  return true;
}
async function unarchiveSession(ctx, sessionId) {
  const registry = ctx.get("workspaceRegistry");
  if (typeof registry?.unarchiveSession !== "function") return;
  await registry.unarchiveSession(sessionId);
}
async function deleteSession(ctx, req, res) {
  const refused = refusalOf(ctx, req);
  if (refused !== void 0) {
    sendJson(res, refused, { ok: false, error: refused === 401 ? "unauthorized" : "forbidden" });
    return;
  }
  const raw = await readRequestBody(req, DELETE_BODY_MAX);
  if (raw === null) {
    res.once("finish", () => req.destroy());
  }
  let request = null;
  try {
    request = raw === null ? null : JSON.parse(raw.toString("utf8"));
  } catch {
    request = null;
  }
  const sessionId = request !== null && typeof request.sessionId === "string" ? request.sessionId : "";
  if (!SESSION_ID_RE.test(sessionId)) {
    sendJson(res, 400, { ok: false, error: "invalid session id" });
    return;
  }
  const storedName = sessionDirectoryName(sessionId);
  if (sessionIsLive(ctx, sessionId)) {
    sendJson(res, 409, { ok: false, error: "session is open" });
    return;
  }
  const root = resolve(harnessPath(ctx, "sessions"));
  let dir = null;
  for (const entry of readdirSync(root)) {
    const candidate = join3(root, entry, storedName);
    if (statSync(candidate, { throwIfNoEntry: false })?.isDirectory() === true) {
      dir = candidate;
      break;
    }
  }
  if (dir === null) {
    await unarchiveSession(ctx, sessionId);
    sendJson(res, 200, { ok: true, ghost: true });
    return;
  }
  const realRoot = realpathSync(root);
  if (!realpathSync(dir).startsWith(realRoot + sep)) {
    sendJson(res, 403, { ok: false, error: "session directory outside the sessions root" });
    return;
  }
  if (sessionIsLive(ctx, sessionId)) {
    sendJson(res, 409, { ok: false, error: "session is open" });
    return;
  }
  rmSync(dir, { recursive: true, force: true });
  await unarchiveSession(ctx, sessionId);
  sendJson(res, 200, { ok: true, ghost: false });
}
function registerRoutes(ctx, scope) {
  const root = packageRoot();
  const file = join3(root, "lib", COPY_FILE);
  const fontsDir = join3(root, "lib", "fonts");
  const userFontsDir = () => pluginPath(ctx, "fonts");
  const assetsDir = join3(root, "lib", "assets");
  const { sendFile, sendAsset } = createStaticFiles(ctx, PACKAGE_NAME, assetsDir);
  scope.effect(() => {
    const disposers = [];
    const report = (message, error) => ctx.logger?.warn?.(`${PACKAGE_NAME}: ${message}: ${error?.message ?? String(error)}`);
    const server = scope.webServer;
    if (server === void 0 || server === null) {
      report("web server unavailable", new Error("the host carries no webServer service, so no route of this plugin is registered"));
      return;
    }
    const usage = createUsage(ctx);
    const hdsl = createHdslAccount(ctx);
    const sessionSearch = createSessionSearch(ctx);
    const peakrate = createPeakRate(ctx);
    const prices = createPrices(ctx);
    const sessionCost = createSessionCost(ctx, prices);
    const sessionPanel = createSessionPanel(ctx, sessionCost);
    sessionCost.ensure();
    sessionPanel.ensure();
    const register = (label, route) => {
      try {
        const dispose = server.register(route);
        if (typeof dispose === "function") disposers.push(dispose);
      } catch (error) {
        report(`${label} route unavailable`, error);
      }
    };
    const sendPayload = (res, answer) => {
      void answer.then((value) => {
        sendJson(res, 200, { ok: true, ...value });
      }, (error) => {
        sendJson(res, 500, { ok: false, error: String(error?.message ?? String(error)) });
      });
    };
    const fail = (res, error) => {
      if (res.headersSent) res.destroy();
      else sendJson(res, 500, { ok: false, error: String(error?.message ?? String(error)) });
    };
    const guardedSessionId = (req, res) => {
      if (methodRefused(req, res, ["GET"])) return null;
      if (fenceRefused(ctx, req, res)) return null;
      const sessionId = (new URL(req.url ?? "/", "http://local").searchParams.get("id") ?? "").trim();
      if (SESSION_ID_RE.test(sessionId)) return sessionId;
      sendJson(res, 400, { ok: false, error: "invalid session id" });
      return null;
    };
    register("model copy", {
      kind: "prefix",
      path: ROUTE_PREFIX,
      handler: (req, res) => {
        if (methodRefused(req, res, ["GET", "HEAD"])) return;
        if (fenceRefused(ctx, req, res)) return;
        const sub = new URL(req.url ?? "/", "http://x").pathname.slice(ROUTE_PREFIX.length);
        if (sub === `/${COPY_FILE}`) {
          sendFile(res, req.method ?? "GET", file, {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-cache"
          });
          return;
        }
        if (sub === WEBFONTS_SUB) {
          const faces = OPTIONAL_WEBFONTS.filter((face) => existsSync2(join3(userFontsDir(), face.file))).map((face) => face.file);
          sendJson(res, 200, { ok: true, faces });
          return;
        }
        const font = sub.startsWith("/fonts/") ? FONT_FILES[sub.slice("/fonts/".length)] : void 0;
        if (font !== void 0) {
          const name = sub.slice("/fonts/".length);
          const dropped = join3(userFontsDir(), name);
          sendFile(res, req.method ?? "GET", existsSync2(dropped) ? dropped : join3(fontsDir, name), {
            "content-type": font,
            "cache-control": "public, max-age=86400"
          });
          return;
        }
        const sheet = sub.startsWith("/assets/") ? sub.slice("/assets/".length) : "";
        if (sheet !== "" && !sheet.includes("/")) {
          if (!sendAsset(req, res, sheet)) {
            res.writeHead(404);
            res.end();
          }
          return;
        }
        res.writeHead(404);
        res.end();
      }
    });
    register("username", {
      kind: "exact",
      path: USERNAME_PATH,
      handler: (req, res) => {
        if (methodRefused(req, res, ["GET", "HEAD"])) return;
        if (fenceRefused(ctx, req, res)) return;
        const username = userInfo().username || "";
        const body = Buffer.from(JSON.stringify({ ok: true, username }));
        res.writeHead(200, {
          "content-type": "application/json; charset=utf-8",
          "content-length": String(body.byteLength),
          "cache-control": "no-cache"
        });
        res.end(req.method === "HEAD" ? void 0 : body);
      }
    });
    register("sound", {
      kind: "exact",
      path: SOUND_PATH,
      handler: (req, res) => {
        if (methodRefused(req, res, ["GET", "POST"])) return;
        if (fenceRefused(ctx, req, res)) return;
        if (req.method !== "POST") {
          sendJson(res, 200, soundCapability());
          return;
        }
        void playSoundRequest(req, res).catch((error) => fail(res, error));
      }
    });
    register("HDSL account", {
      kind: "exact",
      path: HDSL_PATH,
      handler: (req, res) => {
        if (methodRefused(req, res, ["GET", "HEAD"])) return;
        if (fenceRefused(ctx, req, res)) return;
        sendPayload(res, hdsl.read().then((profile) => {
          const { skinFile, ...account } = profile;
          return account;
        }));
      }
    });
    register("HDSL skin", {
      kind: "exact",
      path: HDSL_SKIN_PATH,
      handler: (req, res) => {
        if (methodRefused(req, res, ["GET", "HEAD"])) return;
        if (fenceRefused(ctx, req, res)) return;
        return hdsl.read().then((profile) => {
          if (typeof profile.skinFile !== "string" || !existsSync2(profile.skinFile)) {
            res.writeHead(404, { "cache-control": "no-store" });
            res.end();
            return;
          }
          const body = readFileSync2(profile.skinFile);
          res.writeHead(200, {
            "content-type": "image/png",
            "content-length": String(body.byteLength),
            "cache-control": "no-cache"
          });
          res.end(req.method === "HEAD" ? void 0 : body);
        });
      }
    });
    register("session delete", {
      kind: "exact",
      path: SESSION_DELETE_PATH,
      handler: (req, res) => {
        if (methodRefused(req, res, ["POST"])) return;
        void deleteSession(ctx, req, res).catch((error) => fail(res, error));
      }
    });
    register("usage", {
      kind: "exact",
      path: USAGE_PATH,
      handler: (req, res) => {
        if (methodRefused(req, res, ["GET", "HEAD"])) return;
        if (fenceRefused(ctx, req, res)) return;
        const params = new URL(req.url ?? "/", "http://local").searchParams;
        const requested = params.get("scope");
        const scope2 = requested === HOME_SESSION_SCOPE_ACTIVE || requested === HOME_SESSION_SCOPE_WORKSPACE ? requested : HOME_SESSION_SCOPE_ALL;
        const workspaceId = scope2 === HOME_SESSION_SCOPE_WORKSPACE ? (params.get("workspace") ?? "").trim().slice(0, 128) : "";
        void usage.refresh(scope2, workspaceId);
        const snapshot = usage.snapshot(scope2, workspaceId);
        sendJson(res, 200, {
          ok: true,
          value: snapshot.value,
          computing: snapshot.computing === true,
          ...snapshot.error === void 0 ? {} : { error: snapshot.error }
        });
      }
    });
    register("session search", {
      kind: "exact",
      path: SESSION_SEARCH_PATH,
      handler: (req, res) => {
        if (methodRefused(req, res, ["GET"])) return;
        if (fenceRefused(ctx, req, res)) return;
        const query = (new URL(req.url ?? "/", "http://local").searchParams.get("q") ?? "").trim().slice(0, QUERY_MAX);
        const answer = query === "" ? sessionSearch.warm().then(() => ({ sessions: [] })) : sessionSearch.search(query);
        sendPayload(res, answer);
      }
    });
    register("peak rate", {
      kind: "exact",
      path: PEAKRATE_PATH,
      handler: (req, res) => {
        if (methodRefused(req, res, ["GET", "POST"])) return;
        if (fenceRefused(ctx, req, res)) return;
        peakrate.ensure();
        const answer = req.method === "POST" ? peakrate.refresh().then(() => peakrate.payload()) : Promise.resolve(peakrate.payload());
        sendPayload(res, answer);
      }
    });
    register("prices", {
      kind: "exact",
      path: PRICES_PATH,
      handler: (req, res) => {
        if (methodRefused(req, res, ["GET", "POST"])) return;
        if (fenceRefused(ctx, req, res)) return;
        prices.ensure();
        const answer = req.method === "POST" ? prices.refresh().then(() => prices.payload()) : Promise.resolve(prices.payload());
        sendPayload(res, answer);
      }
    });
    register("session cost", {
      kind: "exact",
      path: SESSION_COST_PATH,
      handler: (req, res) => {
        const sessionId = guardedSessionId(req, res);
        if (sessionId === null) return;
        const billing = readBillingRows(new URL(req.url ?? "/", "http://local").searchParams);
        sendPayload(res, sessionCost.get(sessionId, billing).then((value) => ({ value })));
      }
    });
    register("session panel", {
      kind: "exact",
      path: SESSION_PANEL_PATH,
      handler: (req, res) => {
        const sessionId = guardedSessionId(req, res);
        if (sessionId === null) return;
        const params = new URL(req.url ?? "/", "http://local").searchParams;
        const jobId = (params.get("job") ?? "").trim();
        if (jobId !== "") {
          if (!JOB_ID_RE.test(jobId)) {
            sendJson(res, 400, { ok: false, error: "invalid job id" });
            return;
          }
          sendPayload(res, Promise.resolve({ value: sessionPanel.jobOutput(sessionId, jobId) }));
          return;
        }
        sendPayload(res, sessionPanel.get(sessionId, readBillingRows(params), params.get("live") === "1").then((value) => ({ value })));
      }
    });
    for (const { label, route } of brandRoutes(ctx)) register(label, route);
    return () => {
      usage.dispose();
      peakrate.dispose();
      prices.dispose();
      sessionCost.dispose();
      sessionSearch.dispose();
      sessionPanel.dispose();
      for (const dispose of disposers) {
        try {
          dispose();
        } catch (error) {
          report("route disposal failed", error);
        }
      }
    };
  }, `${PACKAGE_NAME}: host routes`);
}
export {
  registerRoutes
};
