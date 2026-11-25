// packages/contracts/src/package.ts
var PACKAGE_NAME = "dsh-claude-style";

// packages/contracts/src/routes.ts
var ROUTE_ROOT = "/dsh-claude-style";
function deployRootOf(documentBase) {
  return new URL(".", documentBase).href;
}
var DOCUMENT_BASE = globalThis.document?.baseURI;
var DEPLOY_ROOT = typeof DOCUMENT_BASE === "string" ? deployRootOf(DOCUMENT_BASE) : null;
function routePrefixUnder(deployRoot) {
  return deployRoot === null ? ROUTE_ROOT : new URL(ROUTE_ROOT.slice(1), deployRoot).pathname;
}
var ROUTE_PREFIX = routePrefixUnder(DEPLOY_ROOT);
var USERNAME_PATH = `${ROUTE_PREFIX}/username`;
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
var SESSION_REVISIONS_PATH = `${ROUTE_PREFIX}/session-revisions`;
var SESSION_REWIND_PLAN_PATH = `${ROUTE_PREFIX}/session-rewind-plan`;
var SESSION_REWIND_COMMIT_PATH = `${ROUTE_PREFIX}/session-rewind-commit`;

// packages/contracts/src/webfonts.ts
var OPTIONAL_WEBFONTS = [
  { family: "Anthropic Sans Web Text", file: "AnthropicSansWebText.ttf", label: "Anthropic Sans", stack: ["Anthropic Sans Web Text", "Anthropic Sans"] },
  { family: "Anthropic Serif Web Text", file: "AnthropicSerifWebText.ttf", label: "Anthropic Serif", stack: ["Anthropic Serif Web Text", "Anthropic Serif"] },
  { family: "Anthropic Mono Web", file: "AnthropicMonoWeb.ttf", label: "Anthropic Mono", stack: ["Anthropic Mono Web", "Anthropic Mono Variable", "Anthropic Mono"] }
];

// packages/host/src/routes.ts
import { existsSync as existsSync2, readdirSync, realpathSync, rmSync, statSync } from "node:fs";
import { userInfo } from "node:os";
import { join as join3, resolve, sep } from "node:path";
import { brandRoutes } from "./brand.js";
import { appearanceOverlayRoutes } from "./appearance-overlays.js";

// packages/engine/node/harness-home.ts
import { homedir } from "node:os";
import { join } from "node:path";
function harnessPath(ctx, ...segments) {
  const resolvePath = ctx.get("dshHomePath");
  if (typeof resolvePath === "function") return resolvePath(...segments);
  return join(process.env.DSH_HOME ?? join(homedir(), ".dsh"), ...segments);
}

// packages/host/src/routes.ts
import { packageRoot, pluginPath } from "./paths.js";

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
import { createPeakRate } from "./peakrate.js";
import { createPrices } from "./prices.js";
import { QUERY_MAX, createSessionSearch } from "./search.js";
import { billingRowsOf, createSessionCost } from "./session-cost.js";
import { createSessionPanel } from "./session-panel.js";
import { compactSession } from "./session-compact.js";
import { SESSION_ID_RE, sessionDirectoryName } from "./session-name.js";
import { createUsage } from "./usage.js";
import { SessionRewind } from "./session-rewind.js";
import { sessionRewindRoutes } from "./session-rewind-routes.js";

// packages/contracts/src/services.ts
var OFFICIAL_MODEL_GROUP = "deepseek-official";

// packages/contracts/src/palette-schemes.ts
var PALETTE_SCHEME_LIMIT = 16;
var PALETTE_SCHEME_ENTRY_MAX = 400;
var PALETTE_SCHEME_ID_MAX = 24;
var PALETTE_SCHEME_FOLLOW = "brand";

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
var BRANDING_PRESET_ID_MAX = 40;
var BRAND_INK_ORIGINAL = "original";
var BRAND_INK_ACCENT = "accent";
var BRAND_INK_TEXT = "text";
var BRAND_INKS = [BRAND_INK_ORIGINAL, BRAND_INK_ACCENT, BRAND_INK_TEXT];
var BRANDING_VENDORS = ["openai", "gemini", "qwen", "kimicode", "zcode", "minimax", "grok", "xiaomimimo"];
var VENDOR_PREFIX = "vendor-";
var BRANDING_VENDOR_IDS = BRANDING_VENDORS.map((brand) => VENDOR_PREFIX + brand);

// packages/contracts/src/context-ramp.ts
var CONTEXT_RAMP_ENTRY_MAX = 120;
var CONTEXT_RAMP_MODE_DEFAULT = "default";
var CONTEXT_RAMP_MODE_CLASSIC = "classic";
var CONTEXT_RAMP_MODE_CUSTOM = "custom";
var CONTEXT_RAMP_MODES = [
  CONTEXT_RAMP_MODE_DEFAULT,
  CONTEXT_RAMP_MODE_CLASSIC,
  CONTEXT_RAMP_MODE_CUSTOM
];

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

// packages/contracts/src/typeface.ts
var FONT_ROLE_PROSE = "prose";
var FONT_ROLE_UI = "ui";
var FONT_ROLE_CODE = "code";
var FONT_STACK_MAX = 12;
var FONT_NAME_MAX = 64;
var FONT_PREF_KEYS = {
  [FONT_ROLE_PROSE]: "fontProse",
  [FONT_ROLE_UI]: "fontUi",
  [FONT_ROLE_CODE]: "fontCode"
};
var FONT_PRESET_BASE = {
  claude: {
    [FONT_ROLE_PROSE]: "'Anthropic Serif Web Text','Anthropic Serif','Claude Style Noto Serif','Claude Style Symbols','Noto Sans SC','Source Han Sans SC','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif",
    [FONT_ROLE_UI]: "'Anthropic Sans Web Text','Anthropic Sans','Claude Style Inter','Claude Style Symbols','Noto Sans SC','Source Han Sans SC',-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Helvetica Neue',Helvetica,Arial,sans-serif",
    [FONT_ROLE_CODE]: "'Anthropic Mono Web','Anthropic Mono Variable','Anthropic Mono','JetBrains Mono','Noto Sans SC','Source Han Sans SC','PingFang SC','Hiragino Sans GB','Microsoft YaHei',ui-monospace,'SF Mono','Fira Code',Consolas,'Liberation Mono',Menlo,Courier,monospace"
  },
  system: {
    [FONT_ROLE_PROSE]: "ui-sans-serif,system-ui,sans-serif",
    [FONT_ROLE_UI]: "ui-sans-serif,system-ui,sans-serif",
    [FONT_ROLE_CODE]: "'JetBrains Mono',ui-monospace,'SF Mono','Fira Code',Consolas,'Liberation Mono',Menlo,Courier,monospace,'Noto Sans SC','Source Han Sans SC','PingFang SC','Microsoft YaHei'"
  }
};
var FONT_PRESET_PRIMARY_LABEL = {
  claude: {
    [FONT_ROLE_PROSE]: "Anthropic Serif",
    [FONT_ROLE_UI]: "Anthropic Sans",
    [FONT_ROLE_CODE]: "Anthropic Mono"
  },
  system: {
    [FONT_ROLE_PROSE]: "System UI",
    [FONT_ROLE_UI]: "System UI",
    [FONT_ROLE_CODE]: "JetBrains Mono"
  }
};
var FONT_RECOMMENDATIONS = {
  [FONT_ROLE_PROSE]: [
    "Anthropic Serif",
    "Claude Style Noto Serif",
    "Anthropic Sans",
    "Claude Style Inter",
    "LXGW WenKai",
    "Noto Serif SC",
    "Source Han Serif SC",
    "Songti SC",
    "Noto Sans SC",
    "Source Han Sans SC",
    "PingFang SC",
    "Microsoft YaHei",
    "Georgia",
    "serif",
    "sans-serif"
  ],
  [FONT_ROLE_UI]: [
    "Anthropic Sans",
    "Claude Style Inter",
    "Anthropic Serif",
    "Claude Style Noto Serif",
    "PingFang SC",
    "Noto Sans SC",
    "Source Han Sans SC",
    "Microsoft YaHei",
    "SF Pro",
    "Segoe UI",
    "Inter",
    "system-ui",
    "ui-sans-serif",
    "sans-serif"
  ],
  [FONT_ROLE_CODE]: [
    "Anthropic Mono",
    "JetBrains Mono",
    "SF Mono",
    "Fira Code",
    "Cascadia Code",
    "Maple Mono",
    "Consolas",
    "Menlo",
    "Monaco",
    "ui-monospace",
    "monospace"
  ]
};

// packages/contracts/src/prefs.ts
var BILLING_OFF = "off";
var BILLING_CHOICES = [BILLING_OFF, ...CURRENCIES];
var BRAND_CLAUDE = "claude";
var BRAND_DEEPSEEK = "deepseek";
var BRAND_DEEPSEEK_LEGACY = "off";
var BRANDS = [BRAND_CLAUDE, BRAND_DEEPSEEK];
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
var STATS_POSITION_OFF = "off";
var STATS_POSITION_FOOTER = "footer";
var STATS_POSITION_INLINE = "inline";
var STATS_POSITION_CONTEXT_LEGACY = "context";
var STATS_POSITION_RAIL_LEGACY = "rail";
var STATS_POSITIONS = [STATS_POSITION_OFF, STATS_POSITION_FOOTER, STATS_POSITION_INLINE];
var STATS_FOOTER_ALIGNS = ["left", "center", "right"];
var FOOTER_TOKEN_DIGITS = "digits";
var FOOTER_TOKEN_UNITS = "units";
var FOOTER_TOKEN_FORMATS = [FOOTER_TOKEN_DIGITS, FOOTER_TOKEN_UNITS];
var CONTEXT_DISPLAY_PIE = "pie";
var CONTEXT_DISPLAY_RING = "ring";
var CONTEXT_DISPLAY_RING_RAMP_LEGACY = "ring-ramp";
var CONTEXT_DISPLAY_RING_BAND_LEGACY = "ring-band";
var CONTEXT_DISPLAYS = [CONTEXT_DISPLAY_PIE, CONTEXT_DISPLAY_RING];
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
var PRICE_ROWS_MAX = 32;
var REWIND_STORAGE_LIMIT_256MB = "256mb";
var REWIND_STORAGE_LIMIT_512MB = "512mb";
var REWIND_STORAGE_LIMIT_1GB = "1gb";
var REWIND_STORAGE_LIMIT_2GB = "2gb";
var REWIND_STORAGE_LIMITS = [
  REWIND_STORAGE_LIMIT_256MB,
  REWIND_STORAGE_LIMIT_512MB,
  REWIND_STORAGE_LIMIT_1GB,
  REWIND_STORAGE_LIMIT_2GB
];
var REWIND_STORAGE_DIR_MAX = 512;
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
  /** The legacy word `simple` is off. */
  statusDetail: { type: "boolean", default: true, legacy: { simple: false } },
  collapseFooter: { type: "boolean", default: true },
  /** The legacy boolean `false` maps to no popover. */
  autoPopover: { type: "choice", values: AUTO_POPOVER_SCOPES, default: AUTO_POPOVER_ALL, legacy: { false: AUTO_POPOVER_OFF } },
  composerScope: { type: "choice", values: COMPOSER_SCOPES, default: COMPOSER_SCOPE_ALL },
  /** Render a sanitized live Markdown preview below the composer draft. */
  composerMarkdown: { type: "boolean", default: false },
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
  /** Prioritized custom font families prepended to each typography role; empty follows `typeface`. */
  fontProse: { type: "list", default: [], max: FONT_STACK_MAX, entryMax: FONT_NAME_MAX, drop: [] },
  fontUi: { type: "list", default: [], max: FONT_STACK_MAX, entryMax: FONT_NAME_MAX, drop: [] },
  fontCode: { type: "list", default: [], max: FONT_STACK_MAX, entryMax: FONT_NAME_MAX, drop: [] },
  composerBottomGap: { type: "choice", values: COMPOSER_GAPS, default: COMPOSER_GAP_THEME },
  /** The mascot on the composer; the resolved one rides the document. */
  mascot: { type: "choice", values: MASCOTS, default: MASCOT_BRAND },
  mascotScope: { type: "choice", values: MASCOT_SCOPES, default: MASCOT_SCOPE_ALL },
  permissionsControl: { type: "boolean", default: true },
  statsPosition: {
    type: "choice",
    values: STATS_POSITIONS,
    default: STATS_POSITION_OFF,
    legacy: {
      [STATS_POSITION_CONTEXT_LEGACY]: STATS_POSITION_OFF,
      [STATS_POSITION_RAIL_LEGACY]: STATS_POSITION_INLINE
    }
  },
  /** The face the context meter is drawn with (CONTEXT_DISPLAYS). */
  contextDisplay: {
    type: "choice",
    values: CONTEXT_DISPLAYS,
    default: CONTEXT_DISPLAY_PIE,
    legacy: {
      [CONTEXT_DISPLAY_RING_RAMP_LEGACY]: CONTEXT_DISPLAY_RING,
      [CONTEXT_DISPLAY_RING_BAND_LEGACY]: CONTEXT_DISPLAY_RING
    }
  },
  /** Which colour ramp maps context occupancy: default green-to-red, classic blue-yellow-red, or custom stops. */
  contextRampMode: { type: "choice", values: CONTEXT_RAMP_MODES, default: CONTEXT_RAMP_MODE_DEFAULT },
  /** Custom `percent:#rrggbb` stops used while `contextRampMode` is `custom`. */
  contextRamp: { type: "text", default: "", max: CONTEXT_RAMP_ENTRY_MAX },
  /** Whether the percentage stands beside that face. */
  contextNumbers: { type: "boolean", default: true },
  statsFooterAlign: { type: "choice", values: STATS_FOOTER_ALIGNS, default: "center" },
  /** Session-level figures shown on the composer statistics bar across both placements (D113). */
  statsFooterCounts: { type: "boolean", default: false },
  statsFooterSpeed: { type: "boolean", default: false },
  statsFooterTtft: { type: "boolean", default: false },
  statsFooterCache: { type: "boolean", default: true },
  statsFooterCost: { type: "boolean", default: true },
  statsFooterTotal: { type: "boolean", default: true },
  /** How the statistics bar, context popover and session panel write token figures (D113). */
  statsFooterTokenFormat: { type: "choice", values: FOOTER_TOKEN_FORMATS, default: FOOTER_TOKEN_UNITS },
  /** Which official price table the session's cost follows, or off for no figure at all. */
  billingCurrency: { type: "choice", values: BILLING_CHOICES, default: CURRENCY_CNY },
  /** Custom `model|input|cacheRead|output` rows per million tokens; blank buckets inherit official rates. */
  billingTable: { type: "list", default: [], max: PRICE_ROWS_MAX, entryMax: 256, drop: [] },
  workspaceView: { type: "boolean", default: true },
  sidebarSearch: { type: "boolean", default: true },
  searchStyle: { type: "choice", values: SEARCH_STYLES, default: SEARCH_STYLE_STANDALONE },
  /** Whether resting the pointer on the collapsed sidebar's toggle or the window's left edge opens the sidebar over the page. */
  sidebarPeek: { type: "boolean", default: true },
  /** Whether the panel list carries the More menu's hidden entries and its Edit sidebar dialog. */
  sidebarEntries: { type: "boolean", default: true },
  /** The panel ids that dialog took off the list; they stay reachable from More. */
  sidebarHidden: { type: "list", default: [], max: SIDEBAR_HIDDEN_MAX, entryMax: PANEL_ID_MAX, drop: [PLUGINS_PANEL_ID] },
  sidebarLayout: { type: "choice", values: SIDEBAR_LAYOUTS, default: SIDEBAR_LAYOUT_RELAXED },
  ongoingIndicator: { type: "choice", values: ONGOING_INDICATORS, default: ONGOING_INDICATOR_BREATHE },
  /** Leading uses the host slot; trailing leaves that slot available for third-party marks. */
  ongoingIndicatorSide: { type: "choice", values: ONGOING_SIDES, default: ONGOING_SIDE_LEFT },
  /** Whether a message the reader sent carries edit and retract beside its copy button (features/message-actions); default off. */
  messageActions: { type: "boolean", default: false },
  /** Whether the host records workspace checkpoints for code restoration alongside message rewind. */
  rewindCheckpoints: { type: "boolean", default: true },
  /** Maximum total disk budget kept for workspace rewind objects and file captures. */
  rewindStorageLimit: { type: "choice", values: REWIND_STORAGE_LIMITS, default: REWIND_STORAGE_LIMIT_512MB },
  /** Optional absolute directory for workspace rewind objects and captures; blank uses the plugin home. */
  rewindStorageDir: { type: "text", default: "", max: REWIND_STORAGE_DIR_MAX },
  viewTabs: { type: "boolean", default: true },
  hideToolbarOutsideConversation: { type: "boolean", default: true },
  headerBand: { type: "boolean", default: true },
  /** Whether the skin's sections join the host's session panel (D113). */
  sessionPanel: { type: "boolean", default: true },
  /** The legacy choice `off` means off. */
  chatAnimations: { type: "boolean", default: true, legacy: { [CHAT_ANIMATIONS_OFF]: false } },
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
  soundCues: { type: "choice", values: SOUND_LEVELS, default: SOUND_LEVEL_OFF },
  /** Background system notifications; the reader grants permission from the settings switch. */
  systemNotifications: { type: "boolean", default: false }
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
async function deleteSession(ctx, req, res, peer) {
  const refused = refusalOf(ctx, req, peer);
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
function registerRoutes(ctx, scope, config, sharedUsage) {
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
    const ownsUsage = sharedUsage === void 0;
    const usage = sharedUsage ?? createUsage(ctx);
    const sessionSearch = createSessionSearch(ctx);
    const peakrate = createPeakRate(ctx);
    const prices = createPrices(ctx);
    const sessionCost = createSessionCost(ctx, prices);
    const sessionPanel = createSessionPanel(ctx, sessionCost);
    const sessionRewind = new SessionRewind(ctx, config);
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
    const registerGuarded = (label, kind, path, methods, handle) => {
      register(label, {
        kind,
        path,
        handler: (req, res, peer) => {
          if (methodRefused(req, res, methods)) return;
          if (fenceRefused(ctx, req, res, peer)) return;
          return handle(req, res);
        }
      });
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
    const guardedSessionId = (req, res, peer, method = "GET") => {
      if (methodRefused(req, res, [method])) return null;
      if (fenceRefused(ctx, req, res, peer)) return null;
      const sessionId = (new URL(req.url ?? "/", "http://local").searchParams.get("id") ?? "").trim();
      if (SESSION_ID_RE.test(sessionId)) return sessionId;
      sendJson(res, 400, { ok: false, error: "invalid session id" });
      return null;
    };
    registerGuarded("model copy", "prefix", ROUTE_PREFIX, ["GET", "HEAD"], (req, res) => {
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
    });
    registerGuarded("username", "exact", USERNAME_PATH, ["GET", "HEAD"], (req, res) => {
      const username = userInfo().username || "";
      const body = Buffer.from(JSON.stringify({ ok: true, username }));
      res.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "content-length": String(body.byteLength),
        "cache-control": "no-cache"
      });
      res.end(req.method === "HEAD" ? void 0 : body);
    });
    registerGuarded("sound", "exact", SOUND_PATH, ["GET", "POST"], (req, res) => {
      if (req.method !== "POST") {
        sendJson(res, 200, soundCapability());
        return;
      }
      void playSoundRequest(req, res).catch((error) => fail(res, error));
    });
    register("session delete", {
      kind: "exact",
      path: SESSION_DELETE_PATH,
      handler: (req, res, peer) => {
        if (methodRefused(req, res, ["POST"])) return;
        void deleteSession(ctx, req, res, peer).catch((error) => fail(res, error));
      }
    });
    registerGuarded("usage", "exact", USAGE_PATH, ["GET", "HEAD"], (req, res) => {
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
    });
    registerGuarded("session search", "exact", SESSION_SEARCH_PATH, ["GET"], (req, res) => {
      const query = (new URL(req.url ?? "/", "http://local").searchParams.get("q") ?? "").trim().slice(0, QUERY_MAX);
      const answer = query === "" ? sessionSearch.warm().then(() => ({ sessions: [] })) : sessionSearch.search(query);
      sendPayload(res, answer);
    });
    registerGuarded("peak rate", "exact", PEAKRATE_PATH, ["GET", "POST"], (req, res) => {
      peakrate.ensure();
      const answer = req.method === "POST" ? peakrate.refresh().then(() => peakrate.payload()) : Promise.resolve(peakrate.payload());
      sendPayload(res, answer);
    });
    registerGuarded("prices", "exact", PRICES_PATH, ["GET", "POST"], (req, res) => {
      prices.ensure();
      const answer = req.method === "POST" ? prices.refresh().then(() => prices.payload()) : Promise.resolve(prices.payload());
      sendPayload(res, answer);
    });
    register("session cost", {
      kind: "exact",
      path: SESSION_COST_PATH,
      handler: (req, res, peer) => {
        const sessionId = guardedSessionId(req, res, peer);
        if (sessionId === null) return;
        const billing = readBillingRows(new URL(req.url ?? "/", "http://local").searchParams);
        sendPayload(res, sessionCost.get(sessionId, billing).then((value) => ({ value })));
      }
    });
    register("session panel", {
      kind: "exact",
      path: SESSION_PANEL_PATH,
      handler: (req, res, peer) => {
        const sessionId = guardedSessionId(req, res, peer);
        if (sessionId === null) return;
        const params = new URL(req.url ?? "/", "http://local").searchParams;
        sendPayload(res, sessionPanel.get(sessionId, readBillingRows(params), params.get("live") === "1").then((value) => ({ value })));
      }
    });
    register("session compact", {
      kind: "exact",
      path: SESSION_COMPACT_PATH,
      handler: (req, res, peer) => {
        const sessionId = guardedSessionId(req, res, peer, "POST");
        if (sessionId === null) return;
        void compactSession(ctx, sessionId).then(
          (answer) => sendJson(res, 200, answer),
          (error) => fail(res, error)
        );
      }
    });
    for (const { label, route } of sessionRewindRoutes(ctx, sessionRewind)) register(label, route);
    for (const { label, route } of brandRoutes(ctx)) register(label, route);
    const appearanceOverlays = appearanceOverlayRoutes(ctx);
    register(appearanceOverlays.label, appearanceOverlays.route);
    return () => {
      if (ownsUsage) usage.dispose();
      peakrate.dispose();
      prices.dispose();
      sessionCost.dispose();
      sessionSearch.dispose();
      sessionPanel.dispose();
      sessionRewind.dispose();
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
