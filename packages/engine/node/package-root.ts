/** Find the nearest ancestor manifest with a `dsh` field; source and built layouts have different depths (D73). */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, parse } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Locate the package root from a module's `import.meta.url`. */
export function findPackageRoot(moduleUrl: string, packageName: string) {
  let at = dirname(fileURLToPath(moduleUrl))
  const top = parse(at).root
  while (at !== top) {
    const manifest = join(at, 'package.json')
    if (existsSync(manifest) && JSON.parse(readFileSync(manifest, 'utf8')).dsh !== undefined) return at
    at = dirname(at)
  }
  throw new Error(`${packageName}: no package.json with a dsh field above the host half`)
}
