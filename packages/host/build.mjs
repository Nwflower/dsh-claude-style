/**
 * build.mjs — write the host half into the package's build output (D46).
 *
 * The half lives in `packages/host/src` in the repository and ships as build
 * output, so the packaged layout holds one `lib/` and no source tree. Every
 * module is written as it stands today; the type check runs over it separately.
 *
 * Usage: node packages/host/build.mjs [--out <dir>]
 */
import fs from 'node:fs'
import path from 'node:path'

const PACKAGE = path.resolve(import.meta.dirname)
const ROOT = path.resolve(PACKAGE, '..', '..')
const SOURCE = path.join(PACKAGE, 'src')

/**
 * Copy every module of the host half into `lib/host/`.
 *
 * @param options.outDir - the build output directory (default `<root>/lib`).
 * @returns `{ files }` of what was written, for the build log.
 */
export function buildHostHalf({ outDir = path.join(ROOT, 'lib') } = {}) {
  const to = path.join(outDir, 'host')
  fs.rmSync(to, { recursive: true, force: true })
  fs.mkdirSync(to, { recursive: true })
  let files = 0
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(SOURCE, dir), { withFileTypes: true })) {
      const rel = dir === '' ? entry.name : `${dir}/${entry.name}`
      if (entry.isDirectory()) {
        walk(rel)
        continue
      }
      fs.mkdirSync(path.dirname(path.join(to, rel)), { recursive: true })
      fs.copyFileSync(path.join(SOURCE, rel), path.join(to, rel))
      files += 1
    }
  }
  walk('')
  if (files === 0) throw new Error('build: packages/host/src holds no modules')
  return { files }
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const at = process.argv.indexOf('--out')
  const outDir = at === -1 ? path.join(ROOT, 'lib') : path.resolve(process.argv[at + 1])
  const built = buildHostHalf({ outDir })
  console.log(`built ${path.join(outDir, 'host')} (${built.files} modules) from packages/host/src/`)
}
