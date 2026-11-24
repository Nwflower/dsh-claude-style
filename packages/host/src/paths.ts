import { PACKAGE_NAME } from '@dsh-claude-style/contracts/package'
import { createCacheFiles } from '@dsh-claude-style/engine/node/cache-file'
import type { DshContext } from '@dsh-claude-style/engine/node/dsh'
import { harnessPath } from '@dsh-claude-style/engine/node/harness-home'
import { findPackageRoot } from '@dsh-claude-style/engine/node/package-root'

/** Derived JSON cache paths and tight-permission readers/writers for this plugin. */
export const { cachePath, readJsonDocument, writeJsonDocument } = createCacheFiles(PACKAGE_NAME)

/** Resolve a path inside `$DSH_HOME/dsh-claude-style/` (user fonts, brand assets, usage record). */
export function pluginPath(ctx: DshContext, ...segments: string[]): string {
  return harnessPath(ctx, PACKAGE_NAME, ...segments)
}

let cachedRoot: string | null = null

/** Locate the installed plugin package root once from this module's URL. */
export function packageRoot(): string {
  cachedRoot ??= findPackageRoot(import.meta.url, PACKAGE_NAME)
  return cachedRoot
}
