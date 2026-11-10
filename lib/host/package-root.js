// packages/contracts/src/package.ts
var PACKAGE_NAME = "dsh-claude-style";

// packages/engine/node/package-root.ts
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";
function findPackageRoot(moduleUrl, packageName) {
  let at = dirname(fileURLToPath(moduleUrl));
  const top = parse(at).root;
  while (at !== top) {
    const manifest = join(at, "package.json");
    if (existsSync(manifest) && JSON.parse(readFileSync(manifest, "utf8")).dsh !== void 0) return at;
    at = dirname(at);
  }
  throw new Error(`${packageName}: no package.json with a dsh field above the host half`);
}

// packages/host/src/package-root.ts
var cached = null;
function packageRoot() {
  cached ??= findPackageRoot(import.meta.url, PACKAGE_NAME);
  return cached;
}
export {
  packageRoot
};
