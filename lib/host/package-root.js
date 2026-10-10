// packages/host/src/package-root.ts
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";
var cached = null;
function packageRoot() {
  if (cached !== null) return cached;
  let at = dirname(fileURLToPath(import.meta.url));
  const top = parse(at).root;
  while (at !== top) {
    const manifest = join(at, "package.json");
    if (existsSync(manifest)) {
      const parsed = JSON.parse(readFileSync(manifest, "utf8"));
      if (parsed.dsh !== void 0) {
        cached = at;
        return cached;
      }
    }
    at = dirname(at);
  }
  throw new Error("dsh-claude-style: no package.json with a dsh field above the host half");
}
export {
  packageRoot
};
