/**
 * lifeline.cjs — preloaded into the scratch host by packages/testing/dsh-web.cjs
 * (`NODE_OPTIONS=--require`), so the host never outlives the process that
 * started it (D45).
 *
 * The launcher gives the host a stdin pipe and never writes to it. However the
 * launcher ends — a normal exit, an uncaught error, Ctrl+C, taskkill /F — the OS
 * closes its end, the host reads end-of-file, and this module ends the host.
 * The launcher's own `stop()` cannot cover the last two: no code of its runs,
 * and on Windows its direct child is the cmd.exe the shell spawn puts in front
 * of the host.
 *
 * NODE_OPTIONS reaches every node process the host spawns, and their stdin is
 * not the lifeline: only the process carrying `DSH_WEB_LIFELINE` — the host —
 * watches, and it removes the mark so its children inherit none.
 */
'use strict'
if (process.env.DSH_WEB_LIFELINE === '1') {
  delete process.env.DSH_WEB_LIFELINE
  process.stdin.on('end', () => process.exit(0))
  process.stdin.resume()
}
