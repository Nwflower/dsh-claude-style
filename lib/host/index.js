// packages/host/src/index.ts
import { registerRoutes } from "./routes.js";
import { registerSettings } from "./settings.js";
import { Config } from "./settings.js";
var name = "dsh-claude-style";
function apply(ctx) {
  if (typeof ctx.inject === "function") ctx.inject(["webServer"], (scope) => {
    registerRoutes(ctx, scope);
  });
  else registerRoutes(ctx, ctx);
  registerSettings(ctx);
}
export {
  Config,
  apply,
  name
};
