// packages/contracts/src/package.ts
var PACKAGE_NAME = "dsh-claude-style";

// packages/engine/node/cache-file.ts
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join as join2, sep } from "node:path";

// packages/engine/node/harness-home.ts
import { homedir } from "node:os";
import { join } from "node:path";
function harnessPath(ctx, ...segments) {
  const resolvePath = ctx.get("dshHomePath");
  if (typeof resolvePath === "function") return resolvePath(...segments);
  return join(process.env.DSH_HOME ?? join(homedir(), ".dsh"), ...segments);
}

// packages/engine/node/cache-file.ts
function createCacheFiles(packageName) {
  return {
    /** One path inside this plugin's cache directory in the harness home. */
    cachePath(ctx, ...segments) {
      return join2(harnessPath(ctx, "cache", packageName), ...segments);
    },
    /** Return parsed JSON, or undefined with a warning when absent or unreadable. */
    readJsonDocument(ctx, path, label) {
      if (!existsSync(path)) return void 0;
      try {
        return JSON.parse(readFileSync(path, "utf8"));
      } catch (error) {
        ctx.logger?.warn?.(`${packageName}: ${label} unreadable (${error.message})`);
        return void 0;
      }
    },
    /** Write through a temporary file; report failure and return whether the replace succeeded. */
    writeJsonDocument(ctx, path, label, document) {
      const temporary = `${path}.${process.pid}.tmp`;
      try {
        mkdirSync(dirname(path), { recursive: true, mode: 448 });
        const homeBase = harnessPath(ctx);
        const sharedCache = join2(homeBase, "cache");
        let dir = dirname(path);
        while (dir !== homeBase && dir !== sharedCache && dir.startsWith(homeBase + sep)) {
          chmodSync(dir, 448);
          const parent = dirname(dir);
          if (parent === dir) break;
          dir = parent;
        }
        writeFileSync(temporary, JSON.stringify(document), { encoding: "utf8", mode: 384 });
        chmodSync(temporary, 384);
        renameSync(temporary, path);
        return true;
      } catch (error) {
        ctx.logger?.warn?.(`${packageName}: ${label} not written: ${error.message}`);
        return false;
      }
    }
  };
}

// packages/engine/node/package-root.ts
import { existsSync as existsSync2, readFileSync as readFileSync2 } from "node:fs";
import { dirname as dirname2, join as join3, parse } from "node:path";
import { fileURLToPath } from "node:url";
function findPackageRoot(moduleUrl, packageName) {
  let at = dirname2(fileURLToPath(moduleUrl));
  const top = parse(at).root;
  while (at !== top) {
    const manifest = join3(at, "package.json");
    if (existsSync2(manifest) && JSON.parse(readFileSync2(manifest, "utf8")).dsh !== void 0) return at;
    at = dirname2(at);
  }
  throw new Error(`${packageName}: no package.json with a dsh field above the host half`);
}

// packages/host/src/paths.ts
var { cachePath, readJsonDocument, writeJsonDocument } = createCacheFiles(PACKAGE_NAME);
function pluginPath(ctx, ...segments) {
  return harnessPath(ctx, PACKAGE_NAME, ...segments);
}
var cachedRoot = null;
function packageRoot() {
  cachedRoot ??= findPackageRoot(import.meta.url, PACKAGE_NAME);
  return cachedRoot;
}
export {
  cachePath,
  packageRoot,
  pluginPath,
  readJsonDocument,
  writeJsonDocument
};
