/**
 * The plugin package's own directory, found from this module's location.
 *
 * The host half lives at `packages/host/src/` in the repository and is built to
 * `lib/host/` in the package (D46), so this module's depth is not a fixed
 * number of levels below the root: the root is the nearest directory whose
 * `package.json` is this plugin's, which is what the routes below hang their
 * files off.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, parse } from 'node:path'
import { fileURLToPath } from 'node:url'

let cached: string | null = null

/** @returns the plugin package's directory. */
export function packageRoot() {
  if (cached !== null) return cached
  let at = dirname(fileURLToPath(import.meta.url))
  const top = parse(at).root
  while (at !== top) {
    const manifest = join(at, 'package.json')
    if (existsSync(manifest)) {
      const parsed = JSON.parse(readFileSync(manifest, 'utf8'))
      // The root manifest is the one the DSH loader reads: it carries `dsh`.
      if (parsed.dsh !== undefined) {
        cached = at
        return cached
      }
    }
    at = dirname(at)
  }
  throw new Error('dsh-claude-style: no package.json with a dsh field above the host half')
}
