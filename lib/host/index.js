// packages/contracts/src/package.ts
var PACKAGE_NAME = "dsh-claude-style";

// packages/host/src/index.ts
import { registerRoutes } from "./routes.js";
import { registerSettings } from "./settings.js";
import { registerWidgetUsage } from "./widget-usage.js";
import { Config } from "./settings.js";
var name = PACKAGE_NAME;
function apply(ctx) {
  if (typeof ctx.inject === "function") ctx.inject(["webServer"], (scope) => {
    registerRoutes(ctx, scope);
  });
  else registerRoutes(ctx, ctx);
  registerSettings(ctx);
  registerWidgetUsage(ctx);
}
export {
  Config,
  apply,
  name
};
