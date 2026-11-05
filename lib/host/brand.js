// packages/contracts/src/brand.ts
var BRAND_IMAGE_KINDS = ["mark", "wordmark"];
var BRAND_IMAGE_TYPES = {
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp"
};
var BRAND_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

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

// packages/host/src/brand.ts
import { mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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

// packages/host/src/brand.ts
var IMAGE_PATHS = { mark: BRAND_MARK_PATH, wordmark: BRAND_WORDMARK_PATH };
var IMAGE_HEADERS = {
  "cache-control": "no-cache",
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  "x-content-type-options": "nosniff"
};
var SIGNATURES = {
  "image/png": [{ offset: 0, bytes: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) }],
  "image/webp": [{ offset: 0, bytes: Buffer.from("RIFF", "latin1") }, { offset: 8, bytes: Buffer.from("WEBP", "latin1") }]
};
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
    mkdirSync(dir(), { recursive: true });
    const target = join(dir(), `${kind}.${extension}`);
    const temporary = `${target}.${process.pid}.tmp`;
    writeFileSync(temporary, bytes);
    renameSync(temporary, target);
    for (const other of Object.values(BRAND_IMAGE_TYPES)) {
      if (other !== extension) rmSync(join(dir(), `${kind}.${other}`), { force: true });
    }
  };
  const remove = (kind) => {
    for (const extension of Object.values(BRAND_IMAGE_TYPES)) rmSync(join(dir(), `${kind}.${extension}`), { force: true });
  };
  return { find, answer, write, remove };
}
function matchesSignature(type, bytes) {
  const marks = SIGNATURES[type];
  if (marks === void 0) return true;
  return marks.every(({ offset, bytes: expected }) => bytes.subarray(offset, offset + expected.length).equals(expected));
}
async function storeImage(store, kind, req, res) {
  const type = (req.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
  if (BRAND_IMAGE_TYPES[type] === void 0) {
    sendJson(res, 415, { ok: false, error: "unsupported image type" });
    return;
  }
  const bytes = await readRequestBody(req, BRAND_IMAGE_MAX_BYTES);
  if (bytes === null) {
    res.once("finish", () => req.destroy());
    sendJson(res, 413, { ok: false, error: "image too large" });
    return;
  }
  if (bytes.length === 0 || !matchesSignature(type, bytes)) {
    sendJson(res, 400, { ok: false, error: "not an image of the declared type" });
    return;
  }
  store.write(kind, type, bytes);
  sendJson(res, 200, store.answer());
}
function brandRoutes(ctx) {
  const store = createBrandStore(ctx);
  const status = {
    kind: "exact",
    path: BRAND_PATH,
    handler: (req, res) => {
      if (methodRefused(req, res, ["GET"])) return;
      if (fenceRefused(ctx, req, res)) return;
      sendJson(res, 200, store.answer());
    }
  };
  const images = BRAND_IMAGE_KINDS.map((kind) => ({
    label: `brand ${kind}`,
    route: {
      kind: "exact",
      path: IMAGE_PATHS[kind],
      handler: (req, res) => {
        if (methodRefused(req, res, ["GET", "HEAD", "PUT", "DELETE"])) return;
        if (fenceRefused(ctx, req, res)) return;
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
  return [{ label: "brand status", route: status }, ...images];
}
export {
  brandRoutes
};
