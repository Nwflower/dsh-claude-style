// packages/host/src/peakrate.ts
import { statSync } from "node:fs";
import { join } from "node:path";
import { cachePath, readJsonDocument, writeJsonDocument } from "./cache-file.js";
import { packageRoot } from "./package-root.js";
import { parseCatalog } from "./peakrate-catalog.js";
var PEAKRATE_CATALOG_FILE = "peakrate-catalog.json";
var PEAKRATE_CATALOG_URL = "https://offpeakclock.com/pricing.json";
var PEAKRATE_REFRESH_MS = 24 * 60 * 60 * 1e3;
var FETCH_TIMEOUT_MS = 1e4;
function createPeakRate(ctx) {
  const snapshotFile = join(packageRoot(), "lib", PEAKRATE_CATALOG_FILE);
  const cacheFile = cachePath(ctx, "peakrate.json");
  let catalog;
  let origin = "bundled";
  let fetchedAt = 0;
  let loaded = false;
  let timer;
  const warn = (message) => ctx.logger?.warn?.(message);
  function shippedCatalog() {
    const parsed = parseCatalog(readJsonDocument(ctx, snapshotFile, `lib/${PEAKRATE_CATALOG_FILE}`));
    if (parsed === null) {
      warn(`dsh-claude-style: lib/${PEAKRATE_CATALOG_FILE} is not a catalog this build understands`);
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
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const response = await fetch(PEAKRATE_CATALOG_URL, { signal: controller.signal });
        if (!response.ok) {
          warn(`dsh-claude-style: peak rate source answered ${response.status}; keeping the current catalog`);
          return false;
        }
        raw = await response.json();
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      warn(`dsh-claude-style: peak rate source unreachable, keeping the current catalog: ${error.message}`);
      return false;
    }
    const parsed = parseCatalog(raw);
    if (parsed === null) {
      warn("dsh-claude-style: peak rate source answered a document this build does not understand; keeping the current catalog");
      return false;
    }
    catalog = parsed;
    origin = "remote";
    fetchedAt = Date.now();
    writeCache();
    return true;
  }
  function writeCache() {
    const stored = { fetchedAt, document: catalog };
    writeJsonDocument(ctx, cacheFile, "peak rate cache", stored);
  }
  function ensure() {
    load();
    if (timer !== void 0) return;
    timer = setInterval(() => {
      void refresh();
    }, PEAKRATE_REFRESH_MS);
    timer.unref?.();
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
      if (timer !== void 0) {
        clearInterval(timer);
        timer = void 0;
      }
    }
  };
}
export {
  PEAKRATE_CATALOG_FILE,
  PEAKRATE_CATALOG_URL,
  PEAKRATE_REFRESH_MS,
  createPeakRate
};
