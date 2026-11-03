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

// packages/engine/node/static-files.ts
import { existsSync, readFileSync } from "node:fs";
import { join as join2 } from "node:path";
import { brotliDecompressSync } from "node:zlib";
var ASSETS_MANIFEST = "manifest.json";
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
import { sessionDirectoryName } from "./session-name.js";
import { createUsage } from "./usage.js";
var COPY_FILE = "model-descriptions.json";
var BILLING_ROWS_MAX = 32;
var BILLING_ROW_MAX = 256;
function readBillingRows(query) {
  const currency = query.get("cur");
  const rows = query.getAll("b").slice(0, BILLING_ROWS_MAX).filter((row) => row.length <= BILLING_ROW_MAX);
  return billingRowsOf(rows, currency === "CNY" || currency === "USD" ? currency : null);
}
var FONT_FILES = {
  "JetBrainsMonoVariable.ttf": "font/ttf",
  "JetBrainsMonoItalicVariable.ttf": "font/ttf",
  "AnthropicSansWebText.ttf": "font/ttf",
  "AnthropicSerifWebText.ttf": "font/ttf",
  "AnthropicMonoWeb.ttf": "font/ttf",
  "InterVariable.woff2": "font/woff2",
  "NotoSerifVariable.woff2": "font/woff2"
};
var ASSETS_PATH = `${ROUTE_PREFIX}/assets/`;
var DELETE_BODY_MAX = 4096;
var SESSION_ID_RE = /^[A-Za-z0-9._\-:@]{1,200}$/;
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
    sessionCost.ensure();
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
        void deleteSession(ctx, req, res).catch((error) => {
          if (res.headersSent) res.destroy();
          else sendJson(res, 500, { ok: false, error: String(error?.message ?? String(error)) });
        });
      }
    });
    register("usage", {
      kind: "exact",
      path: USAGE_PATH,
      handler: (req, res) => {
        if (methodRefused(req, res, ["GET", "HEAD"])) return;
        if (fenceRefused(ctx, req, res)) return;
        void usage.refresh();
        const snapshot = usage.snapshot();
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
        if (methodRefused(req, res, ["GET"])) return;
        if (fenceRefused(ctx, req, res)) return;
        const query = new URL(req.url ?? "/", "http://local").searchParams;
        const sessionId = (query.get("id") ?? "").trim();
        if (!SESSION_ID_RE.test(sessionId)) {
          sendJson(res, 400, { ok: false, error: "invalid session id" });
          return;
        }
        const billing = readBillingRows(query);
        sendPayload(res, sessionCost.get(sessionId, billing).then((value) => ({ value })));
      }
    });
    for (const { label, route } of brandRoutes(ctx)) register(label, route);
    return () => {
      usage.dispose();
      peakrate.dispose();
      prices.dispose();
      sessionCost.dispose();
      sessionSearch.dispose();
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
