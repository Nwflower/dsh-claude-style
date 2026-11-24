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
  const body2 = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(body2.byteLength),
    "cache-control": "no-store"
  });
  res.end(body2);
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

// packages/host/src/session-rewind-routes.ts
var BODY_MAX = 8192;
var SESSION_ID_RE = /^[A-Za-z0-9._\-:@]{1,200}$/;
var ACTIONS = /* @__PURE__ */ new Set(["retract", "edit", "rerun", "delete"]);
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}
async function body(req, res) {
  const bytes = await readRequestBody(req, BODY_MAX);
  if (bytes === null) {
    sendJson(res, 413, { ok: false, error: "request body is unavailable or too large" });
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    sendJson(res, 400, { ok: false, error: "request body is not JSON" });
    return null;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    sendJson(res, 400, { ok: false, error: "request body is not an object" });
    return null;
  }
  return parsed;
}
function operation(res, run) {
  void run().then((value) => {
    sendJson(res, 200, { ok: true, value });
  }, (error) => {
    sendJson(res, 409, { ok: false, error: messageOf(error) });
  });
}
function sessionRewindRoutes(ctx, rewind) {
  const fence = (req, res, peer, method) => {
    if (req.method !== method) {
      res.writeHead(405, { allow: method });
      res.end();
      return false;
    }
    return !fenceRefused(ctx, req, res, peer);
  };
  return [
    {
      label: "logical conversations",
      route: {
        kind: "exact",
        path: SESSION_REVISIONS_PATH,
        handler: (req, res, peer) => {
          if (!fence(req, res, peer, "GET")) return;
          operation(res, () => rewind.conversations());
        }
      }
    },
    {
      label: "session rewind plan",
      route: {
        kind: "exact",
        path: SESSION_REWIND_PLAN_PATH,
        handler: (req, res, peer) => {
          if (!fence(req, res, peer, "POST")) return;
          void body(req, res).then((request) => {
            if (request === null) return;
            const sessionId = request.sessionId;
            if (typeof sessionId !== "string" || !SESSION_ID_RE.test(sessionId)) {
              sendJson(res, 400, { ok: false, error: "invalid session id" });
              return;
            }
            operation(res, () => rewind.plan(sessionId, Number(request.messageSeq), Number(request.turn)));
          });
        }
      }
    },
    {
      label: "session rewind commit",
      route: {
        kind: "exact",
        path: SESSION_REWIND_COMMIT_PATH,
        handler: (req, res, peer) => {
          if (!fence(req, res, peer, "POST")) return;
          void body(req, res).then((request) => {
            if (request === null) return;
            if (typeof request.planId !== "string" || typeof request.childSessionId !== "string" || typeof request.action !== "string" || !ACTIONS.has(request.action) || typeof request.restore !== "boolean") {
              sendJson(res, 400, { ok: false, error: "invalid rewind commit" });
              return;
            }
            const commit = {
              planId: request.planId,
              childSessionId: request.childSessionId,
              action: request.action,
              restore: request.restore
            };
            operation(res, () => rewind.commit(commit));
          });
        }
      }
    }
  ];
}
export {
  sessionRewindRoutes
};
