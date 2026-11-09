/**
 * Host half of dsh-claude-style: the surfaces a browser-only plugin cannot
 * provide. It serves the model copy document, the code font and the reader's
 * own text faces, the OS username, the animation sheets, the reader's brand
 * images and the usage figures; the browser half fetches each.
 *
 * Every registration is defensive. A host without a web server, with the route
 * prefix taken, or with the settings service absent must still activate the
 * plugin, because a failed host fiber drops the client bundle from the module
 * graph and the whole skin with it.
 *
 * The routes live in routes.ts, the HDSL account contract in hdsl.ts, and the
 * settings surface in settings.ts; this file only mounts them.
 */
import { PACKAGE_NAME } from '@dsh-claude-style/contracts/package'
import { registerRoutes } from './routes.js'
import type { DshContext, DshScope } from '@dsh-claude-style/engine/node/dsh'
import { registerSettings } from './settings.js'
import { registerWidgetUsage } from './widget-usage.js'

export const name = PACKAGE_NAME
export { Config } from './settings.js'

/**
 * Register the plugin's host surfaces.
 * @param ctx - host plugin context.
 */
export function apply(ctx: DshContext) {
  // The property read inside registerRoutes (`scope.webServer`) is gated by the
  // fiber's inject declaration, and the host half re-applies while the web
  // server is already running (a hot relink after a client-bundle rebuild), so
  // the scope comes from inject; a host without it still activates the skin.
  if (typeof ctx.inject === 'function') ctx.inject(['webServer'], (scope: DshScope) => { registerRoutes(ctx, scope) })
  else registerRoutes(ctx, ctx as DshScope)

  registerSettings(ctx)
  registerWidgetUsage(ctx)
}
