/**
 * Host half of dsh-claude-style.
 *
 * The skin's effect is browser-only. This half exists for the things a
 * browser-only plugin cannot do:
 *
 *   1. Serve the model copy document. That table is DATA, not code — it ships
 *      beside the bundle as `model-descriptions.json` and the browser half
 *      fetches it at runtime, so the table grows without a rebuild and the
 *      bundle stays free of copy.
 *   2. Serve the bundled code font (and user-supplied text faces) as webfonts.
 *      The skin's code font stack names 'JetBrains Mono', which renders only
 *      when the family resolves — and most systems have never installed it.
 *      The font files already ship in this package (SIL OFL), so the route
 *      fonts route hands them to the browser half's @font-face and the code face
 *      works with zero system installs. The Anthropic Sans/Serif text faces
 *      are NOT in the npm package (they remain Anthropic's property), but a
 *      user who drops them into this package's `fonts/` directory gets the
 *      same zero-install treatment; a missing file simply 404s and the stack
 *      falls back to a system-installed copy, then to the look-alike faces
 *      this package does ship (Inter, Noto Serif — SIL OFL).
 *   3. Resolve the OS user once for the browser half. The username route answers
 *      a single GET and the browser caches it; it runs the host's own request
 *      fence first — see refusalOf() in routes.js.
 *   4. Serve Deepy's animation sheets. The DeepSeek brand's pixel whale plays
 *      about 0.4 MB of sprite sheets, too much to inline into the bundle, so
 *      they ship as files beside it and the browser fetches each one the
 *      first time its animation plays.
 *
 * The registrations are defensive. A host without a web server, or with the
 * route prefix already taken, or with the settings service absent, must still
 * activate the plugin: a failed host fiber also drops the client bundle from
 * the module graph and the whole skin with it. The browser half falls back to
 * its defaults when either surface is missing.
 *
 * The routes live in routes.js, the HDSL account contract in hdsl.js, and the
 * settings surface in settings.js; this file only mounts them.
 */
import { registerRoutes } from './routes.js'
import type { DshContext, DshScope } from './dsh.ts'
import { registerSettings } from './settings.js'

export const name = 'dsh-claude-style'
export { Config } from './settings.js'

/**
 * Register the plugin's host surfaces.
 * @param ctx - host plugin context.
 */
export function apply(ctx: DshContext) {
  // Always register through inject, never on the bare ctx. `ctx.get()` reads a
  // service leniently (no inject declaration needed), but the PROPERTY access
  // inside registerRoutes (`scope.webServer`) is gated by the fiber's inject
  // declaration, and a host half re-applies while the web server is already
  // running (a generation relink after a client-bundle rebuild). inject()
  // waits for the service and hands registerRoutes a scope that HAS the
  // declaration, so both a boot-time apply and a hot relink register. A host
  // without a web server simply waits here, and the skin still activates.
  if (typeof ctx.inject === 'function') ctx.inject(['webServer'], (scope: DshScope) => { registerRoutes(ctx, scope) })
  else registerRoutes(ctx, ctx)

  registerSettings(ctx)
}
