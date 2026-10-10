/**
 * The host half's derived cache files, under `$DSH_HOME/cache/dsh-claude-style/`.
 *
 * Every cache here only saves work: a file that does not parse is reported and
 * read as "no cache", and a write that fails leaves the pass that computed the
 * value still answering (docs/decisions D12). A write goes through a temporary
 * file and a rename, so a reader never sees half a document.
 *
 * The path resolution stays in harness-home.ts, so the cache sits in the same
 * directory as the delete route's and the usage roll-up's reads.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { DshContext } from './dsh.js'
import { harnessPath } from './harness-home.js'

/** One path inside this plugin's cache directory in the harness home. */
export function cachePath(ctx: DshContext, ...segments: string[]) {
  return join(harnessPath(ctx, 'cache', 'dsh-claude-style'), ...segments)
}

/**
 * One JSON document from disk.
 *
 * @param ctx - host plugin context, for the warning a failure leaves.
 * @param path - the file to read.
 * @param label - what the file is, for the warning.
 * @returns the parsed document, or undefined when it is absent or unreadable.
 */
export function readJsonDocument(ctx: DshContext, path: string, label: string): unknown {
  if (!existsSync(path)) return undefined
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    ctx.logger?.warn?.(`dsh-claude-style: ${label} unreadable (${(error as { message?: string }).message})`)
    return undefined
  }
}

/**
 * Replace one cache file through a temporary file.
 *
 * @param ctx - host plugin context, for the warning a failure leaves.
 * @param path - the file to write.
 * @param label - what the file is, for the warning.
 * @param document - the value to store.
 */
export function writeJsonDocument(ctx: DshContext, path: string, label: string, document: unknown) {
  const temporary = `${path}.${process.pid}.tmp`
  try {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(temporary, JSON.stringify(document), 'utf8')
    renameSync(temporary, path)
  } catch (error) {
    ctx.logger?.warn?.(`dsh-claude-style: ${label} not written: ${(error as { message?: string }).message}`)
  }
}
