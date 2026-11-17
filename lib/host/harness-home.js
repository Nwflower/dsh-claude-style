// packages/contracts/src/package.ts
var PACKAGE_NAME = "dsh-claude-style";

// packages/engine/node/harness-home.ts
import { homedir } from "node:os";
import { join } from "node:path";
function harnessPath(ctx, ...segments) {
  const resolvePath = ctx.get("dshHomePath");
  if (typeof resolvePath === "function") return resolvePath(...segments);
  return join(process.env.DSH_HOME ?? join(homedir(), ".dsh"), ...segments);
}

// packages/host/src/harness-home.ts
function pluginPath(ctx, ...segments) {
  return harnessPath(ctx, PACKAGE_NAME, ...segments);
}
export {
  pluginPath
};
