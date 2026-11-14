// packages/contracts/src/package.ts
var PACKAGE_NAME = "dsh-claude-style";

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
var BRAND_DEFAULT_PRESETS = { [BRAND_CLAUDE]: "claude", [BRAND_DEEPSEEK]: "deepseek" };
var PALETTE_COLORING_BRAND = PALETTE_SCHEME_FOLLOW;
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
  /** The selected scheme's id, or `brand` to follow the theme style; an id no scheme carries reads as `brand`. */
  paletteColors: { type: "text", default: PALETTE_COLORING_BRAND, max: PALETTE_SCHEME_ID_MAX },
  /** The schemes' records (palette-schemes.ts): the reader's own and the presets' overrides. */
  paletteSchemes: { type: "list", default: [], max: PALETTE_SCHEME_LIMIT, entryMax: PALETTE_SCHEME_ENTRY_MAX, drop: [] },
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
  /** Whether the conversation offers its own session details rail (D94). */
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

// packages/host/src/usage.ts
import { join as join2, resolve } from "node:path";

// packages/engine/node/harness-home.ts
import { homedir } from "node:os";
import { join } from "node:path";
function harnessPath(ctx, ...segments) {
  const resolvePath = ctx.get("dshHomePath");
  if (typeof resolvePath === "function") return resolvePath(...segments);
  return join(process.env.DSH_HOME ?? join(homedir(), ".dsh"), ...segments);
}

// packages/host/src/usage.ts
import { readRecord, writeRecord } from "./usage-record.js";

// packages/engine/node/session-events.ts
function eventsOf(events) {
  return Array.isArray(events) ? events : null;
}
function unreadableLog(error) {
  const failure = error;
  return failure?.code === "SESSION_QUERY_CORRUPT_SESSION" || failure?.code === "SESSION_QUERY_SESSION_NOT_FOUND" ? failure : null;
}
function reportUnreadable(ctx, packageName, error, sessionId, label) {
  ctx.logger?.warn?.(`${packageName}: session ${sessionId} left out of ${label}: ${unreadableLog(error)?.message}`);
}
function releaseObservation(observation) {
  const named = observation.dispose;
  if (typeof named === "function") named.call(observation);
  else if (Symbol.dispose in observation) observation[Symbol.dispose]();
}
async function readEvents(ctx, packageName, sessionId, label) {
  const query = ctx.get("sessionQuery");
  if (query === null || query === void 0) return null;
  try {
    if (typeof query.observeSession === "function") {
      const observation = await query.observeSession(sessionId, { projectionMode: "none" });
      try {
        return eventsOf(observation.events);
      } finally {
        releaseObservation(observation);
      }
    }
    if (typeof query.readSession !== "function") return null;
    const snapshot = await query.readSession(sessionId);
    return eventsOf(snapshot?.events);
  } catch (error) {
    if (unreadableLog(error) === null) throw error;
    reportUnreadable(ctx, packageName, error, sessionId, label);
    return null;
  }
}

// packages/host/src/usage.ts
import { foldSession, listSessionLogs } from "./usage-fold.js";
import { readLedger } from "./usage-ledger.js";
import { mergeLedgerFold, summarize } from "./usage-summary.js";
var LEDGER_SOURCE = "cost-meter";
var LOCAL_SOURCE = "local";
var USAGE_TTL_MS = 30 * 1e3;
var SLOW_PASS_FACTOR = 2;
function recheckDelay(durationMs) {
  return Math.max(USAGE_TTL_MS, durationMs * SLOW_PASS_FACTOR);
}
function messageOf(error) {
  return String(error?.message ?? error);
}
function hoursOf(days) {
  const hours = new Array(24).fill(0);
  for (const buckets of days.values()) {
    if (buckets.hours === void 0) continue;
    for (let hour = 0; hour < 24; hour += 1) hours[hour] += Number(buckets.hours[hour]) || 0;
  }
  return hours;
}
function recordChanged(stored, sessions, read) {
  if (read > 0 || stored.size !== sessions.size) return true;
  for (const [id, entry] of sessions) {
    const held = stored.get(id);
    if (held === void 0 || held.days.size !== entry.days.size) return true;
    if (held.fingerprint !== void 0 !== (entry.fingerprint !== void 0)) return true;
  }
  return false;
}
function filterSessionIds(days, excluded) {
  return new Map([...days].map(([date, buckets]) => {
    if (buckets.sessionIds === void 0) return [date, buckets];
    const sessionIds = buckets.sessionIds.filter((id) => !excluded.has(id));
    return [date, { ...buckets, sessions: sessionIds.length, sessionIds }];
  }));
}
function createUsage(ctx) {
  const home = () => harnessPath(ctx);
  const slots = /* @__PURE__ */ new Map();
  let disposed = false;
  function slotFor(scope, workspaceId) {
    const key = scope === HOME_SESSION_SCOPE_WORKSPACE ? `${scope}:${workspaceId}` : scope;
    let slot = slots.get(key);
    if (slot === void 0) {
      slot = { state: null, pending: null, nextAt: 0 };
      slots.set(key, slot);
    }
    return slot;
  }
  async function computeLocal(logs, ledgerDays, allowed, excluded, scope) {
    const record = readRecord(ctx);
    const sessions = /* @__PURE__ */ new Map();
    let read = 0;
    let failed = 0;
    let firstFailure = null;
    for (const log of logs) {
      const stored = record.sessions.get(log.storedName);
      const fingerprint = stored?.fingerprint;
      if (stored !== void 0 && fingerprint !== void 0 && fingerprint.size === log.size && fingerprint.mtimeMs === log.mtimeMs) {
        sessions.set(log.storedName, stored);
        continue;
      }
      let events;
      try {
        events = await readEvents(ctx, PACKAGE_NAME, log.id, "the usage roll-up");
      } catch (error) {
        failed += 1;
        firstFailure = firstFailure ?? `${log.id}: ${messageOf(error)}`;
        if (stored !== void 0) sessions.set(log.storedName, stored);
        continue;
      }
      if (events === null) {
        failed += 1;
        if (stored !== void 0) sessions.set(log.storedName, stored);
        continue;
      }
      sessions.set(log.storedName, { fingerprint: { size: log.size, mtimeMs: log.mtimeMs }, days: foldSession(events).days });
      read += 1;
    }
    if (firstFailure !== null) {
      ctx.logger?.warn?.(`${PACKAGE_NAME}: ${failed} session log(s) left out of the usage roll-up; the rest are recorded (first: ${firstFailure})`);
    }
    for (const [id, stored] of record.sessions) {
      if (!sessions.has(id) && stored.days.size > 0) sessions.set(id, { days: stored.days });
    }
    const recorded = !disposed && record.writable && (record.mustWrite || recordChanged(record.sessions, sessions, read)) ? writeRecord(ctx, sessions, new Set(logs.map((log) => log.storedName))) : sessions;
    const account = allowed === null ? recorded : new Map([...recorded].filter(([id]) => allowed.has(id)));
    const scopedLedger = scope === HOME_SESSION_SCOPE_ALL ? ledgerDays : null;
    const merge = mergeLedgerFold(scopedLedger, account);
    const source = scopedLedger === null ? LOCAL_SOURCE : merge.folded ? `${LEDGER_SOURCE}+${LOCAL_SOURCE}` : LEDGER_SOURCE;
    const scopedIds = new Set([...merge.sessionIds].filter((id) => !excluded.has(id)));
    const scopedDays = filterSessionIds(merge.days, excluded);
    const summary = summarize(
      scopedDays,
      scopedIds.size,
      source,
      scopedDays.size === 0 ? void 0 : hoursOf(scopedDays),
      { sessionIds: scopedIds }
    );
    const shaped = allowed === null ? summary : { ...summary, totals: { ...summary.totals, sessions: allowed.size } };
    const totalSessions = Number(shaped.totals.sessions) || 0;
    if (sessions.size === 0 && failed > 0) {
      return { ...shaped, scope, totalSessions, unavailable: true, reason: "session-query-unavailable" };
    }
    return { ...shaped, scope, totalSessions, read, failed, sessions: logs.length };
  }
  async function compute(publish, scope, workspaceId) {
    const root = resolve(join2(home(), "sessions"));
    const logs = await listSessionLogs(root);
    const ledgerDays = readLedger(home(), ctx.logger);
    const persistence = ctx.get("sessionPersistence");
    const stored = persistence === null || persistence === void 0 ? [] : await persistence.list();
    const originById = new Map(stored.map((entry) => [entry.header.id, entry.header.origin]));
    const excluded = /* @__PURE__ */ new Set();
    for (const entry of stored) if (entry.header.origin === "subagent") excluded.add(entry.header.id);
    const mainLogs = logs.filter((log) => {
      if (originById.get(log.id) !== "subagent") return true;
      excluded.add(log.storedName);
      return false;
    });
    let allowed = null;
    if (scope !== HOME_SESSION_SCOPE_ALL) {
      const registry = ctx.get("workspaceRegistry");
      const archived = new Set(registry?.archivedSessionIds ?? []);
      let selected = mainLogs.filter((log) => log.storedName !== "" && !archived.has(log.id));
      if (scope === HOME_SESSION_SCOPE_WORKSPACE) {
        const workspace = registry?.list().find((entry) => entry.id === workspaceId);
        const members = new Set(workspace?.sessionIds ?? []);
        selected = selected.filter((log) => members.has(log.id));
      }
      allowed = new Set(selected.map((log) => log.storedName));
    }
    if (scope === HOME_SESSION_SCOPE_ALL && ledgerDays !== null && ledgerDays.size > 0) {
      const sessionIds = /* @__PURE__ */ new Set();
      for (const buckets of ledgerDays.values()) {
        for (const id of buckets.sessionIds ?? []) if (!excluded.has(id)) sessionIds.add(id);
      }
      publish({ ...summarize(filterSessionIds(ledgerDays, excluded), sessionIds.size, LEDGER_SOURCE), scope, totalSessions: sessionIds.size, sessions: mainLogs.length });
    }
    return await computeLocal(mainLogs, ledgerDays, allowed, excluded, scope);
  }
  function refresh(scope = HOME_SESSION_SCOPE_ALL, workspaceId = "") {
    const slot = slotFor(scope, workspaceId);
    if (disposed) return Promise.resolve(null);
    if (slot.pending !== null) return slot.pending;
    if (slot.state !== null && Date.now() < slot.nextAt) return Promise.resolve(slot.state.value);
    slot.state = slot.state === null ? { value: null, computing: true } : { ...slot.state, computing: true };
    const startedAt = Date.now();
    const finish = () => {
      slot.pending = null;
      const finishedAt = Date.now();
      slot.nextAt = finishedAt + recheckDelay(finishedAt - startedAt);
    };
    slot.pending = compute((partial) => {
      if (!disposed) slot.state = { value: partial, computing: true };
    }, scope, workspaceId).then(
      (value) => {
        finish();
        if (disposed) return value;
        slot.state = { value, computing: false };
        return value;
      },
      (error) => {
        finish();
        if (!disposed) slot.state = { value: slot.state?.value ?? null, computing: false, error: messageOf(error) };
        return null;
      }
    );
    return slot.pending ?? Promise.resolve(null);
  }
  return {
    /** The current state for one scope: a value, a computing flag, and the last error if any. */
    snapshot(scope = HOME_SESSION_SCOPE_ALL, workspaceId = "") {
      const state = slotFor(scope, workspaceId).state;
      return state === null ? { ok: true, value: null, computing: false } : { ok: true, value: state.value, computing: state.computing === true, error: state.error };
    },
    refresh,
    dispose() {
      disposed = true;
    }
  };
}
export {
  createUsage
};
