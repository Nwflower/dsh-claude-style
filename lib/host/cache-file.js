// packages/host/src/cache-file.ts
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { harnessPath } from "./harness-home.js";
function cachePath(ctx, ...segments) {
  return join(harnessPath(ctx, "cache", "dsh-claude-style"), ...segments);
}
function readJsonDocument(ctx, path, label) {
  if (!existsSync(path)) return void 0;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    ctx.logger?.warn?.(`dsh-claude-style: ${label} unreadable (${error.message})`);
    return void 0;
  }
}
function writeJsonDocument(ctx, path, label, document) {
  const temporary = `${path}.${process.pid}.tmp`;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(temporary, JSON.stringify(document), "utf8");
    renameSync(temporary, path);
  } catch (error) {
    ctx.logger?.warn?.(`dsh-claude-style: ${label} not written: ${error.message}`);
  }
}
export {
  cachePath,
  readJsonDocument,
  writeJsonDocument
};
