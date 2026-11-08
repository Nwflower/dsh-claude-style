// packages/contracts/src/package.ts
var PACKAGE_NAME = "dsh-claude-style";

// packages/host/src/peakrate.ts
import { statSync } from "node:fs";
import { join } from "node:path";
import { cachePath, readJsonDocument, writeJsonDocument } from "./cache-file.js";
import { packageRoot } from "./package-root.js";
import { parseCatalog } from "./peakrate-catalog.js";
var PEAKRATE_CATALOG_FILE = "peakrate-catalog.json";
var PEAKRATE_CATALOG_URLS = [
  "https://cdn.jsdelivr.net/gh/Nwflower/dsh-claude-style@master/packages/host/data/peakrate-catalog.json",
  "https://raw.githubusercontent.com/Nwflower/dsh-claude-style/master/packages/host/data/peakrate-catalog.json"
];
var PEAKRATE_REFRESH_MS = 24 * 60 * 60 * 1e3;
var PEAKRATE_IDLE_MS = 48 * 60 * 60 * 1e3;
var FETCH_TIMEOUT_MS = 1e4;
function createPeakRate(ctx) {
  const snapshotFile = join(packageRoot(), "lib", PEAKRATE_CATALOG_FILE);
  const cacheFile = cachePath(ctx, "peakrate.json");
  let catalog;
  let origin = "bundled";
  let fetchedAt = 0;
  let loaded = false;
  let timer;
  let inFlight = null;
  let disposed = false;
  let lastAskedAt = 0;
  const warn = (message) => ctx.logger?.warn?.(message);
  function shippedCatalog() {
    const parsed = parseCatalog(readJsonDocument(ctx, snapshotFile, `lib/${PEAKRATE_CATALOG_FILE}`));
    if (parsed === null) {
      warn(`${PACKAGE_NAME}: lib/${PEAKRATE_CATALOG_FILE} is not a catalog this build understands`);
      return void 0;
    }
    return parsed;
  }
  function cachedCatalog(shipped) {
    const value = readJsonDocument(ctx, cacheFile, "peak rate cache");
    if (value === null || typeof value !== "object") return void 0;
    const stored = value;
    const parsed = parseCatalog(stored.document);
    if (parsed === null) return void 0;
    if (shipped !== void 0 && isOlder(parsed, shipped)) return void 0;
    return { catalog: parsed, fetchedAt: typeof stored.fetchedAt === "number" ? stored.fetchedAt : 0 };
  }
  function isOlder(cached, shipped) {
    if (cached.updatedAt !== void 0 && shipped.updatedAt !== void 0) return cached.updatedAt < shipped.updatedAt;
    return statSync(cacheFile).mtimeMs < statSync(snapshotFile).mtimeMs;
  }
  function load() {
    if (loaded) return;
    loaded = true;
    const shipped = shippedCatalog();
    const cached = cachedCatalog(shipped);
    if (cached !== void 0) {
      catalog = cached.catalog;
      fetchedAt = cached.fetchedAt;
      return;
    }
    catalog = shipped;
  }
  async function refresh() {
    let raw;
    for (const url of PEAKRATE_CATALOG_URLS) {
      if (disposed) return false;
      try {
        const controller = new AbortController();
        inFlight = controller;
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        try {
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) {
            warn(`${PACKAGE_NAME}: peak rate source ${url} answered ${response.status}`);
            raw = void 0;
            continue;
          }
          raw = await response.json();
        } finally {
          clearTimeout(timeout);
          if (inFlight === controller) inFlight = null;
        }
        if (raw !== void 0) break;
      } catch (error) {
        warn(`${PACKAGE_NAME}: peak rate source ${url} unreachable: ${error.message}`);
      }
    }
    if (raw === void 0) {
      warn(`${PACKAGE_NAME}: no peak rate source answered; keeping the current catalog`);
      return false;
    }
    const parsed = parseCatalog(raw);
    if (parsed === null) {
      warn(`${PACKAGE_NAME}: peak rate source answered a document this build does not understand; keeping the current catalog`);
      return false;
    }
    if (disposed) return false;
    catalog = parsed;
    origin = "remote";
    fetchedAt = Date.now();
    writeCache();
    return true;
  }
  function writeCache() {
    if (disposed) return;
    const stored = { fetchedAt, document: catalog };
    writeJsonDocument(ctx, cacheFile, "peak rate cache", stored);
  }
  function ensure() {
    load();
    lastAskedAt = Date.now();
    if (timer !== void 0) return;
    timer = setInterval(() => {
      if (Date.now() - lastAskedAt > PEAKRATE_IDLE_MS) {
        stopTimer();
        return;
      }
      void refresh();
    }, PEAKRATE_REFRESH_MS);
    timer.unref?.();
  }
  function stopTimer() {
    if (timer === void 0) return;
    clearInterval(timer);
    timer = void 0;
  }
  function payload() {
    const profiles = catalog?.profiles ?? [];
    return {
      profiles,
      ...catalog?.updatedAt === void 0 ? {} : { updatedAt: catalog.updatedAt },
      ...fetchedAt === 0 ? {} : { fetchedAt: new Date(fetchedAt).toISOString() },
      origin
    };
  }
  return {
    ensure,
    refresh,
    payload,
    dispose() {
      disposed = true;
      stopTimer();
      if (inFlight !== null) {
        inFlight.abort();
        inFlight = null;
      }
    }
  };
}
export {
  PEAKRATE_CATALOG_FILE,
  PEAKRATE_CATALOG_URLS,
  PEAKRATE_IDLE_MS,
  PEAKRATE_REFRESH_MS,
  createPeakRate
};
