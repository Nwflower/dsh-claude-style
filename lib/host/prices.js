// packages/contracts/src/package.ts
var PACKAGE_NAME = "dsh-claude-style";

// packages/host/src/prices.ts
import "node:fs";
import { join } from "node:path";
import { cachePath, readJsonDocument, writeJsonDocument } from "./cache-file.js";
import { packageRoot } from "./package-root.js";
import { parsePriceDocument } from "./prices-document.js";
var PRICES_FILE = "prices.json";
var PRICES_URLS = [
  "https://cdn.jsdelivr.net/gh/Nwflower/dsh-claude-style@master/packages/host/data/prices.json",
  "https://raw.githubusercontent.com/Nwflower/dsh-claude-style/master/packages/host/data/prices.json"
];
var PRICES_REFRESH_MS = 24 * 60 * 60 * 1e3;
var PRICES_IDLE_MS = 48 * 60 * 60 * 1e3;
var FETCH_TIMEOUT_MS = 1e4;
function createPrices(ctx) {
  const shippedFile = join(packageRoot(), "lib", PRICES_FILE);
  const cacheFile = cachePath(ctx, "prices.json");
  let document = null;
  let origin = "bundled";
  let fetchedAt = 0;
  let loaded = false;
  let timer;
  let inFlight = null;
  let disposed = false;
  let lastAskedAt = 0;
  const listeners = /* @__PURE__ */ new Set();
  const warn = (message) => ctx.logger?.warn?.(message);
  function shipped() {
    const parsed = parsePriceDocument(readJsonDocument(ctx, shippedFile, `lib/${PRICES_FILE}`));
    if (parsed === null) {
      warn(`${PACKAGE_NAME}: lib/${PRICES_FILE} is not a price snapshot this build understands`);
      return null;
    }
    return parsed;
  }
  function cached(shippedDocument) {
    const value = readJsonDocument(ctx, cacheFile, "price cache");
    if (value === null || typeof value !== "object") return null;
    const stored = value;
    const parsed = parsePriceDocument(stored.document);
    if (parsed === null) return null;
    if (shippedDocument !== null && parsed.updatedAt < shippedDocument.updatedAt) return null;
    return { document: parsed, fetchedAt: typeof stored.fetchedAt === "number" ? stored.fetchedAt : 0 };
  }
  function load() {
    if (loaded) return;
    loaded = true;
    const shippedDocument = shipped();
    const held = cached(shippedDocument);
    if (held !== null) {
      document = held.document;
      fetchedAt = held.fetchedAt;
      return;
    }
    document = shippedDocument;
  }
  function announce() {
    for (const listener of listeners) listener();
  }
  async function fetchOne(url) {
    const controller = new AbortController();
    inFlight = controller;
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
      if (!response.ok) {
        warn(`${PACKAGE_NAME}: ${url} answered ${response.status}`);
        return null;
      }
      return parsePriceDocument(await response.json());
    } finally {
      clearTimeout(timeout);
      if (inFlight === controller) inFlight = null;
    }
  }
  async function refresh() {
    let next = null;
    for (const url of PRICES_URLS) {
      if (disposed) return false;
      try {
        next = await fetchOne(url);
      } catch (error) {
        warn(`${PACKAGE_NAME}: ${url} unreachable: ${error.message}`);
      }
      if (next !== null) break;
    }
    if (next === null) {
      warn(`${PACKAGE_NAME}: no price source answered a document this build understands; keeping the current one`);
      return false;
    }
    if (disposed) return false;
    document = next;
    origin = "remote";
    fetchedAt = Date.now();
    writeJsonDocument(ctx, cacheFile, "price cache", { fetchedAt, document: next });
    announce();
    return true;
  }
  function ensure() {
    load();
    lastAskedAt = Date.now();
    if (timer !== void 0) return;
    timer = setInterval(() => {
      if (Date.now() - lastAskedAt > PRICES_IDLE_MS) {
        stopTimer();
        return;
      }
      void refresh();
    }, PRICES_REFRESH_MS);
    timer.unref?.();
  }
  function stopTimer() {
    if (timer === void 0) return;
    clearInterval(timer);
    timer = void 0;
  }
  return {
    ensure,
    refresh,
    document() {
      return document;
    },
    version() {
      return document === null ? "" : `${document.updatedAt}:${document.capturedAt ?? ""}`;
    },
    payload() {
      return {
        document,
        ...fetchedAt === 0 ? {} : { fetchedAt: new Date(fetchedAt).toISOString() },
        origin
      };
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      disposed = true;
      stopTimer();
      listeners.clear();
      if (inFlight !== null) {
        inFlight.abort();
        inFlight = null;
      }
    }
  };
}
export {
  PRICES_FILE,
  PRICES_IDLE_MS,
  PRICES_REFRESH_MS,
  PRICES_URLS,
  createPrices
};
