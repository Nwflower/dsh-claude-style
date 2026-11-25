// packages/contracts/src/package.ts
var PACKAGE_NAME = "dsh-claude-style";

// packages/host/src/index.ts
import { registerRoutes } from "./routes.js";
import { registerSettings } from "./settings.js";
import { createUsage } from "./usage.js";
import { registerWidgetUsage } from "./widget-usage.js";
import { Config } from "./settings.js";
var name = PACKAGE_NAME;
function apply(ctx, config) {
  const usage = createUsage(ctx);
  ctx.effect?.(() => () => {
    usage.dispose();
  });
  if (typeof ctx.inject === "function") ctx.inject(["webServer"], (scope) => {
    registerRoutes(ctx, scope, config, usage);
  });
  else registerRoutes(ctx, ctx, config, usage);
  registerSettings(ctx);
  registerWidgetUsage(ctx, usage);
}
export {
  Config,
  apply,
  name
};
