/**
 * Resolve through `dshHomePath`; fall back to `$DSH_HOME`, then `~/.dsh`.
 * All stored-session access uses this shared resolution.
 */
import { homedir } from 'node:os'
import type { DshContext } from './dsh'
import { join } from 'node:path'

export function harnessPath(ctx: DshContext, ...segments: string[]): string {
  const resolvePath = ctx.get('dshHomePath')
  if (typeof resolvePath === 'function') return resolvePath(...segments)
  return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), ...segments)
}
