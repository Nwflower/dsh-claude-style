// packages/contracts/src/package.ts
var PACKAGE_NAME = "dsh-claude-style";

// packages/engine/node/cache-file.ts
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join as join2 } from "node:path";

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
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(temporary, JSON.stringify(document), "utf8");
        renameSync(temporary, path);
        return true;
      } catch (error) {
        ctx.logger?.warn?.(`${packageName}: ${label} not written: ${error.message}`);
        return false;
      }
    }
  };
}

// packages/host/src/cache-file.ts
var { cachePath, readJsonDocument, writeJsonDocument } = createCacheFiles(PACKAGE_NAME);
export {
  cachePath,
  readJsonDocument,
  writeJsonDocument
};
