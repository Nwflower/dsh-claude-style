// packages/contracts/src/brand.ts
var BRAND_IMAGE_TYPES = {
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp"
};
var BRAND_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

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

// packages/contracts/src/branding-presets.ts
var BRANDING_PRESET_NAME_MAX = 40;
var BRANDING_PRESET_ID_MAX = 40;
var BRANDING_ASSET_REF_MAX = 240;
var BRANDING_SLOTS = ["mark-light", "mark-dark", "wordmark-light", "wordmark-dark"];
var BRAND_INK_ORIGINAL = "original";
var BRAND_INK_ACCENT = "accent";
var BRAND_INK_TEXT = "text";
var BRAND_INKS = [BRAND_INK_ORIGINAL, BRAND_INK_ACCENT, BRAND_INK_TEXT];
var ID = /^[a-z0-9][a-z0-9-]*$/;
var BRANDING_VENDORS = ["openai", "gemini", "qwen", "kimicode", "zcode", "minimax", "grok", "xiaomimimo"];
var VENDOR_PREFIX = "vendor-";
var BRANDING_VENDOR_IDS = BRANDING_VENDORS.map((brand) => VENDOR_PREFIX + brand);
function brandingSlot(kind, appearance) {
  return kind + "-" + appearance;
}
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
function brandingAsset(preset, kind, appearance) {
  const value = preset[kind];
  if (typeof value === "string") return value;
  if (value === void 0) return void 0;
  return value[appearance] ?? value[appearance === "light" ? "dark" : "light"];
}
function parseBrandingPreset(text) {
  const record = parseRecordObject(text);
  const id = record.id;
  if (typeof id !== "string" || id.length > BRANDING_PRESET_ID_MAX || !ID.test(id)) throw new Error("the id is not 1\u201340 lowercase letters, digits or hyphens");
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

// packages/host/src/branding-presets.ts
import { readFileSync, realpathSync, rmSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { IMAGE_HEADERS, imageBytesValid, readImageUpload, routeFailure, writeAtomicFile } from "./brand-image-shared.js";

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

// packages/host/src/branding-presets.ts
import { pluginPath } from "./harness-home.js";
var ID2 = /^[a-z0-9][a-z0-9-]*$/;
var STATUS_BODY_MAX = 4096;
function validId(id) {
  return id.length > 0 && id.length <= BRANDING_PRESET_ID_MAX && ID2.test(id);
}
function createBrandingStore(ctx) {
  const home = () => pluginPath(ctx);
  const managed = (id, slot, extension) => join(home(), "branding", "presets", id, slot + "." + extension);
  const inspect = (path, type) => {
    const stat = statSync(path, { throwIfNoEntry: false });
    if (stat?.isFile() !== true) throw new Error("image file is missing");
    if (stat.size > BRAND_IMAGE_MAX_BYTES) throw new Error("image exceeds the 2 MB limit");
    if (!imageBytesValid(type, readFileSync(path))) throw new Error("image bytes do not match their declared type");
    const root = realpathSync(home());
    const target = realpathSync(path);
    if (target !== root && !target.startsWith(root + sep)) throw new Error("image reference leaves the plugin directory");
    return { path, type, state: { type, version: Math.round(stat.mtimeMs) + "-" + stat.size } };
  };
  const findManaged = (id, slot) => {
    for (const [type, extension] of Object.entries(BRAND_IMAGE_TYPES)) {
      const path = managed(id, slot, extension);
      if (statSync(path, { throwIfNoEntry: false })?.isFile() !== true) continue;
      return inspect(path, type);
    }
    throw new Error("managed image is missing");
  };
  const read = (id, slot, ref) => {
    if (ref.startsWith("@managed/")) {
      if (ref !== "@managed/" + slot) throw new Error("managed reference does not match its slot");
      return findManaged(id, slot);
    }
    const relative = ref.startsWith("./") ? ref.slice(2) : ref;
    const type = Object.entries(BRAND_IMAGE_TYPES).find(([, extension]) => relative.endsWith("." + extension))?.[0];
    if (type === void 0) throw new Error("image reference has an unsupported extension");
    return inspect(resolve(home(), relative), type);
  };
  const status = (preset, appearance) => {
    const problems = [];
    const one = (kind) => {
      const ref = brandingAsset(preset, kind, appearance);
      if (ref === void 0) return null;
      const slot = brandingSlot(kind, appearance);
      try {
        const sourceSlot = ref.startsWith("@managed/") ? ref.slice("@managed/".length) : slot;
        const found = read(preset.id, sourceSlot, ref);
        const query = new URLSearchParams({ id: preset.id, slot: sourceSlot, ref, v: found.state.version });
        return { ...found.state, url: BRANDING_ASSET_PATH + "?" + query.toString() };
      } catch (error) {
        problems.push({ kind, message: error instanceof Error ? error.message : String(error) });
        return null;
      }
    };
    return { ok: true, mark: one("mark"), wordmark: one("wordmark"), problems };
  };
  const write = (id, slot, type, bytes) => {
    const extension = BRAND_IMAGE_TYPES[type];
    const target = managed(id, slot, extension);
    writeAtomicFile(target, bytes, Object.values(BRAND_IMAGE_TYPES).filter((other) => other !== extension).map((other) => managed(id, slot, other)));
    return inspect(target, type).state;
  };
  const remove = (id, slot) => {
    for (const extension of Object.values(BRAND_IMAGE_TYPES)) rmSync(managed(id, slot, extension), { force: true });
  };
  return { read, status, write, remove };
}
async function readStatus(store, req, res) {
  const body = await readRequestBody(req, STATUS_BODY_MAX);
  if (body === null) {
    sendJson(res, 413, { ok: false, error: "request body too large" });
    return;
  }
  try {
    const raw = JSON.parse(body.toString("utf8"));
    const preset = parseBrandingPreset(JSON.stringify(raw));
    if (raw.appearance !== "light" && raw.appearance !== "dark") {
      sendJson(res, 400, { ok: false, error: "unknown appearance" });
      return;
    }
    sendJson(res, 200, store.status(preset, raw.appearance));
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}
function brandingPresetRoutes(ctx) {
  const store = createBrandingStore(ctx);
  return [
    {
      label: "branding status",
      route: {
        kind: "exact",
        path: BRANDING_STATUS_PATH,
        handler: (req, res, peer) => {
          if (methodRefused(req, res, ["POST"])) return;
          if (fenceRefused(ctx, req, res, peer)) return;
          void readStatus(store, req, res).catch((error) => {
            if (res.headersSent) res.destroy();
            else sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
          });
        }
      }
    },
    {
      label: "branding asset",
      route: {
        kind: "exact",
        path: BRANDING_ASSET_PATH,
        handler: (req, res, peer) => {
          if (methodRefused(req, res, ["GET", "HEAD", "PUT", "DELETE"])) return;
          if (fenceRefused(ctx, req, res, peer)) return;
          const params = new URL(req.url ?? "/", "http://local").searchParams;
          const id = params.get("id") ?? "";
          const slot = params.get("slot");
          if (!validId(id) || !BRANDING_SLOTS.includes(slot)) {
            sendJson(res, 400, { ok: false, error: "invalid preset id or slot" });
            return;
          }
          if (req.method === "PUT") {
            void (async () => {
              const upload = await readImageUpload(req, res);
              if (upload === null) return;
              const state = store.write(id, slot, upload.type, upload.bytes);
              sendJson(res, 200, { ok: true, ref: "@managed/" + slot, state });
            })().catch((error) => {
              routeFailure(res, error);
            });
            return;
          }
          if (req.method === "DELETE") {
            store.remove(id, slot);
            sendJson(res, 200, { ok: true });
            return;
          }
          try {
            const found = store.read(id, slot, params.get("ref") ?? "");
            const body = readFileSync(found.path);
            res.writeHead(200, { ...IMAGE_HEADERS, "content-type": found.type, "content-length": String(body.byteLength) });
            res.end(req.method === "HEAD" ? void 0 : body);
          } catch {
            res.writeHead(404, { "cache-control": "no-store" });
            res.end();
          }
        }
      }
    }
  ];
}
export {
  brandingPresetRoutes
};
