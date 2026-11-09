import { PACKAGE_NAME } from '@dsh-claude-style/contracts/package'
import type { DshContext } from '@dsh-claude-style/engine/node/dsh'
import { harnessPath } from '@dsh-claude-style/engine/node/harness-home'

/**
 * One path inside this plugin's own directory in the harness home, which holds
 * the reader's dropped-in fonts and brand images and the usage record.
 *
 * @param ctx - host plugin context.
 * @param segments - path segments under the plugin's directory.
 * @returns the resolved path.
 */
export function pluginPath(ctx: DshContext, ...segments: string[]): string {
  return harnessPath(ctx, PACKAGE_NAME, ...segments)
}
