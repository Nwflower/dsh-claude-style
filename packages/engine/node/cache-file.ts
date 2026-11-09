/**
 * Derived caches under `$DSH_HOME/cache/<package name>/`; failures degrade to no cache (D12).
 * Temporary-file rename keeps readers from seeing partial JSON.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { DshContext } from './dsh'
import { harnessPath } from './harness-home'

/** The cache files of the plugin named `packageName`. */
export function createCacheFiles(packageName: string) {
  return {
    /** One path inside this plugin's cache directory in the harness home. */
    cachePath(ctx: DshContext, ...segments: string[]) {
      return join(harnessPath(ctx, 'cache', packageName), ...segments)
    },

    /** Return parsed JSON, or undefined with a warning when absent or unreadable. */
    readJsonDocument(ctx: DshContext, path: string, label: string): unknown {
      if (!existsSync(path)) return undefined
      try {
        return JSON.parse(readFileSync(path, 'utf8'))
      } catch (error) {
        ctx.logger?.warn?.(`${packageName}: ${label} unreadable (${(error as { message?: string }).message})`)
        return undefined
      }
    },

    /** Write through a temporary file; report failure and return whether the replace succeeded. */
    writeJsonDocument(ctx: DshContext, path: string, label: string, document: unknown): boolean {
      const temporary = `${path}.${process.pid}.tmp`
      try {
        mkdirSync(dirname(path), { recursive: true })
        writeFileSync(temporary, JSON.stringify(document), 'utf8')
        renameSync(temporary, path)
        return true
      } catch (error) {
        ctx.logger?.warn?.(`${packageName}: ${label} not written: ${(error as { message?: string }).message}`)
        return false
      }
    },
  }
}
