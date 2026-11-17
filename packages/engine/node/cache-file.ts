/**
 * Derived caches under `$DSH_HOME/cache/<package name>/`; failures degrade to no cache (D12).
 * Temporary-file rename keeps readers from seeing partial JSON.
 * Files are 0600 and directories 0700, matching the host session store (bounty#1460
 * measured 0700/0600 there). On POSIX the mode bits are the permission boundary; on
 * Windows they are not an ACL boundary (the per-user profile directory is), so the
 * same bits are carried there without effect.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, sep } from 'node:path'
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
        // mkdir's mode reaches only directories it creates, so a directory left
        // loose by an earlier build is chmod'd below. Every permission operation
        // shares the write's degradation: a failure warns and leaves no cache (D12).
        mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
        // Tighten the plugin-owned directory chain the file sits in, walking up to
        // the harness home or the shared cache parent, neither of which this plugin
        // owns. The topmost tight directory is the boundary that stops another
        // account entering, even while $DSH_HOME and cache/ stay as the host left
        // them. Consumers write under cache/<package> and under <package> alike, so
        // the chain is taken from the path itself rather than a fixed cache root.
        const homeBase = harnessPath(ctx)
        const sharedCache = join(homeBase, 'cache')
        let dir = dirname(path)
        while (dir !== homeBase && dir !== sharedCache && dir.startsWith(homeBase + sep)) {
          chmodSync(dir, 0o700)
          const parent = dirname(dir)
          if (parent === dir) break
          dir = parent
        }
        // mode applies only to a file this creates; the chmod also tightens a stale
        // temporary a crashed run left behind. rename carries the temporary's 0600
        // onto the target, so an existing loose cache file is replaced tight.
        writeFileSync(temporary, JSON.stringify(document), { encoding: 'utf8', mode: 0o600 })
        chmodSync(temporary, 0o600)
        renameSync(temporary, path)
        return true
      } catch (error) {
        ctx.logger?.warn?.(`${packageName}: ${label} not written: ${(error as { message?: string }).message}`)
        return false
      }
    },
  }
}
