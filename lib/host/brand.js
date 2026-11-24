// packages/contracts/src/brand.ts
var BRAND_IMAGE_KINDS = ["mark", "wordmark"];
var BRAND_IMAGE_TYPES = {
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp"
};
var BRAND_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

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

// packages/host/src/brand.ts
import { readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { pluginPath } from "./paths.js";
import { IMAGE_HEADERS, readImageUpload, writeAtomicFile } from "./brand-image-shared.js";
import { brandingPresetRoutes } from "./branding-presets.js";

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

// packages/host/src/brand.ts
var IMAGE_PATHS = { mark: BRAND_MARK_PATH, wordmark: BRAND_WORDMARK_PATH };
function createBrandStore(ctx) {
  const dir = () => pluginPath(ctx, "brand");
  const find = (kind) => {
    for (const [type, extension] of Object.entries(BRAND_IMAGE_TYPES)) {
      const path = join(dir(), `${kind}.${extension}`);
      const stat = statSync(path, { throwIfNoEntry: false });
      if (stat?.isFile() !== true) continue;
      return { path, type, state: { type, version: `${Math.round(stat.mtimeMs)}-${stat.size}` } };
    }
    return null;
  };
  const answer = () => ({ ok: true, mark: find("mark")?.state ?? null, wordmark: find("wordmark")?.state ?? null });
  const write = (kind, type, bytes) => {
    const extension = BRAND_IMAGE_TYPES[type];
    const target = join(dir(), `${kind}.${extension}`);
    writeAtomicFile(target, bytes, Object.values(BRAND_IMAGE_TYPES).filter((other) => other !== extension).map((other) => join(dir(), `${kind}.${other}`)));
  };
  const remove = (kind) => {
    for (const extension of Object.values(BRAND_IMAGE_TYPES)) rmSync(join(dir(), `${kind}.${extension}`), { force: true });
  };
  return { find, answer, write, remove };
}
async function storeImage(store, kind, req, res) {
  const upload = await readImageUpload(req, res);
  if (upload === null) return;
  store.write(kind, upload.type, upload.bytes);
  sendJson(res, 200, store.answer());
}
function brandRoutes(ctx) {
  const store = createBrandStore(ctx);
  const status = {
    kind: "exact",
    path: BRAND_PATH,
    handler: (req, res, peer) => {
      if (methodRefused(req, res, ["GET"])) return;
      if (fenceRefused(ctx, req, res, peer)) return;
      sendJson(res, 200, store.answer());
    }
  };
  const images = BRAND_IMAGE_KINDS.map((kind) => ({
    label: `brand ${kind}`,
    route: {
      kind: "exact",
      path: IMAGE_PATHS[kind],
      handler: (req, res, peer) => {
        if (methodRefused(req, res, ["GET", "HEAD", "PUT", "DELETE"])) return;
        if (fenceRefused(ctx, req, res, peer)) return;
        if (req.method === "PUT" || req.method === "DELETE") {
          const done = req.method === "PUT" ? storeImage(store, kind, req, res) : Promise.resolve().then(() => {
            store.remove(kind);
            sendJson(res, 200, store.answer());
          });
          void done.catch((error) => {
            if (res.headersSent) res.destroy();
            else sendJson(res, 500, { ok: false, error: String(error?.message ?? String(error)) });
          });
          return;
        }
        const found = store.find(kind);
        if (found === null) {
          res.writeHead(404, { "cache-control": "no-store" });
          res.end();
          return;
        }
        const body = readFileSync(found.path);
        res.writeHead(200, { ...IMAGE_HEADERS, "content-type": found.type, "content-length": String(body.byteLength) });
        res.end(req.method === "HEAD" ? void 0 : body);
      }
    }
  }));
  return [{ label: "brand status", route: status }, ...images, ...brandingPresetRoutes(ctx)];
}
export {
  brandRoutes
};
